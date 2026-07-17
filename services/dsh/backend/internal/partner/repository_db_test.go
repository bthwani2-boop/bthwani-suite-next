package partner

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

func createPartnerFixture(t *testing.T, db *sql.DB, prefix string) Partner {
	t.Helper()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	p, err := CreatePartner(db, CreatePartnerInput{
		LegalNameAr:         "مؤسسة اختبار " + prefix + " " + suffix,
		LegalNameEn:         prefix + " Smoke " + suffix,
		DisplayName:         "شريك اختبار " + prefix + " " + suffix,
		LegalIdentityType:   "commercial_register",
		LegalIdentityNumber: "YE-" + prefix + "-" + suffix,
		OwnerName:           "مالك اختبار",
		PrimaryPhone:        "+96777" + suffix[len(suffix)-7:],
		Category:            "grocery",
		CreatedByActorID:    "field-local-001",
		CreatedBySurface:    "app-field",
	})
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func partnerStoreID(t *testing.T, db *sql.DB, partnerID string) string {
	t.Helper()
	var storeID string
	if err := db.QueryRow(`SELECT id FROM dsh_stores WHERE partner_id = $1 ORDER BY created_at LIMIT 1`, partnerID).Scan(&storeID); err != nil {
		t.Fatalf("failed to resolve partner draft store: %v", err)
	}
	return storeID
}

func TestPartnerLifecycleDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	p := createPartnerFixture(t, db, "IT")
	storeID := partnerStoreID(t, db, p.ID)

	stores, err := LinkPartnerStore(db, p.ID, storeID, "operator-local-001")
	if err != nil {
		t.Fatal(err)
	}
	if len(stores) == 0 {
		t.Fatal("expected linked partner store")
	}
	assertStoreReadiness(t, db, storeID, "pending")

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
		if next == StatusClientVisible {
			// The client-visible transition must prove every store publication
			// gate, not merely partner readiness. Seed the same state that the
			// owning governance sections would produce after independent review.
			if _, err := db.Exec(`
				UPDATE dsh_stores
				SET status = 'active',
				    is_visible = true,
				    serviceability_status = 'serviceable',
				    partner_readiness = 'ready',
				    catalog_approval_status = 'approved',
				    marketing_visibility = 'visible',
				    version = version + 1,
				    updated_at = NOW()
				WHERE id = $1`, storeID); err != nil {
				t.Fatalf("failed to satisfy store publication gates: %v", err)
			}
		}
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
	assertStoreReadiness(t, db, storeID, "ready")

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
		StoreID:           storeID,
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

func TestCreateFieldVisitRejectsStoreNotOwnedByPartner(t *testing.T) {
	db := openRequiredDB(t)
	p1 := createPartnerFixture(t, db, "OWN-A")
	p2 := createPartnerFixture(t, db, "OWN-B")
	otherStoreID := partnerStoreID(t, db, p2.ID)

	_, err := CreateFieldVisit(db, CreateFieldVisitInput{
		PartnerID:    p1.ID,
		StoreID:      otherStoreID,
		VisitNotes:   "should be rejected",
		FieldActorID: "field-local-001",
	})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for store not owned by partner, got %v", err)
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
