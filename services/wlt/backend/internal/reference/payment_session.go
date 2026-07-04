package reference

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/shared"
)

var ErrIdempotencyConflict = errors.New("payment session idempotency conflict")

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
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
	CartSnapshotHash string `json:"cartSnapshotHash"`
	IdempotencyKey   string `json:"-"`
	CorrelationID    string `json:"-"`
}

func CreatePaymentSession(db *sql.DB, input CreatePaymentSessionInput) (*PaymentSession, error) {
	if input.CheckoutIntentID == "" || input.ClientID == "" || input.StoreID == "" {
		return nil, fmt.Errorf("checkoutIntentId, clientId, and storeId are required")
	}
	if input.PaymentMethod == "" {
		input.PaymentMethod = "cod"
	}
	if input.Currency == "" {
		input.Currency = "YER"
	}
	switch input.PaymentMethod {
	case "cod", "wallet", "mixed", "official_wallet":
	default:
		return nil, fmt.Errorf("unsupported paymentMethod: %s", input.PaymentMethod)
	}
	if input.AmountMinorUnits <= 0 {
		return nil, fmt.Errorf("amountMinorUnits must be greater than 0")
	}

	existing, err := getPaymentSessionByCheckoutIntent(db, input.CheckoutIntentID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if existing.ClientID != input.ClientID ||
			existing.StoreID != input.StoreID ||
			existing.PaymentMethod != input.PaymentMethod ||
			existing.AmountMinorUnits != input.AmountMinorUnits ||
			existing.Currency != input.Currency {
			return nil, ErrIdempotencyConflict
		}
		return existing, nil
	}

	const q = `
		INSERT INTO wlt_payment_sessions
			(checkout_intent_id, client_id, store_id, payment_method, status,
			 amount_minor_units, currency, cart_snapshot_hash, idempotency_key, correlation_id)
		VALUES ($1, $2, $3, $4, 'reference_created', $5, $6, $7, $8, $9)
		RETURNING id, checkout_intent_id, client_id, store_id, payment_method,
		          status, provider_reference, amount_minor_units, currency, captured_at, created_at, updated_at`

	row := db.QueryRow(q,
		input.CheckoutIntentID,
		input.ClientID,
		input.StoreID,
		input.PaymentMethod,
		input.AmountMinorUnits,
		input.Currency,
		input.CartSnapshotHash,
		input.IdempotencyKey,
		input.CorrelationID,
	)
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
		if !requireDshServiceCaller(w, r) {
			return
		}
		var input CreatePaymentSessionInput
		if !decodeJSON(w, r, &input) {
			return
		}
		input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		if input.IdempotencyKey == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key is required")
			return
		}
		if input.CorrelationID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_CORRELATION_ID", "X-Correlation-ID is required")
			return
		}
		session, err := CreatePaymentSession(db, input)
		if errors.Is(err, ErrIdempotencyConflict) {
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "checkoutIntentId was already used with a different payload")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"paymentSession": session})
	}
}

// GetPaymentSessionByCheckoutIntent looks up the payment session WLT created
// for a given DSH checkout intent. Used by other WLT packages (e.g. cod) that
// need the authoritative amount/currency/payment-method for that checkout,
// since WLT -- not the caller -- is the source of truth for those fields.
func GetPaymentSessionByCheckoutIntent(db *sql.DB, checkoutIntentID string) (*PaymentSession, error) {
	return getPaymentSessionByCheckoutIntent(db, checkoutIntentID)
}

func getPaymentSessionByCheckoutIntent(db *sql.DB, checkoutIntentID string) (*PaymentSession, error) {
	const q = `
		SELECT id, checkout_intent_id, client_id, store_id, payment_method,
		       status, provider_reference, amount_minor_units, currency, captured_at, created_at, updated_at
		FROM wlt_payment_sessions
		WHERE checkout_intent_id = $1`
	session, err := scanPaymentSession(db.QueryRow(q, checkoutIntentID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return session, err
}

func requireDshServiceCaller(w http.ResponseWriter, r *http.Request) bool {
	return shared.RequireServiceCaller(w, r, "WLT_DSH_SERVICE_TOKEN", "dsh")
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
