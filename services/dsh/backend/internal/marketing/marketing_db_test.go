package marketing

import (
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestMarketingCampaignLifecycleDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)

	c, err := CreateCampaign(db, CreateCampaignInput{
		Title:         "Campaign DB Smoke " + suffix,
		Description:   "integration test campaign",
		CreatedBy:     "operator-local-001",
		CorrelationID: "corr-" + suffix,
	})
	if err != nil {
		t.Fatalf("CreateCampaign: %v", err)
	}
	if c.Status != "draft" {
		t.Fatalf("expected draft status, got %q", c.Status)
	}

	updated, err := UpdateCampaign(db, c.ID, UpdateCampaignInput{
		Status:        "active",
		ActorID:       "operator-local-001",
		CorrelationID: "corr-" + suffix,
	})
	if err != nil {
		t.Fatalf("UpdateCampaign: %v", err)
	}
	if updated.Status != "active" {
		t.Fatalf("expected active status, got %q", updated.Status)
	}

	// Archive must be a soft archive: status flips to cancelled and
	// archived_at is set, the row must NOT be physically deleted.
	if err := ArchiveCampaign(db, c.ID, "operator-local-001", "corr-"+suffix); err != nil {
		t.Fatalf("ArchiveCampaign: %v", err)
	}
	after, err := GetCampaign(db, c.ID)
	if err != nil {
		t.Fatalf("GetCampaign after archive: %v", err)
	}
	if after.Status != "cancelled" {
		t.Fatalf("expected cancelled status after archive, got %q", after.Status)
	}
	if after.ArchivedAt == nil {
		t.Fatal("expected archived_at to be set after archive")
	}

	// Archiving twice must be idempotent-safe (not found on second archive
	// of an already-archived row, since archived_at IS NULL guard excludes it).
	if err := ArchiveCampaign(db, c.ID, "operator-local-001", "corr-"+suffix); err != ErrNotFound {
		t.Fatalf("expected ErrNotFound re-archiving already-archived campaign, got %v", err)
	}

	assertAuditEventExists(t, db, "campaign", c.ID, "create")
	assertAuditEventExists(t, db, "campaign", c.ID, "update")
	assertAuditEventExists(t, db, "campaign", c.ID, "archive")
}

func TestMarketingTickerLifecycleDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)

	tk, err := CreateTicker(db, CreateTickerInput{
		Message:       "Ticker DB Smoke " + suffix,
		CreatedBy:     "operator-local-001",
		CorrelationID: "corr-" + suffix,
	})
	if err != nil {
		t.Fatalf("CreateTicker: %v", err)
	}
	if tk.Status != "draft" || tk.Kind != "news" || tk.Audience != "all" {
		t.Fatalf("unexpected defaults: status=%q kind=%q audience=%q", tk.Status, tk.Kind, tk.Audience)
	}

	published := "published"
	tk2, err := UpdateTicker(db, tk.ID, UpdateTickerInput{Status: &published, ActorID: "operator-local-001"})
	if err != nil {
		t.Fatalf("UpdateTicker publish: %v", err)
	}
	if tk2.Status != "published" {
		t.Fatalf("expected published, got %q", tk2.Status)
	}

	backToDraft := "draft"
	if _, err := UpdateTicker(db, tk.ID, UpdateTickerInput{Status: &backToDraft, ActorID: "operator-local-001"}); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("expected ErrInvalidTransition for published->draft, got %v", err)
	}

	badHour := 24
	if _, err := UpdateTicker(db, tk.ID, UpdateTickerInput{OpenHour: &badHour, ActorID: "operator-local-001"}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for openHour=24, got %v", err)
	}

	if err := DeleteTicker(db, tk.ID, "operator-local-001", "corr-"+suffix); err != nil {
		t.Fatalf("DeleteTicker: %v", err)
	}
	list, err := ListTickers(db)
	if err != nil {
		t.Fatalf("ListTickers: %v", err)
	}
	for _, item := range list {
		if item.ID == tk.ID {
			t.Fatal("soft-deleted ticker must not appear in list")
		}
	}

	assertAuditEventExists(t, db, "ticker", tk.ID, "create")
	assertAuditEventExists(t, db, "ticker", tk.ID, "update")
	assertAuditEventExists(t, db, "ticker", tk.ID, "delete")
}

func TestMarketingTargetVisibilityGateDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)

	// store-1002 is seeded as fully client_visible-eligible.
	c, err := CreateCampaign(db, CreateCampaignInput{
		Title:         "Gate Pass Campaign " + suffix,
		TargetType:    "store",
		TargetID:      "store-1002",
		CreatedBy:     "operator-local-001",
		CorrelationID: "corr-" + suffix,
	})
	if err != nil {
		t.Fatalf("CreateCampaign with eligible store target: %v", err)
	}
	if c.TargetType != "store" || c.TargetID != "store-1002" {
		t.Fatalf("expected target to persist, got type=%q id=%q", c.TargetType, c.TargetID)
	}

	// A non-existent store id must fail the gate.
	if _, err := CreateCampaign(db, CreateCampaignInput{
		Title:      "Gate Fail Campaign " + suffix,
		TargetType: "store",
		TargetID:   "store-does-not-exist-" + suffix,
		CreatedBy:  "operator-local-001",
	}); err != ErrTargetGateFailed {
		t.Fatalf("expected ErrTargetGateFailed for nonexistent store target, got %v", err)
	}

	// offer targeting has no backend table yet — must be rejected, not silently allowed.
	if _, err := CreateCampaign(db, CreateCampaignInput{
		Title:      "Gate Offer Campaign " + suffix,
		TargetType: "offer",
		TargetID:   "offer-123",
		CreatedBy:  "operator-local-001",
	}); err != ErrTargetGateFailed {
		t.Fatalf("expected ErrTargetGateFailed for unsupported offer target, got %v", err)
	}

	var gateRows int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_marketing_visibility_gates WHERE entity_type='campaign'`).Scan(&gateRows); err != nil {
		t.Fatalf("query visibility gate log: %v", err)
	}
	if gateRows == 0 {
		t.Fatal("expected visibility gate checks to be logged")
	}

	var bindingRows int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_marketing_target_bindings WHERE entity_type='campaign' AND entity_id=$1`, c.ID).Scan(&bindingRows); err != nil {
		t.Fatalf("query target binding log: %v", err)
	}
	if bindingRows == 0 {
		t.Fatal("expected a target binding row for the passed gate")
	}
}

func assertAuditEventExists(t *testing.T, db *sql.DB, entityType, entityID, action string) {
	t.Helper()
	var n int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_marketing_audit_events
		WHERE entity_type=$1 AND entity_id=$2 AND action=$3`, entityType, entityID, action).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n == 0 {
		t.Fatalf("expected an audit event for %s/%s action=%s", entityType, entityID, action)
	}
}
