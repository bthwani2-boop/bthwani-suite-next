package partner

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

func TestPartnerLifecycleDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)

	p, err := CreatePartner(db, CreatePartnerInput{
		LegalNameAr:         "مؤسسة اختبار الشريك " + suffix,
		LegalNameEn:         "Partner Smoke " + suffix,
		DisplayName:         "شريك اختبار " + suffix,
		LegalIdentityType:   "commercial_register",
		LegalIdentityNumber: "YE-IT-" + suffix,
		OwnerName:           "مالك اختبار",
		PrimaryPhone:        "+967771" + suffix[len(suffix)-6:],
		Category:            "grocery",
		CreatedByActorID:    "field-local-001",
		CreatedBySurface:    "app-field",
	})
	if err != nil {
		t.Fatal(err)
	}

	stores, err := LinkPartnerStore(db, p.ID, "store-1002")
	if err != nil {
		t.Fatal(err)
	}
	if len(stores) == 0 {
		t.Fatal("expected linked partner store")
	}
	assertStoreReadiness(t, db, "store-1002", "pending")

	chain := []ActivationStatus{
		StatusSubmitted,
		StatusDocumentsUploaded,
		StatusDocumentsVerified,
		StatusOpsReview,
		StatusOpsApproved,
		StatusPartnerActive,
		StatusClientVisible,
	}
	for _, next := range chain {
		p, _, err = TransitionStatus(db, p.ID, TransitionInput{
			ToStatus:     next,
			Reason:       "db integration lifecycle",
			ActorID:      "operator-local-001",
			ActorSurface: "control-panel",
		}, 0)
		if err != nil {
			t.Fatalf("transition to %s failed: %v", next, err)
		}
	}
	assertStoreReadiness(t, db, "store-1002", "ready")

	var surface string
	if err := db.QueryRow(`
		SELECT actor_surface
		FROM dsh_partner_activation_events
		WHERE partner_id = $1 AND to_status = 'client_visible'
		ORDER BY created_at DESC
		LIMIT 1`, p.ID).Scan(&surface); err != nil {
		t.Fatal(err)
	}
	if surface != "control-panel" {
		t.Fatalf("actor_surface = %q, want control-panel", surface)
	}

	lat := 15.3229
	lon := 44.2075
	visit, err := CreateFieldVisit(db, CreateFieldVisitInput{
		PartnerID:         p.ID,
		StoreID:           "store-1002",
		VisitNotes:        "db integration visit",
		LocationLatitude:  &lat,
		LocationLongitude: &lon,
		FieldActorID:      "field-local-001",
	})
	if err != nil {
		t.Fatal(err)
	}
	if visit.LocationLatitude == nil || visit.LocationLongitude == nil {
		t.Fatal("expected both coordinates to persist")
	}
}

func assertStoreReadiness(t *testing.T, db *sql.DB, storeID, want string) {
	t.Helper()
	var got string
	if err := db.QueryRow(`SELECT partner_readiness FROM dsh_stores WHERE id = $1`, storeID).Scan(&got); err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("partner_readiness for %s = %q, want %q", storeID, got, want)
	}
}
