package payment

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/ledger"
	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

// ErrNotATopUpSession is returned when AuthorizeTopUpSession/CaptureTopUpSession
// is called on a session whose server-derived FinancialPurpose is not one of
// the two Cash-In wallet-funding purposes. This is a defense-in-depth check:
// routing should never send a non-topup session here, but the ledger posting
// below assumes it is crediting the correct actor's wallet for a Cash-In fact,
// so the assumption is verified rather than trusted.
var ErrNotATopUpSession = errors.New("payment session is not a wallet topup session")

// topUpActorType maps a session's server-derived FinancialPurpose to the
// canonical wallet actor vocabulary. Product wording says "customer top-up",
// but the governed WLT actor type is client; writing "customer" would create a
// second ledger identity for the same user and break idempotent readback.
func topUpActorType(financialPurpose string) (string, error) {
	switch FinancialPurpose(financialPurpose) {
	case PurposeCustomerTopUp:
		return "client", nil
	case PurposeCaptainTopUp:
		return "captain", nil
	default:
		return "", ErrNotATopUpSession
	}
}

// AuthorizeTopUpSession authorizes a Cash-In wallet top-up session through the
// capability-checked CashInRail (U002-T001) instead of an arbitrary Post/Get
// call to a caller-chosen path. It otherwise mirrors
// AuthorizeSessionWithProviderSovereign's claim-before-mutation and
// ambiguous-result handling exactly, so a topup session gets the same
// guarantees an order-payment session already has.
func AuthorizeTopUpSession(ctx context.Context, db *sql.DB, rail provider.CashInRail, sessionID string, meta provider.RequestMeta) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	claimed, err := claimSession(db, sessionID, []string{"reference_created", "pending_provider"}, "authorization_pending")
	if errors.Is(err, ErrSessionClaimConflict) {
		return nil, ErrNotAuthorizable
	}
	if err != nil || claimed == nil {
		return claimed, err
	}
	if _, err := topUpActorType(claimed.FinancialPurpose); err != nil {
		_ = markSessionFailedAndNotify(db, claimed, "authorization_pending")
		return nil, err
	}
	currency := claimed.Currency
	if currency == "" {
		currency = "YER"
	}
	if claimed.AmountMinorUnits <= 0 {
		_ = markSessionFailedAndNotify(db, claimed, "authorization_pending")
		return nil, fmt.Errorf("payment session has no amount to authorize")
	}

	result, err := rail.Authorize(ctx, map[string]any{
		"paymentSessionId":  claimed.ID,
		"clientId":          claimed.ClientID,
		"amountMinorUnits":  claimed.AmountMinorUnits,
		"currency":          currency,
		"paymentMethod":     claimed.PaymentMethod,
		"providerReference": claimed.ProviderReference,
	}, meta)
	if err == nil && (result.Status != "authorized" || result.ProviderReference == "") {
		err = fmt.Errorf("provider authorization returned invalid status or reference")
	}
	if err != nil {
		if isAmbiguousProviderError(err) {
			_ = markSessionResultUnknownAndOpenCase(db, claimed, "authorize", err, "authorization_pending")
		} else {
			_ = markSessionFailedAndNotify(db, claimed, "authorization_pending")
		}
		return nil, err
	}

	finalizationFailure := func(cause error) (*PaymentSession, error) {
		_ = markSessionResultUnknownAndOpenCase(db, claimed, "authorize", cause, "authorization_pending")
		return nil, cause
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return finalizationFailure(fmt.Errorf("begin topup authorize finalization: %w", err))
	}
	defer tx.Rollback()
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'authorized', provider_reference = $2,
		    last_provider_status = 'authorized', updated_at = NOW()
		WHERE id = $1 AND status = 'authorization_pending'
		RETURNING ` + sessionCols
	session, err := scanSession(tx.QueryRowContext(ctx, q, sessionID, result.ProviderReference))
	if errors.Is(err, sql.ErrNoRows) {
		return finalizationFailure(fmt.Errorf("session %s was no longer authorization_pending when finalizing topup authorize", sessionID))
	}
	if err != nil {
		return finalizationFailure(fmt.Errorf("finalize authorized topup session: %w", err))
	}
	if err := tx.Commit(); err != nil {
		return finalizationFailure(fmt.Errorf("commit authorized topup session: %w", err))
	}
	return session, nil
}

// CaptureTopUpSession captures a Cash-In wallet top-up session through
// CashInRail and, in the same database transaction as the capture finalize,
// posts the ledger fact that funds the actor's wallet: debit provider_clearing
// (the provider now owes WLT the captured amount) and credit the actor's
// wallet by the same amount. A captured topup session can therefore never be
// visible without its wallet credit already posted -- if either the finalize
// UPDATE or the ledger posting fails after the provider confirmed capture,
// the whole transaction rolls back and the session is marked
// provider_result_unknown for reconciliation, exactly like
// CaptureSessionWithProviderSovereign already does for order payments.
func CaptureTopUpSession(ctx context.Context, db *sql.DB, rail provider.CashInRail, sessionID string, meta provider.RequestMeta) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	claimed, err := claimSession(db, sessionID, []string{"authorized"}, "capture_pending")
	if errors.Is(err, ErrSessionClaimConflict) {
		return nil, fmt.Errorf("payment session must be authorized before capture")
	}
	if err != nil || claimed == nil {
		return claimed, err
	}
	if _, err := topUpActorType(claimed.FinancialPurpose); err != nil {
		_ = markSessionFailedAndNotify(db, claimed, "capture_pending")
		return nil, err
	}

	result, err := rail.Capture(ctx, map[string]any{
		"paymentSessionId":  claimed.ID,
		"providerReference": claimed.ProviderReference,
		"amountMinorUnits":  claimed.AmountMinorUnits,
		"currency":          claimed.Currency,
	}, meta)
	if err == nil && (result.Status != "captured" || result.ProviderReference == "") {
		err = fmt.Errorf("provider capture returned invalid status or reference")
	}
	if err != nil {
		if isAmbiguousProviderError(err) {
			_ = markSessionResultUnknownAndOpenCase(db, claimed, "capture", err, "capture_pending")
		} else {
			_ = markSessionFailedAndNotify(db, claimed, "capture_pending")
		}
		return nil, err
	}

	finalizationFailure := func(cause error) (*PaymentSession, error) {
		_ = markSessionResultUnknownAndOpenCase(db, claimed, "capture", cause, "capture_pending")
		return nil, cause
	}
	if claimed.AmountMinorUnits <= 0 || claimed.Currency == "" {
		return finalizationFailure(fmt.Errorf("captured topup session %s has invalid accounting amount/currency", claimed.ID))
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return finalizationFailure(fmt.Errorf("begin topup capture finalization: %w", err))
	}
	defer tx.Rollback()

	lines, actor, err := captureEconomicEffect(claimed)
	if err != nil {
		return finalizationFailure(err)
	}
	postCtx := shared.WithOperatorContext(ctx, claimed.OperatorContextID)
	ledgerTransactionID, err := ledger.PostLedgerTransaction(postCtx, tx, "cash_in_topup", "payment_session", claimed.ID, lines, actor)
	if err != nil {
		return finalizationFailure(fmt.Errorf("post topup capture ledger transaction: %w", err))
	}

	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'captured', provider_reference = $2, captured_at = NOW(),
		    capture_ledger_transaction_id = $3, last_provider_status = 'captured',
		    updated_at = NOW()
		WHERE id = $1 AND status = 'capture_pending'
		RETURNING ` + sessionCols
	s, err := scanSession(tx.QueryRowContext(ctx, q, sessionID, result.ProviderReference, ledgerTransactionID))
	if errors.Is(err, sql.ErrNoRows) {
		return finalizationFailure(fmt.Errorf("session %s was no longer capture_pending when finalizing topup capture", sessionID))
	}
	if err != nil {
		return finalizationFailure(fmt.Errorf("finalize captured topup session: %w", err))
	}
	if err := tx.Commit(); err != nil {
		return finalizationFailure(fmt.Errorf("commit captured topup session: %w", err))
	}
	return s, nil
}

