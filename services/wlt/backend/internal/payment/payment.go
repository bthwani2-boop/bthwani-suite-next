package payment

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"wlt-api/internal/shared"
)

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

const selectCols = `
	SELECT id, checkout_intent_id, client_id, store_id, payment_method,
	       status, provider_reference, amount_minor_units, currency,
	       captured_at, created_at, updated_at
	FROM wlt_payment_sessions
	WHERE id = $1`

func AuthorizeSession(db *sql.DB, sessionID string, amountMinorUnits int64, currency string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	if currency == "" {
		currency = "SAR"
	}
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'authorized', amount_minor_units = $2, currency = $3, updated_at = NOW()
		WHERE id = $1
		RETURNING id, checkout_intent_id, client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency,
		          captured_at, created_at, updated_at`
	row := db.QueryRow(q, sessionID, amountMinorUnits, currency)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func CaptureSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'captured', captured_at = NOW(), updated_at = NOW()
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

func ExpireSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	const q = `
		UPDATE wlt_payment_sessions
		SET status = 'expired', updated_at = NOW()
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
		session, err := AuthorizeSession(db, sessionID, input.AmountMinorUnits, input.Currency)
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

func HandleCaptureSession(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, err := CaptureSession(db, r.PathValue("paymentSessionId"))
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
