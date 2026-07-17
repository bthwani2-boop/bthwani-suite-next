package payment

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/dshoutbox"
	"wlt-api/internal/ledger"
	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

var ErrCodCollectionRequiresCodRecord = errors.New("COD collection must be recorded through the sovereign COD record flow")

// CaptureSessionWithProviderSovereign is the live capture path. Provider
// success, payment-session state, double-entry posting and DSH notification are
// committed as one WLT transaction. A captured session can therefore never be
// visible without its accounting effect.
func CaptureSessionWithProviderSovereign(ctx context.Context, db *sql.DB, client financialProvider, sessionID string, meta provider.RequestMeta) (*PaymentSession, error) {
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

	result, err := captureProvider(ctx, client, claimed, meta)
	if err != nil {
		if isAmbiguousProviderError(err) {
			_ = markSessionResultUnknownAndOpenCase(db, claimed, "capture", err, "capture_pending")
		} else {
			_ = markSessionFailedAndNotify(db, claimed, "capture_pending")
		}
		return nil, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'captured', provider_reference = $2, captured_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'capture_pending'
		RETURNING id, checkout_intent_id, special_request_id,
		          COALESCE(to_jsonb(wlt_payment_sessions)->>'tenant_id', 'tenant-dev-001'),
		          client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency,
		          captured_at, created_at, updated_at`
	s, err := scanSession(tx.QueryRowContext(ctx, q, sessionID, result.ProviderReference))
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session %s was no longer capture_pending when finalizing capture", sessionID)
	}
	if err != nil {
		return nil, err
	}
	if s.AmountMinorUnits <= 0 || s.Currency == "" {
		return nil, fmt.Errorf("captured session %s has invalid accounting amount/currency", s.ID)
	}

	lines := []ledger.LedgerLine{
		{AccountType: "provider_clearing", DebitCredit: "debit", AmountMinorUnits: s.AmountMinorUnits, Currency: s.Currency},
		{AccountType: "platform_payable", DebitCredit: "credit", AmountMinorUnits: s.AmountMinorUnits, Currency: s.Currency},
	}
	if _, err := ledger.PostLedgerTransaction(ctx, tx, "payment_captured", "payment_session", s.ID, lines, ledger.Actor{ID: "wlt", Type: "service"}); err != nil {
		return nil, fmt.Errorf("post capture ledger transaction: %w", err)
	}
	if err := dshoutbox.Enqueue(tx, dshoutbox.EventTypeCaptured, s.ID, s.TenantID, s.CheckoutIntentID, s.SpecialRequestID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s, nil
}

func HandleCaptureSessionSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		session, err := CaptureSessionWithProviderSovereign(r.Context(), db, client, r.PathValue("paymentSessionId"), provider.RequestMetaFromHTTP(r, "wlt-capture"))
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

// HandleCodCollectionViaPaymentSessionBlocked prevents a second COD truth from
// being created through the payment-session route. DSH must use the COD record
// collection route, which identifies captain custody and posts the journal.
func HandleCodCollectionViaPaymentSessionBlocked(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_ = db
		_ = r.PathValue("paymentSessionId")
		shared.SendError(w, http.StatusConflict, "USE_COD_RECORD_FLOW", "COD collection must be posted through /wlt/cod-records/{codRecordId}/collect")
	}
}
