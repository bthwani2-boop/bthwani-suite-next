package payment

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/ledger"
	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

type fakeCashInRail struct {
	authorizeRes provider.ProviderResult
	authorizeErr error
	captureRes   provider.ProviderResult
	captureErr   error
}

func (f *fakeCashInRail) Authorize(ctx context.Context, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	return f.authorizeRes, f.authorizeErr
}
func (f *fakeCashInRail) Capture(ctx context.Context, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	return f.captureRes, f.captureErr
}
func (f *fakeCashInRail) Refund(ctx context.Context, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	return provider.ProviderResult{}, fmt.Errorf("not used in this test")
}
func (f *fakeCashInRail) Status(ctx context.Context, meta provider.RequestMeta) (provider.ProviderResult, error) {
	return provider.ProviderResult{}, fmt.Errorf("not used in this test")
}

var _ provider.CashInRail = (*fakeCashInRail)(nil)

func insertTopUpSession(t *testing.T, ctx context.Context, actorType, actorID, status, providerRef string, amount int64) (sessionID, opCtx string) {
	t.Helper()
	db := getTestDB(t)
	defer db.Close()

	purpose := "customer_topup"
	if actorType == "captain" {
		purpose = "captain_topup"
	}
	opCtx = fmt.Sprintf("op-%d", time.Now().UnixNano())
	topupRef := fmt.Sprintf("topup-%d", time.Now().UnixNano())

	err := db.QueryRowContext(ctx, `
		INSERT INTO wlt_payment_sessions
			(topup_reference, topup_actor_type, operator_context_id, client_id, store_id,
			 payment_method, status, provider_reference, amount_minor_units, currency, financial_purpose)
		VALUES ($1, $2, $3, $4, $4, 'official_wallet', $5, $6, $7, 'YER', $8)
		RETURNING id`,
		topupRef, actorType, opCtx, actorID, status, providerRef, amount, purpose,
	).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert topup session: %v", err)
	}
	return sessionID, opCtx
}

func TestAuthorizeTopUpSession_DBFlow(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	ctx := context.Background()

	sessionID, _ := insertTopUpSession(t, ctx, "customer", "customer-topup-1", "reference_created", "", 5000)

	rail := &fakeCashInRail{authorizeRes: provider.ProviderResult{ProviderReference: "topup-auth-1", Status: "authorized"}}

	session, err := AuthorizeTopUpSession(ctx, db, rail, sessionID, provider.RequestMeta{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.Status != "authorized" {
		t.Fatalf("expected status authorized, got %s", session.Status)
	}
	if session.ProviderReference != "topup-auth-1" {
		t.Fatalf("expected provider reference topup-auth-1, got %s", session.ProviderReference)
	}
}

func TestCaptureTopUpSession_PostsWalletCreditAtomically(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	ctx := context.Background()

	actorID := fmt.Sprintf("captain-topup-%d", time.Now().UnixNano())
	sessionID, opCtx := insertTopUpSession(t, ctx, "captain", actorID, "authorized", "topup-auth-2", 7500)

	rail := &fakeCashInRail{captureRes: provider.ProviderResult{ProviderReference: "topup-capture-1", Status: "captured"}}

	postedCtx := shared.WithOperatorContext(ctx, opCtx)
	session, err := CaptureTopUpSession(postedCtx, db, rail, sessionID, provider.RequestMeta{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.Status != "captured" {
		t.Fatalf("expected status captured, got %s", session.Status)
	}

	projection, err := ledger.GetWalletLedgerProjection(postedCtx, db, "captain", actorID, "YER")
	if err != nil {
		t.Fatalf("unexpected error reading wallet projection: %v", err)
	}
	if projection == nil {
		t.Fatal("expected a wallet ledger projection to exist after capture")
	}
	if projection.BalanceMinorUnits != 7500 {
		t.Fatalf("expected wallet balance 7500, got %d", projection.BalanceMinorUnits)
	}
	if projection.OperatorContextID != opCtx {
		t.Fatalf("expected projection OperatorContext %q, got %q", opCtx, projection.OperatorContextID)
	}

	var materializedAvailable int64
	if err := db.QueryRowContext(ctx, `
		SELECT available_balance_minor_units
		FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`,
		opCtx, actorID,
	).Scan(&materializedAvailable); err != nil {
		t.Fatalf("expected canonical topup to materialize the wallet projection: %v", err)
	}
	if materializedAvailable != 7500 {
		t.Fatalf("expected materialized available balance 7500, got %d", materializedAvailable)
	}
}

func TestCaptureTopUpSession_RejectsNonTopUpSession(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	ctx := context.Background()

	checkoutIntentID := fmt.Sprintf("test-checkout-nontopup-%d", time.Now().UnixNano())
	var sessionID string
	err := db.QueryRowContext(ctx, `
		INSERT INTO wlt_payment_sessions (checkout_intent_id, client_id, store_id, payment_method, status, provider_reference, amount_minor_units, currency, financial_purpose)
		VALUES ($1, 'client-test', 'store-test', 'official_wallet', 'authorized', 'card-auth-x', 1000, 'YER', 'order_payment')
		RETURNING id`, checkoutIntentID).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert test session: %v", err)
	}

	rail := &fakeCashInRail{captureRes: provider.ProviderResult{ProviderReference: "should-not-be-used", Status: "captured"}}

	_, err = CaptureTopUpSession(ctx, db, rail, sessionID, provider.RequestMeta{})
	if !errors.Is(err, ErrNotATopUpSession) {
		t.Fatalf("expected ErrNotATopUpSession, got %v", err)
	}

	var status string
	if err := db.QueryRowContext(ctx, `SELECT status FROM wlt_payment_sessions WHERE id = $1`, sessionID).Scan(&status); err != nil {
		t.Fatalf("failed to query DB row: %v", err)
	}
	if status != "failed" {
		t.Fatalf("expected status failed for a non-topup session sent through the topup rail, got %s", status)
	}
}

func TestAuthorizeTopUpSession_AmbiguousProviderErrorOpensReconciliationCase(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	ctx := context.Background()

	sessionID, _ := insertTopUpSession(t, ctx, "customer", "customer-topup-ambig", "reference_created", "", 2000)

	rail := &fakeCashInRail{authorizeErr: context.DeadlineExceeded}

	_, err := AuthorizeTopUpSession(ctx, db, rail, sessionID, provider.RequestMeta{})
	if err == nil {
		t.Fatal("expected an error")
	}

	var status string
	if err := db.QueryRowContext(ctx, `SELECT status FROM wlt_payment_sessions WHERE id = $1`, sessionID).Scan(&status); err != nil {
		t.Fatalf("failed to query DB row: %v", err)
	}
	if status != "provider_result_unknown" {
		t.Fatalf("expected status provider_result_unknown, got %s", status)
	}

	var caseCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_reconciliation_cases WHERE payment_session_id = $1`, sessionID).Scan(&caseCount); err != nil {
		t.Fatalf("failed to query reconciliation cases: %v", err)
	}
	if caseCount != 1 {
		t.Fatalf("expected exactly one reconciliation case, got %d", caseCount)
	}
}
