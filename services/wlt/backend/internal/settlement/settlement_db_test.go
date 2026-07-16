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

// TestCreateSettlement_InconsistentAmounts_Rejected verifies that
// netAmount must equal grossAmount - platformFee.
func TestCreateSettlement_InconsistentAmounts_Rejected(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	partnerID := fmt.Sprintf("partner-%d", time.Now().UnixNano())
	_, err := CreateSettlement(db, CreateSettlementInput{
		PartnerID:   partnerID,
		PeriodStart: "2026-02-01",
		PeriodEnd:   "2026-02-28",
		GrossAmount: 1000,
		PlatformFee: 100,
		NetAmount:   999, // should be 900
		Currency:    "YER",
		OrderCount:  1,
	})
	if err != ErrSettlementAmountsInconsistent {
		t.Fatalf("expected ErrSettlementAmountsInconsistent, got %v", err)
	}
}

// TestCreateSettlement_PostsBalancedLedgerTransaction verifies that creating
// a settlement with a positive net amount posts a balanced ledger
// transaction referencing the settlement.
func TestCreateSettlement_PostsBalancedLedgerTransaction(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	partnerID := fmt.Sprintf("partner-%d", time.Now().UnixNano())
	s, err := CreateSettlement(db, CreateSettlementInput{
		PartnerID:   partnerID,
		PeriodStart: "2026-03-01",
		PeriodEnd:   "2026-03-31",
		GrossAmount: 2000,
		PlatformFee: 200,
		NetAmount:   1800,
		Currency:    "YER",
		OrderCount:  3,
	})
	if err != nil {
		t.Fatalf("failed to create settlement: %v", err)
	}

	var txnID string
	if err := db.QueryRow("SELECT id FROM wlt_ledger_transactions WHERE reference_type = 'settlement' AND reference_id = $1", s.ID).Scan(&txnID); err != nil {
		t.Fatalf("expected a ledger transaction referencing this settlement: %v", err)
	}

	var debitTotal, creditTotal int64
	if err := db.QueryRow("SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_ledger_lines WHERE ledger_transaction_id = $1 AND debit_credit = 'debit'", txnID).Scan(&debitTotal); err != nil {
		t.Fatalf("failed to sum debit lines: %v", err)
	}
	if err := db.QueryRow("SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_ledger_lines WHERE ledger_transaction_id = $1 AND debit_credit = 'credit'", txnID).Scan(&creditTotal); err != nil {
		t.Fatalf("failed to sum credit lines: %v", err)
	}
	if debitTotal != 1800 || creditTotal != 1800 {
		t.Fatalf("expected balanced 1800/1800 debit/credit, got debit=%d credit=%d", debitTotal, creditTotal)
	}
}
