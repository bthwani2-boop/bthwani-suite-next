package payment

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

// AuthorizeSessionWithProviderSovereign claims the payment session before the
// provider call and records every ambiguous outcome. A clean provider decline
// becomes failed. A transport ambiguity, malformed success response, or any
// local persistence failure after provider success becomes
// provider_result_unknown with an open reconciliation case, so callers must
// refresh authoritative provider status rather than repeat authorization.
func AuthorizeSessionWithProviderSovereign(ctx context.Context, db *sql.DB, client financialProvider, sessionID string, meta provider.RequestMeta) (*PaymentSession, error) {
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
	currency := claimed.Currency
	if currency == "" {
		currency = "YER"
	}
	if claimed.AmountMinorUnits <= 0 {
		_ = markSessionFailedAndNotify(db, claimed, "authorization_pending")
		return nil, fmt.Errorf("payment session has no amount to authorize")
	}
	result, err := authorizeProvider(ctx, client, claimed, claimed.AmountMinorUnits, currency, meta)
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
		return finalizationFailure(fmt.Errorf("begin authorize finalization: %w", err))
	}
	defer tx.Rollback()
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'authorized', provider_reference = $2,
		    last_provider_status = 'authorized', updated_at = NOW()
		WHERE id = $1 AND status = 'authorization_pending'
		RETURNING id, checkout_intent_id, special_request_id,
		          tenant_id,
		          client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency,
		          captured_at, created_at, updated_at`
	session, err := scanSession(tx.QueryRowContext(ctx, q, sessionID, result.ProviderReference))
	if errors.Is(err, sql.ErrNoRows) {
		return finalizationFailure(fmt.Errorf("session %s was no longer authorization_pending when finalizing authorize", sessionID))
	}
	if err != nil {
		return finalizationFailure(fmt.Errorf("finalize authorized session: %w", err))
	}
	if err := tx.Commit(); err != nil {
		return finalizationFailure(fmt.Errorf("commit authorized session: %w", err))
	}
	return session, nil
}

func HandleAuthorizeSessionSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		session, err := AuthorizeSessionWithProviderSovereign(r.Context(), db, client, r.PathValue("paymentSessionId"), provider.RequestMetaFromHTTP(r, "wlt-authorize"))
		if errors.Is(err, ErrNotAuthorizable) {
			shared.SendError(w, http.StatusConflict, "INVALID_PAYMENT_STATE", err.Error())
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
