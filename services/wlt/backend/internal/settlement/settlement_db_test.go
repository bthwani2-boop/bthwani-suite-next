package settlement

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func getTestDB(t *testing.T) *sql.DB {
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("failed to open DB connection: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

// TestPostSettlement_DoublePost_Conflict verifies that posting an
// already-settled settlement a second time is rejected with
// ErrAlreadySettled instead of silently re-applying settled_at.
func TestPostSettlement_DoublePost_Conflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	partnerID := fmt.Sprintf("partner-%d", time.Now().UnixNano())
	s, err := CreateSettlement(db, CreateSettlementInput{
		PartnerID:   partnerID,
		PeriodStart: "2026-01-01",
		PeriodEnd:   "2026-01-31",
		GrossAmount: 1000,
		PlatformFee: 100,
		NetAmount:   900,
		Currency:    "YER",
		OrderCount:  1,
	})
	if err != nil {
		t.Fatalf("failed to create settlement: %v", err)
	}

	if _, err := PostSettlement(db, s.ID); err != nil {
		t.Fatalf("first PostSettlement should succeed, got error: %v", err)
	}
	if _, err := PostSettlement(db, s.ID); err != ErrAlreadySettled {
		t.Fatalf("expected ErrAlreadySettled on double-post, got %v", err)
	}
}
