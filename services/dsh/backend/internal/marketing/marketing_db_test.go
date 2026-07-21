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

func TestCampaignTransitionPolicy(t *testing.T) {
	tests := []struct {
		from string
		to   string
		want bool
	}{
		{from: "draft", to: "active", want: true},
		{from: "draft", to: "paused", want: false},
		{from: "active", to: "paused", want: true},
		{from: "active", to: "completed", want: true},
		{from: "paused", to: "active", want: true},
		{from: "completed", to: "active", want: false},
		{from: "cancelled", to: "draft", want: false},
	}
	for _, tt := range tests {
		t.Run(tt.from+"_to_"+tt.to, func(t *testing.T) {
			if got := campaignTransitionAllowed(tt.from, tt.to); got != tt.want {
				t.Fatalf("campaignTransitionAllowed(%q,%q)=%v want %v", tt.from, tt.to, got, tt.want)
			}
		})
	}
}

func TestValidateCampaignDates(t *testing.T) {
	if err := validateCampaignDates("", ""); err != nil {
		t.Fatalf("empty draft schedule should be accepted: %v", err)
	}
	if err := validateCampaignDates("2099-01-01", "2099-01-02"); err != nil {
		t.Fatalf("valid campaign dates rejected: %v", err)
	}
	for _, pair := range [][2]string{
		{"2099-01-01", ""},
		{"not-a-date", "2099-01-02"},
		{"2099-01-02", "2099-01-02"},
		{"2099-01-03", "2099-01-02"},
	} {
		if err := validateCampaignDates(pair[0], pair[1]); !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for %q -> %q, got %v", pair[0], pair[1], err)
		}
	}
}

func TestMarketingCampaignLifecycleDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)

	c, err := CreateCampaign(db, CreateCampaignInput{
		Title:         "Campaign DB Smoke " + suffix,
		Description:   "integration test campaign",
		StartDate:     "2099-01-01",
		EndDate:       "2099-01-31",
		CreatedBy:     "operator-local-001",
		CorrelationID: "corr-" + suffix,
	})
	if err != nil {
		t.Fatalf("CreateCampaign: %v", err)
	}
	if c.Status != "draft" {
		t.Fatalf("expected draft status, got %q", c.Status)
	}

	if _, err := UpdateCampaign(db, c.ID, UpdateCampaignInput{
		Status:        "paused",
		ActorID:       "operator-local-001",
		CorrelationID: "corr-" + suffix,
	}); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("expected ErrInvalidTransition for draft->paused, got %v", err)
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

	if _, err := UpdateCampaign(db, c.ID, UpdateCampaignInput{
		Status:        "draft",
		ActorID:       "operator-local-001",
		CorrelationID: "corr-" + suffix,
	}); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("expected ErrInvalidTransition for active->draft, got %v", err)
	}

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

	list, err := ListCampaigns(db)
	if err != nil {
		t.Fatalf("ListCampaigns: %v", err)
	}
	for _, item := range list {
		if item.ID == c.ID {
			t.Fatal("archived campaign must not appear in list")
		}
	}

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
	storeID := "marketing-gate-store-" + suffix

	_, err := db.Exec(`
		INSERT INTO dsh_stores (
			id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible, partner_readiness,
			catalog_approval_status, marketing_visibility
		) VALUES ($1, $1, 'Marketing Gate Store', 'active', 'SAN', 'SAN-1',
			'serviceable', true, 'ready', 'approved', 'visible')`, storeID)
	if err != nil {
		t.Fatalf("seed eligible marketing target store: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_marketing_target_bindings WHERE target_type='store' AND target_id=$1`, storeID)
		_, _ = db.Exec(`DELETE FROM dsh_marketing_visibility_gates WHERE target_type='store' AND target_id=$1`, storeID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	c, err := CreateCampaign(db, CreateCampaignInput{
		Title:         "Gate Pass Campaign " + suffix,
		TargetType:    "store",
		TargetID:      storeID,
		CreatedBy:     "operator-local-001",
		CorrelationID: "corr-" + suffix,
	})
	if err != nil {
		t.Fatalf("CreateCampaign with eligible store target: %v", err)
	}
	if c.TargetType != "store" || c.TargetID != storeID {
		t.Fatalf("expected target to persist, got type=%q id=%q", c.TargetType, c.TargetID)
	}

	if _, err := CreateCampaign(db, CreateCampaignInput{
		Title:      "Gate Fail Campaign " + suffix,
		TargetType: "store",
		TargetID:   "store-does-not-exist-" + suffix,
		CreatedBy:  "operator-local-001",
	}); err != ErrTargetGateFailed {
		t.Fatalf("expected ErrTargetGateFailed for nonexistent store target, got %v", err)
	}

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
