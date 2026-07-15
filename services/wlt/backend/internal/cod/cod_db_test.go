package cod

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

func insertTestCodRecord(t *testing.T, db *sql.DB) string {
	orderID := fmt.Sprintf("test-order-%d", time.Now().UnixNano())
	var id string
	err := db.QueryRow(`
		INSERT INTO wlt_cod_records (order_id, captain_id, partner_id, amount_minor_units, currency)
		VALUES ($1, 'captain-test', 'partner-test', 1000, 'YER')
		RETURNING id`, orderID).Scan(&id)
	if err != nil {
		t.Fatalf("failed to insert test COD record: %v", err)
	}
	return id
}

// TestMarkCodRemitted_BeforeCollected_Conflict verifies that a COD record
// still in 'pending_collection' cannot be remitted directly -- it must be
// collected first.
func TestMarkCodRemitted_BeforeCollected_Conflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	id := insertTestCodRecord(t, db)

	if _, err := MarkCodRemitted(db, id); err != ErrCodStateConflict {
		t.Fatalf("expected ErrCodStateConflict remitting an uncollected record, got %v", err)
	}
}

// TestMarkCodCollected_Twice_Conflict verifies the second collect call on an
// already-collected record is rejected, not silently re-applied.
func TestMarkCodCollected_Twice_Conflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	id := insertTestCodRecord(t, db)

	if _, err := MarkCodCollected(db, id); err != nil {
		t.Fatalf("first collect should succeed, got error: %v", err)
	}
	if _, err := MarkCodCollected(db, id); err != ErrCodStateConflict {
		t.Fatalf("expected ErrCodStateConflict on duplicate collect, got %v", err)
	}
}

// TestMarkCodRemitted_Twice_Conflict verifies the second remit call on an
// already-remitted record is rejected.
func TestMarkCodRemitted_Twice_Conflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	id := insertTestCodRecord(t, db)

	if _, err := MarkCodCollected(db, id); err != nil {
		t.Fatalf("collect should succeed, got error: %v", err)
	}
	if _, err := MarkCodRemitted(db, id); err != nil {
		t.Fatalf("first remit should succeed, got error: %v", err)
	}
	if _, err := MarkCodRemitted(db, id); err != ErrCodStateConflict {
		t.Fatalf("expected ErrCodStateConflict on duplicate remit, got %v", err)
	}
}

// TestListCommissions_ScopesByBeneficiaryTypeToo verifies that two
// beneficiaries sharing the same actor id but different actor types are not
// cross-leaked into each other's commission list.
func TestListCommissions_ScopesByBeneficiaryTypeToo(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sharedID := fmt.Sprintf("shared-actor-%d", time.Now().UnixNano())
	sourceID := fmt.Sprintf("source-%d", time.Now().UnixNano())

	if _, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   sharedID,
		BeneficiaryActorType: "captain",
		SourceType:           "order",
		SourceID:             sourceID,
		AmountMinorUnits:     500,
		Currency:             "YER",
		IdempotencyKey:       sourceID + "-captain",
	}); err != nil {
		t.Fatalf("failed to create captain commission: %v", err)
	}
	if _, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   sharedID,
		BeneficiaryActorType: "partner",
		SourceType:           "order",
		SourceID:             sourceID + "-2",
		AmountMinorUnits:     700,
		Currency:             "YER",
		IdempotencyKey:       sourceID + "-partner",
	}); err != nil {
		t.Fatalf("failed to create partner commission: %v", err)
	}

	captainCommissions, err := ListCommissions(db, "", sharedID, "captain")
	if err != nil {
		t.Fatalf("ListCommissions returned error: %v", err)
	}
	for _, c := range captainCommissions {
		if c.BeneficiaryActorType != "captain" {
			t.Fatalf("expected only captain commissions, got beneficiaryActorType=%q", c.BeneficiaryActorType)
		}
	}
	if len(captainCommissions) == 0 {
		t.Fatalf("expected at least one captain commission")
	}
}
