package reference

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

type CreatePaymentSessionInput struct {
	CheckoutIntentID string `json:"checkoutIntentId"`
	ClientID         string `json:"clientId"`
	StoreID          string `json:"storeId"`
	PaymentMethod    string `json:"paymentMethod"`
}

func CreatePaymentSession(db *sql.DB, input CreatePaymentSessionInput) (*PaymentSession, error) {
	if input.CheckoutIntentID == "" || input.ClientID == "" || input.StoreID == "" {
		return nil, fmt.Errorf("checkoutIntentId, clientId, and storeId are required")
	}
	if input.PaymentMethod == "" {
		input.PaymentMethod = "cod"
	}
	switch input.PaymentMethod {
	case "cod", "wallet", "mixed", "official_wallet":
	default:
		return nil, fmt.Errorf("unsupported paymentMethod: %s", input.PaymentMethod)
	}

	const q = `
		INSERT INTO wlt_payment_sessions
			(checkout_intent_id, client_id, store_id, payment_method, status)
		VALUES ($1, $2, $3, $4, 'reference_created')
		ON CONFLICT (checkout_intent_id) DO UPDATE
		  SET updated_at = NOW()
		RETURNING id, checkout_intent_id, client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency, captured_at, created_at, updated_at`

	row := db.QueryRow(q, input.CheckoutIntentID, input.ClientID, input.StoreID, input.PaymentMethod)
	return scanPaymentSession(row)
}

func GetPaymentSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	const q = `
		SELECT id, checkout_intent_id, client_id, store_id, payment_method,
		       status, provider_reference, amount_minor_units, currency, captured_at, created_at, updated_at
		FROM wlt_payment_sessions
		WHERE id = $1`
	row := db.QueryRow(q, sessionID)
	session, err := scanPaymentSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return session, err
}

func HandleCreatePaymentSession(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreatePaymentSessionInput
		if !decodeJSON(w, r, &input) {
			return
		}
		session, err := CreatePaymentSession(db, input)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"paymentSession": session})
	}
}

func HandleGetPaymentSession(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, err := GetPaymentSession(db, r.PathValue("paymentSessionId"))
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

func scanPaymentSession(row *sql.Row) (*PaymentSession, error) {
	var session PaymentSession
	err := row.Scan(
		&session.ID,
		&session.CheckoutIntentID,
		&session.ClientID,
		&session.StoreID,
		&session.PaymentMethod,
		&session.Status,
		&session.ProviderReference,
		&session.AmountMinorUnits,
		&session.Currency,
		&session.CapturedAt,
		&session.CreatedAt,
		&session.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}
