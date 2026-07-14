package payment

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"wlt-api/internal/dshoutbox"
	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

// dshNotifier delivery is handled by the durable outbox (internal/dshoutbox):
// each terminal transition below enqueues an event in the same transaction
// as its status update, and a background worker drains the outbox and calls
// dshnotify.Client.Notify with retry. This keeps the WLT transition itself
// free of any dependency on DSH being reachable.

type PaymentSession struct {
	ID                string  `json:"id"`
	CheckoutIntentID  string  `json:"checkoutIntentId"`
	ClientID          string  `json:"clientId"`
	StoreID           string  `json:"storeId"`
	PaymentMethod     string  `json:"paymentMethod"`
	Status            string  `json:"status"`
	ProviderReference string  `json:"providerReference"`
	AmountMinorUnits  int64   `json:"amountMinorUnits"`
	Currency          string  `json:"currency"`
	CapturedAt        *string `json:"capturedAt"`
	CreatedAt         string  `json:"createdAt"`
	UpdatedAt         string  `json:"updatedAt"`
}

type AuthorizeInput struct {
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
}

type financialProvider interface {
	Post(ctx context.Context, path string, body any, meta provider.RequestMeta) (provider.ProviderResult, error)
}

func scanSession(row *sql.Row) (*PaymentSession, error) {
	var s PaymentSession
	err := row.Scan(
		&s.ID,
		&s.CheckoutIntentID,
		&s.ClientID,
		&s.StoreID,
		&s.PaymentMethod,
		&s.Status,
		&s.ProviderReference,
		&s.AmountMinorUnits,
		&s.Currency,
		&s.CapturedAt,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func getSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	row := db.QueryRow(selectCols, sessionID)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

const selectCols = `
	SELECT id, checkout_intent_id, client_id, store_id, payment_method,
	       status, provider_reference, amount_minor_units, currency,
	       captured_at, created_at, updated_at
	FROM wlt_payment_sessions
	WHERE id = $1`

func AuthorizeSession(db *sql.DB, sessionID string, amountMinorUnits int64, currency string) (*PaymentSession, error) {
	client, err := provider.NewDefaultPaymentProvider()
	if err != nil {
		return nil, err
	}
	return AuthorizeSessionWithProvider(context.Background(), db, client, sessionID, amountMinorUnits, currency, provider.NewRequestMeta("wlt-authorize"))
}

func AuthorizeSessionWithProvider(ctx context.Context, db *sql.DB, client financialProvider, sessionID string, amountMinorUnits int64, currency string, meta provider.RequestMeta) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	if currency == "" {
		currency = "YER"
	}
	if amountMinorUnits <= 0 {
		return nil, fmt.Errorf("amountMinorUnits must be greater than 0")
	}
	current, err := getSession(db, sessionID)
	if err != nil || current == nil {
		return current, err
	}
	result, err := authorizeProvider(ctx, client, current, amountMinorUnits, currency, meta)
	if err != nil {
		_ = markSessionFailedAndNotify(db, current)
		return nil, err
	}
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'authorized', provider_reference = $2, amount_minor_units = $3, currency = $4, updated_at = NOW()
		WHERE id = $1
		RETURNING id, checkout_intent_id, client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency,
		          captured_at, created_at, updated_at`
	row := db.QueryRow(q, sessionID, result.ProviderReference, amountMinorUnits, currency)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func CaptureSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
	client, err := provider.NewDefaultPaymentProvider()
	if err != nil {
		return nil, err
	}
	return CaptureSessionWithProvider(context.Background(), db, client, sessionID, provider.NewRequestMeta("wlt-capture"))
}

func CaptureSessionWithProvider(ctx context.Context, db *sql.DB, client financialProvider, sessionID string, meta provider.RequestMeta) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	current, err := getSession(db, sessionID)
	if err != nil || current == nil {
		return current, err
	}
	if current.Status != "authorized" {
		return nil, fmt.Errorf("payment session must be authorized before capture")
	}
	result, err := captureProvider(ctx, client, current, meta)
	if err != nil {
		_ = markSessionFailedAndNotify(db, current)
		return nil, err
	}
	return captureSessionAndNotify(db, sessionID, result.ProviderReference)
}

func authorizeProvider(ctx context.Context, client financialProvider, session *PaymentSession, amountMinorUnits int64, currency string, meta provider.RequestMeta) (provider.ProviderResult, error) {
	result, err := client.Post(ctx, "/financial/card/authorize", map[string]any{
		"paymentSessionId":  session.ID,
		"checkoutIntentId":  session.CheckoutIntentID,
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

func captureProvider(ctx context.Context, client financialProvider, session *PaymentSession, meta provider.RequestMeta) (provider.ProviderResult, error) {
	result, err := client.Post(ctx, "/financial/card/capture", map[string]any{
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

// markSessionFailedAndNotify marks sessionID failed and enqueues the DSH
// outbox event in the same transaction, so a lost DSH webhook can never
// happen without the WLT-side status transition also being rolled back.
func markSessionFailedAndNotify(db *sql.DB, session *PaymentSession) error {
	if session == nil {
		return nil
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`UPDATE wlt_payment_sessions SET status = 'failed', updated_at = NOW() WHERE id = $1`, session.ID); err != nil {
		return err
	}
	if err := dshoutbox.Enqueue(tx, dshoutbox.EventTypeFailed, session.ID, session.CheckoutIntentID); err != nil {
		return err
	}
	return tx.Commit()
}

// captureSessionAndNotify commits the captured transition and enqueues the
// DSH outbox event atomically.
func captureSessionAndNotify(db *sql.DB, sessionID, providerReference string) (*PaymentSession, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'captured', provider_reference = $2, captured_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING id, checkout_intent_id, client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency,
		          captured_at, created_at, updated_at`
	row := tx.QueryRow(q, sessionID, providerReference)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err := dshoutbox.Enqueue(tx, dshoutbox.EventTypeCaptured, s.ID, s.CheckoutIntentID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s, nil
}

// sendProviderError is handled by shared.SendProviderError.

func MarkCodPending(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'cod_pending', updated_at = NOW()
		WHERE id = $1
		RETURNING id, checkout_intent_id, client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency,
		          captured_at, created_at, updated_at`
	row := db.QueryRow(q, sessionID)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func MarkCodCollected(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'cod_collected', captured_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING id, checkout_intent_id, client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency,
		          captured_at, created_at, updated_at`
	row := db.QueryRow(q, sessionID)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

// ExpireSession commits the expired transition and enqueues the DSH outbox
// event atomically.
func ExpireSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'expired', updated_at = NOW()
		WHERE id = $1
		RETURNING id, checkout_intent_id, client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency,
		          captured_at, created_at, updated_at`
	row := tx.QueryRow(q, sessionID)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err := dshoutbox.Enqueue(tx, dshoutbox.EventTypeExpired, s.ID, s.CheckoutIntentID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s, nil
}

// HTTP handlers

func HandleAuthorizeSession(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := r.PathValue("paymentSessionId")
		var input AuthorizeInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		session, err := AuthorizeSessionWithProvider(r.Context(), db, client, sessionID, input.AmountMinorUnits, input.Currency, provider.RequestMetaFromHTTP(r, "wlt-authorize"))
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

func HandleCaptureSession(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		session, err := CaptureSessionWithProvider(r.Context(), db, client, r.PathValue("paymentSessionId"), provider.RequestMetaFromHTTP(r, "wlt-capture"))
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

func HandleExpireSession(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, err := ExpireSession(db, r.PathValue("paymentSessionId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"paymentSession": session})
	}
}

func HandleMarkCodCollected(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, err := MarkCodCollected(db, r.PathValue("paymentSessionId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"paymentSession": session})
	}
}