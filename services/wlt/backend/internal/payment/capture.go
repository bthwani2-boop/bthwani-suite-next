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

// CaptureSessionWithProvider is the live capture path. Provider
// success, payment-session state, double-entry posting and DSH notification are
// committed as one WLT transaction. A captured session can therefore never be
// visible without its accounting effect. If the provider confirms success but
// local finalization fails, WLT moves the claimed session to the explicit
// provider_result_unknown reconciliation path instead of allowing a blind
// capture retry.
func CaptureSessionWithProvider(ctx context.Context, db *sql.DB, rail provider.CashInRail, sessionID string, meta provider.RequestMeta) (*PaymentSession, error) {
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

	result, err := captureProvider(ctx, rail, claimed, meta)
	if err != nil {
		if isAmbiguousProviderError(err) {
			return nil, withDurableRecoveryError(err, func() error {
				return markSessionResultUnknownAndOpenCase(db, claimed, "capture", err, "capture_pending")
			})
		}
		return nil, withDurableRecoveryError(err, func() error {
			return markSessionFailedAndNotify(db, claimed, "capture_pending")
		})
	}

	var tx *sql.Tx
	finalizationFailure := func(cause error) (*PaymentSession, error) {
		return nil, recoverAfterFinalizationFailure(tx, cause, func() error {
			return markSessionResultUnknownAndOpenCase(db, claimed, "capture", cause, "capture_pending")
		})
	}

	tx, err = db.BeginTx(ctx, nil)
	if err != nil {
		return finalizationFailure(fmt.Errorf("begin capture finalization: %w", err))
	}
	defer tx.Rollback()

	lines, actor, effectErr := captureEconomicEffect(claimed)
	if effectErr != nil {
		return finalizationFailure(effectErr)
	}
	ledgerTransactionID, err := ledger.PostLedgerTransaction(ctx, tx, "payment_captured", "payment_session", claimed.ID, lines, actor)
	if err != nil {
		return finalizationFailure(fmt.Errorf("post capture ledger transaction: %w", err))
	}

	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'captured', provider_reference = $2, captured_at = NOW(),
		    capture_ledger_transaction_id = $3, last_provider_status = 'captured',
		    updated_at = NOW()
		WHERE id = $1 AND status = 'capture_pending'
		RETURNING ` + sessionCols
	s, err := scanSession(tx.QueryRowContext(ctx, q, sessionID, result.ProviderReference, ledgerTransactionID))
	if err == sql.ErrNoRows {
		return finalizationFailure(fmt.Errorf("session %s was no longer capture_pending when finalizing capture", sessionID))
	}
	if err != nil {
		return finalizationFailure(fmt.Errorf("finalize captured session: %w", err))
	}
	if err := dshoutbox.Enqueue(tx, dshoutbox.EventTypeCaptured, s.ID, s.OperatorContextID, s.CheckoutIntentID, s.SpecialRequestID); err != nil {
		return finalizationFailure(fmt.Errorf("enqueue captured DSH projection: %w", err))
	}
	if err := tx.Commit(); err != nil {
		return finalizationFailure(fmt.Errorf("commit captured session: %w", err))
	}
	return s, nil
}

func HandleCaptureSession(db *sql.DB, rail provider.CashInRail) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if rail == nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", "financial rail is not wired; refusing unenforced money movement")
			return
		}
		session, err := CaptureSessionWithProvider(r.Context(), db, rail, r.PathValue("paymentSessionId"), provider.RequestMetaFromHTTP(r, "wlt-capture"))
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

func captureProvider(ctx context.Context, rail provider.CashInRail, session *PaymentSession, meta provider.RequestMeta) (provider.ProviderResult, error) {
	result, err := rail.Capture(ctx, map[string]any{
		"paymentSessionId":  session.ID,
		"providerReference": session.ProviderReference,
		"amountMinorUnits":  session.AmountMinorUnits,
		"currency":          session.Currency,
	}, meta)
	if err != nil {
		return provider.ProviderResult{}, err
	}
	if result.Status != "captured" || result.ProviderReference == "" {
		return provider.ProviderResult{}, fmt.Errorf("provider capture returned invalid status or reference")
	}
	return result, nil
}
