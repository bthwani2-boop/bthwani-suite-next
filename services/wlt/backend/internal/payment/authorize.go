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

// AuthorizeSessionWithProvider claims the payment session before the
// provider call and records every ambiguous outcome. A clean provider decline
// becomes failed. A transport ambiguity, malformed success response, or any
// local persistence failure after provider success becomes
// provider_result_unknown with an open reconciliation case, so callers must
// refresh authoritative provider status rather than repeat authorization.
func AuthorizeSessionWithProvider(ctx context.Context, db *sql.DB, rail provider.CashInRail, sessionID string, meta provider.RequestMeta) (*PaymentSession, error) {
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
		cause := fmt.Errorf("payment session has no amount to authorize")
		return nil, withDurableRecoveryError(cause, func() error {
			return markSessionFailedAndNotify(db, claimed, "authorization_pending")
		})
	}
	result, err := authorizeProvider(ctx, rail, claimed, claimed.AmountMinorUnits, currency, meta)
	if err != nil {
		if isAmbiguousProviderError(err) {
			return nil, withDurableRecoveryError(err, func() error {
				return markSessionResultUnknownAndOpenCase(db, claimed, "authorize", err, "authorization_pending")
			})
		}
		return nil, withDurableRecoveryError(err, func() error {
			return markSessionFailedAndNotify(db, claimed, "authorization_pending")
		})
	}

	finalizationFailure := func(cause error) (*PaymentSession, error) {
		return nil, withDurableRecoveryError(cause, func() error {
			return markSessionResultUnknownAndOpenCase(db, claimed, "authorize", cause, "authorization_pending")
		})
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
		RETURNING ` + sessionCols
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

func HandleAuthorizeSession(db *sql.DB, rail provider.CashInRail) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if rail == nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", "financial rail is not wired; refusing unenforced money movement")
			return
		}
		session, err := AuthorizeSessionWithProvider(r.Context(), db, rail, r.PathValue("paymentSessionId"), provider.RequestMetaFromHTTP(r, "wlt-authorize"))
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

func authorizeProvider(ctx context.Context, rail provider.CashInRail, session *PaymentSession, amountMinorUnits int64, currency string, meta provider.RequestMeta) (provider.ProviderResult, error) {
	result, err := rail.Authorize(ctx, map[string]any{
		"paymentSessionId":  session.ID,
		"checkoutIntentId":  strOrEmpty(session.CheckoutIntentID),
		"clientId":          session.ClientID,
		"storeId":           session.StoreID,
		"amountMinorUnits":  amountMinorUnits,
		"currency":          currency,
		"paymentMethod":     session.PaymentMethod,
		"providerReference": session.ProviderReference,
	}, meta)
	if err != nil {
		return provider.ProviderResult{}, err
	}
	if result.Status != "authorized" || result.ProviderReference == "" {
		return provider.ProviderResult{}, fmt.Errorf("provider authorization returned invalid status or reference")
	}
	return result, nil
}