func HandleAuthorizeTopUpSession(db *sql.DB, rail provider.CashInRail) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if rail == nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", "financial rail is not wired; refusing unenforced money movement")
			return
		}
		session, err := AuthorizeTopUpSession(r.Context(), db, rail, r.PathValue("paymentSessionId"), provider.RequestMetaFromHTTP(r, "wlt-topup-authorize"))
		if errors.Is(err, ErrNotAuthorizable) {
			shared.SendError(w, http.StatusConflict, "INVALID_PAYMENT_STATE", err.Error())
			return
		}
		if errors.Is(err, ErrNotATopUpSession) {
			shared.SendError(w, http.StatusConflict, "NOT_A_TOPUP_SESSION", err.Error())
			return
		}
		if err != nil {
			shared.SendProviderError(w, err)
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"paymentSession": session})
	}
}

func HandleCaptureTopUpSession(db *sql.DB, rail provider.CashInRail) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if rail == nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", "financial rail is not wired; refusing unenforced money movement")
			return
		}
		session, err := CaptureTopUpSession(r.Context(), db, rail, r.PathValue("paymentSessionId"), provider.RequestMetaFromHTTP(r, "wlt-topup-capture"))
		if errors.Is(err, ErrNotATopUpSession) {
			shared.SendError(w, http.StatusConflict, "NOT_A_TOPUP_SESSION", err.Error())
			return
		}
		if err != nil {
			shared.SendProviderError(w, err)
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"paymentSession": session})
	}
}
