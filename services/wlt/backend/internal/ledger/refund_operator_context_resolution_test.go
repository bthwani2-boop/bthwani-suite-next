package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/shared"
	"wlt-api/internal/testsupport"
)

func seedRefundLedgerReference(t *testing.T, operatorContextID string) (*sqlTestReference, func()) {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		return nil, func() {}
	}
	ctx := context.Background()
	suffix := fmt.Sprint(time.Now().UnixNano())
	refundID := "refund-ledger-" + suffix
	orderID := "refund-order-" + suffix
	clientID := "refund-client-" + suffix
	sessionID, err := testsupport.SeedCanonicalCheckoutPaymentSession(ctx, db, testsupport.CheckoutPaymentSession{
		OperatorContextID: operatorContextID,
		CheckoutIntentID:  "checkout-" + suffix,
		ClientID:          clientID,
		StoreID:           "store-refund-ledger",
		PaymentMethod:     "official_wallet",
		Status:            "captured",
		AmountMinorUnits:  1000,
		Currency:          "YER",
		FinancialPurpose:  "order_payment",
	})
	if err != nil {
		_ = db.Close()
		t.Fatalf("seed canonical payment session: %v", err)
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		_ = db.Close()
		t.Fatalf("begin refund ledger fixture: %v", err)
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_refunds
			(id,operator_context_id,payment_session_id,order_id,client_id,amount_minor_units,currency,reason,status,idempotency_key,provider_idempotency_key)
		VALUES($1,$2,$3,$4,$5,1000,'YER','OperatorContext resolution test','approved',$6,$7)`,
		refundID, operatorContextID, sessionID, orderID, clientID, "refund-test-"+suffix, "provider-refund-test-"+suffix); err != nil {
		_ = tx.Rollback()
		_ = db.Close()
		t.Fatalf("seed refund: %v", err)
	}
	return &sqlTestReference{db: db, tx: tx, refundID: refundID, operatorContextID: operatorContextID}, func() {
		_ = tx.Rollback()
		_ = db.Close()
	}
}

type sqlTestReference struct {
	db                interface{ Close() error }
	tx                *sql.Tx
	refundID          string
	operatorContextID string
}

func TestPostLedgerTransactionDerivesRefundOperatorContextFromPersistedTruth(t *testing.T) {
	fixture, cleanup := seedRefundLedgerReference(t, "OperatorContext-refund-ledger")
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
		t.Fatalf("refund ledger OperatorContext derivation failed: %v", err)
	}
	var operatorContextID string
	if err := fixture.tx.QueryRow(`SELECT operator_context_id FROM wlt_ledger_transactions WHERE id=$1`, transactionID).Scan(&operatorContextID); err != nil {
		t.Fatalf("read refund ledger OperatorContext: %v", err)
	}
	if operatorContextID != fixture.operatorContextID {
		t.Fatalf("ledger OperatorContext=%q want %q", operatorContextID, fixture.operatorContextID)
	}
}

func TestPostLedgerTransactionRejectsRefundOperatorContextMismatch(t *testing.T) {
	fixture, cleanup := seedRefundLedgerReference(t, "OperatorContext-refund-owner")
	defer cleanup()
	if fixture == nil {
		return
	}
	ctx := shared.WithOperatorContext(context.Background(), "OperatorContext-refund-attacker")
	lines := []LedgerLine{
		{AccountType: "platform_payable", DebitCredit: "debit", AmountMinorUnits: 1000, Currency: "YER"},
		{AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: 1000, Currency: "YER"},
	}
	if _, err := PostLedgerTransaction(ctx, fixture.tx, "refund_completed", "refund", fixture.refundID, lines, Actor{ID: "wlt", Type: "service"}); !errors.Is(err, ErrLedgerOperatorContextConflict) {
		t.Fatalf("expected ErrLedgerOperatorContextConflict, got %v", err)
	}
}
