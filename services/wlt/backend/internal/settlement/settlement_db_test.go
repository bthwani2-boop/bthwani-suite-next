package settlement

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/shared"
)

const settlementTestTenant = "tenant-settlement-tests"

func getTestDB(t *testing.T) *sql.DB {
	t.Helper()
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
		_ = db.Close()
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func settlementTestContext() context.Context {
	return shared.WithTenantContext(context.Background(), settlementTestTenant)
}

func insertPendingSettlement(
	t *testing.T,
	db *sql.DB,
	grossAmount int64,
	platformFee int64,
	netAmount int64,
) *Settlement {
	t.Helper()
	partnerID := fmt.Sprintf("partner-%d", time.Now().UnixNano())
	row := db.QueryRow(`
		INSERT INTO wlt_settlements
			(tenant_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
		VALUES ($1, $2, '2026-01-01', '2026-01-31', $3, $4, $5, 'YER', 1, 'pending')
		RETURNING `+settlementCols,
		settlementTestTenant,
		partnerID,
		grossAmount,
		platformFee,
		netAmount,
	)
	settlement, err := scanSettlement(row)
	if err != nil {
		t.Fatalf("failed to insert pending settlement fixture: %v", err)
	}
	return settlement
}

func TestCreateSettlement_FailsClosedWithoutGovernedSource(t *testing.T) {
	settlement, err := CreateSettlement(nil, CreateSettlementInput{
		PartnerID:   "partner-untrusted",
		PeriodStart: "2026-01-01",
		PeriodEnd:   "2026-01-31",
		GrossAmount: 1000,
		PlatformFee: 100,
		NetAmount:   900,
		Currency:    "YER",
		OrderCount:  1,
	})
	if settlement != nil {
		t.Fatalf("expected no settlement from untrusted caller-supplied amounts")
	}
	if !errors.Is(err, ErrSettlementCalculationSourceRequired) {
		t.Fatalf("expected ErrSettlementCalculationSourceRequired, got %v", err)
	}
}

func TestPostSettlement_DoublePostConflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	ctx := settlementTestContext()

	settlement := insertPendingSettlement(t, db, 1000, 100, 900)
	if _, err := postSettlement(ctx, db, settlement.ID); err != nil {
		t.Fatalf("first postSettlement should succeed, got error: %v", err)
	}
	if _, err := postSettlement(ctx, db, settlement.ID); !errors.Is(err, ErrAlreadySettled) {
		t.Fatalf("expected ErrAlreadySettled on double-post, got %v", err)
	}
}

func TestPostSettlement_PostsBalancedGrossJournal(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	ctx := settlementTestContext()

	settlement := insertPendingSettlement(t, db, 2000, 200, 1800)
	posted, err := postSettlement(ctx, db, settlement.ID)
	if err != nil {
		t.Fatalf("failed to post settlement: %v", err)
	}
	if posted.Status != "settled" {
		t.Fatalf("expected settled status, got %s", posted.Status)
	}

	var transactionID string
	if err := db.QueryRow(
		"SELECT id FROM wlt_ledger_transactions WHERE tenant_id = $1 AND reference_type = 'settlement' AND reference_id = $2",
		settlementTestTenant,
		settlement.ID,
	).Scan(&transactionID); err != nil {
		t.Fatalf("expected a ledger transaction referencing this settlement: %v", err)
	}

	var debitTotal, creditTotal int64
	if err := db.QueryRow(
		"SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_ledger_lines WHERE tenant_id = $1 AND ledger_transaction_id = $2 AND debit_credit = 'debit'",
		settlementTestTenant,
		transactionID,
	).Scan(&debitTotal); err != nil {
		t.Fatalf("failed to sum debit lines: %v", err)
	}
	if err := db.QueryRow(
		"SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_ledger_lines WHERE tenant_id = $1 AND ledger_transaction_id = $2 AND debit_credit = 'credit'",
		settlementTestTenant,
		transactionID,
	).Scan(&creditTotal); err != nil {
		t.Fatalf("failed to sum credit lines: %v", err)
	}
	if debitTotal != 2000 || creditTotal != 2000 {
		t.Fatalf("expected balanced 2000/2000 debit/credit, got debit=%d credit=%d", debitTotal, creditTotal)
	}
}

func TestPostSettlement_InconsistentAmountsRollback(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	ctx := settlementTestContext()

	settlement := insertPendingSettlement(t, db, 1000, 100, 999)
	if _, err := postSettlement(ctx, db, settlement.ID); !errors.Is(err, ErrSettlementAmountsInconsistent) {
		t.Fatalf("expected ErrSettlementAmountsInconsistent, got %v", err)
	}

	var status string
	if err := db.QueryRow(`SELECT status FROM wlt_settlements WHERE tenant_id = $1 AND id = $2`, settlementTestTenant, settlement.ID).Scan(&status); err != nil {
		t.Fatalf("failed to read settlement status: %v", err)
	}
	if status != "pending" {
		t.Fatalf("expected rollback to preserve pending status, got %s", status)
	}

	var ledgerCount int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM wlt_ledger_transactions WHERE tenant_id = $1 AND reference_type = 'settlement' AND reference_id = $2`,
		settlementTestTenant,
		settlement.ID,
	).Scan(&ledgerCount); err != nil {
		t.Fatalf("failed to count settlement journals: %v", err)
	}
	if ledgerCount != 0 {
		t.Fatalf("expected no journal for inconsistent settlement, found %d", ledgerCount)
	}
}
