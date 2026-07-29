package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/shared"
)

func seedRefundLedgerReference(t *testing.T, tenantID string) (*sqlTestReference, func()) {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		return nil, func() {}
	}
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin refund ledger fixture: %v", err)
	}
	suffix := fmt.Sprint(time.Now().UnixNano())
	sessionID := "refund-session-" + suffix
	refundID := "refund-ledger-" + suffix
	orderID := "refund-order-" + suffix
	clientID := "refund-client-" + suffix
	idempotencyKey := "refund-idempotency-" + suffix
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_payment_sessions
			(id,tenant_id,checkout_intent_id,client_id,store_id,payment_method,status,amount_minor_units,currency)
		VALUES($1,$2,$3,$4,'store-refund-ledger','official_wallet','captured',1000,'YER')`,
		sessionID, tenantID, "checkout-"+suffix, clientID); err != nil {
		_ = tx.Rollback()
		_ = db.Close()
		t.Fatalf("seed payment session: %v", err)
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_refunds
			(id,tenant_id,payment_session_id,order_id,client_id,idempotency_key,amount_minor_units,currency,reason,status)
		VALUES($1,$2,$3,$4,$5,$6,1000,'YER','tenant resolution test','approved')`,
		refundID, tenantID, sessionID, orderID, clientID, idempotencyKey); err != nil {
		_ = tx.Rollback()
		_ = db.Close()
		t.Fatalf("seed refund: %v", err)
	}
	return &sqlTestReference{db: db, tx: tx, refundID: refundID, tenantID: tenantID}, func() {
		_ = tx.Rollback()
		_ = db.Close()
	}
}

type sqlTestReference struct {
	db       interface{ Close() error }
	tx       *sql.Tx
	refundID string
	tenantID string
}

func TestPostLedgerTransactionDerivesRefundTenantFromPersistedTruth(t *testing.T) {
	fixture, cleanup := seedRefundLedgerReference(t, "tenant-refund-ledger")
	defer cleanup()
	if fixture == nil {
		return
	}
	lines := []LedgerLine{
		{AccountType: "platform_payable", DebitCredit: "debit", AmountMinorUnits: 1000, Currency: "YER"},
		{AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: 1000, Currency: "YER"},
	}
	transactionID, err := PostLedgerTransaction(context.Background(), fixture.tx, "refund_completed", "refund", fixture.refundID, lines, Actor{ID: "wlt", Type: "service"})
	if err != nil {
		t.Fatalf("refund ledger tenant derivation failed: %v", err)
	}
	var tenantID string
	if err := fixture.tx.QueryRow(`SELECT tenant_id FROM wlt_ledger_transactions WHERE id=$1`, transactionID).Scan(&tenantID); err != nil {
		t.Fatalf("read refund ledger tenant: %v", err)
	}
	if tenantID != fixture.tenantID {
		t.Fatalf("ledger tenant=%q want %q", tenantID, fixture.tenantID)
	}
}

func TestPostLedgerTransactionRejectsRefundTenantMismatch(t *testing.T) {
	fixture, cleanup := seedRefundLedgerReference(t, "tenant-refund-owner")
	defer cleanup()
	if fixture == nil {
		return
	}
	ctx := shared.WithTenantContext(context.Background(), "tenant-refund-attacker")
	lines := []LedgerLine{
		{AccountType: "platform_payable", DebitCredit: "debit", AmountMinorUnits: 1000, Currency: "YER"},
		{AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: 1000, Currency: "YER"},
	}
	if _, err := PostLedgerTransaction(ctx, fixture.tx, "refund_completed", "refund", fixture.refundID, lines, Actor{ID: "wlt", Type: "service"}); !errors.Is(err, ErrLedgerTenantConflict) {
		t.Fatalf("expected ErrLedgerTenantConflict, got %v", err)
	}
}
