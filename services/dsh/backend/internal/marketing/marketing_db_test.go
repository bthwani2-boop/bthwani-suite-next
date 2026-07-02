package marketing

import (
	"database/sql"
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

func TestMarketingBannerSoftDeleteDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)

	b, err := CreateBanner(db, CreateBannerInput{
		Title:         "Banner DB Smoke " + suffix,
		ImageURL:      "https://example.test/banner.png",
		CreatedBy:     "operator-local-001",
		CorrelationID: "corr-" + suffix,
	})
	if err != nil {
		t.Fatalf("CreateBanner: %v", err)
	}

	if err := DeleteBanner(db, b.ID, "operator-local-001", "corr-"+suffix); err != nil {
		t.Fatalf("DeleteBanner: %v", err)
	}

	// A soft-deleted banner must not appear in ListBanners...
	list, err := ListBanners(db)
	if err != nil {
		t.Fatalf("ListBanners: %v", err)
	}
	for _, item := range list {
		if item.ID == b.ID {
			t.Fatalf("soft-deleted banner %s should not appear in ListBanners", b.ID)
		}
	}

	// ...but the row itself must still physically exist (soft delete, not hard delete).
	var deletedAt sql.NullTime
	if err := db.QueryRow(`SELECT deleted_at FROM dsh_marketing_banners WHERE id=$1`, b.ID).Scan(&deletedAt); err != nil {
		t.Fatalf("banner row must still exist after soft delete: %v", err)
	}
	if !deletedAt.Valid {
		t.Fatal("expected deleted_at to be set after DeleteBanner")
	}

	assertAuditEventExists(t, db, "banner", b.ID, "create")
	assertAuditEventExists(t, db, "banner", b.ID, "delete")
}

func TestMarketingPromoLifecycleTransitionsDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)

	p, err := CreatePromo(db, CreatePromoInput{
		Code:          "SMOKE-" + suffix,
		CreatedBy:     "operator-local-001",
		CorrelationID: "corr-" + suffix,
	})
	if err != nil {
		t.Fatalf("CreatePromo: %v", err)
	}
	if p.Status != "active" {
		t.Fatalf("expected active status, got %q", p.Status)
	}

	// active -> expired is legal.
	expired, err := UpdatePromo(db, p.ID, UpdatePromoInput{Status: "expired", ActorID: "operator-local-001", CorrelationID: "corr-" + suffix})
	if err != nil {
		t.Fatalf("UpdatePromo active->expired: %v", err)
	}
	if expired.Status != "expired" {
		t.Fatalf("expected expired status, got %q", expired.Status)
	}

	// expired -> active is illegal (expired is terminal).
	if _, err := UpdatePromo(db, p.ID, UpdatePromoInput{Status: "active", ActorID: "operator-local-001", CorrelationID: "corr-" + suffix}); err != ErrInvalidTransition {
		t.Fatalf("expected ErrInvalidTransition for expired->active, got %v", err)
	}

	assertAuditEventExists(t, db, "promo", p.ID, "create")
	assertAuditEventExists(t, db, "promo", p.ID, "update")
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
