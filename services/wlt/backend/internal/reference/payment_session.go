package reference

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/lib/pq"

	"wlt-api/internal/shared"
)

var ErrIdempotencyConflict = errors.New("payment session idempotency conflict")

const defaultTenantID = "tenant-dev-001"

const paymentSessionCols = `id, checkout_intent_id, special_request_id,
	 subscription_purchase_id, commercial_product_reference,
	 COALESCE(to_jsonb(wlt_payment_sessions)->>'tenant_id', 'tenant-dev-001'),
	 client_id, store_id, payment_method, status, provider_reference, amount_minor_units,
	 currency, captured_at, created_at, updated_at`

type PaymentSession struct {
	ID                         string  `json:"id"`
	CheckoutIntentID           *string `json:"checkoutIntentId,omitempty"`
	SpecialRequestID           *string `json:"specialRequestId,omitempty"`
	SubscriptionPurchaseID     *string `json:"subscriptionPurchaseId,omitempty"`
	CommercialProductReference *string `json:"commercialProductReference,omitempty"`
	TenantID                   string  `json:"tenantId"`
	ClientID                   string  `json:"clientId"`
	StoreID                    string  `json:"storeId"`
	PaymentMethod              string  `json:"paymentMethod"`
	Status                     string  `json:"status"`
	ProviderReference          string  `json:"providerReference"`
	AmountMinorUnits           int64   `json:"amountMinorUnits"`
	Currency                   string  `json:"currency"`
	CapturedAt                 *string `json:"capturedAt,omitempty"`
	CreatedAt                  string  `json:"createdAt"`
	UpdatedAt                  string  `json:"updatedAt"`
}

// Exactly one source identifier must be present. A subscription purchase also
// requires commercialProductReference so later activation can prove that the
// captured payment was created for the exact WLT product being activated.
type CreatePaymentSessionInput struct {
	CheckoutIntentID           string `json:"checkoutIntentId"`
	SpecialRequestID           string `json:"specialRequestId"`
	SubscriptionPurchaseID     string `json:"subscriptionPurchaseId"`
	CommercialProductReference string `json:"commercialProductReference"`
	TenantID                   string `json:"tenantId"`
	ClientID                   string `json:"clientId"`
	StoreID                    string `json:"storeId"`
	PaymentMethod              string `json:"paymentMethod"`
	AmountMinorUnits           int64  `json:"amountMinorUnits"`
	Currency                   string `json:"currency"`
	CartSnapshotHash           string `json:"cartSnapshotHash"`
	IdempotencyKey             string `json:"-"`
	CorrelationID              string `json:"-"`
}

func sourceCount(input CreatePaymentSessionInput) int {
	count := 0
	if input.CheckoutIntentID != "" {
		count++
	}
	if input.SpecialRequestID != "" {
		count++
	}
	if input.SubscriptionPurchaseID != "" {
		count++
	}
	return count
}

func CreatePaymentSession(db *sql.DB, input CreatePaymentSessionInput) (*PaymentSession, error) {
	if sourceCount(input) != 1 {
		return nil, fmt.Errorf("exactly one of checkoutIntentId, specialRequestId or subscriptionPurchaseId is required")
	}
	if input.SubscriptionPurchaseID != "" && input.CommercialProductReference == "" {
		return nil, fmt.Errorf("commercialProductReference is required for a subscription purchase")
	}
	if input.SubscriptionPurchaseID == "" && input.CommercialProductReference != "" {
		return nil, fmt.Errorf("commercialProductReference is only valid for a subscription purchase")
	}
	if input.TenantID == "" || input.ClientID == "" || input.StoreID == "" {
		return nil, fmt.Errorf("tenantId, clientId and storeId are required")
	}
	if input.PaymentMethod == "" {
		input.PaymentMethod = "official_wallet"
	}
	if input.Currency == "" {
		input.Currency = "YER"
	}
	switch input.PaymentMethod {
	case "cod", "wallet", "mixed", "official_wallet":
	default:
		return nil, fmt.Errorf("unsupported paymentMethod: %s", input.PaymentMethod)
	}
	if input.SubscriptionPurchaseID != "" && input.PaymentMethod == "cod" {
		return nil, fmt.Errorf("cod is not supported for subscription purchases")
	}
	if input.AmountMinorUnits <= 0 {
		return nil, fmt.Errorf("amountMinorUnits must be greater than 0")
	}

	var existing *PaymentSession
	var err error
	switch {
	case input.CheckoutIntentID != "":
		existing, err = getPaymentSessionByCheckoutIntent(db, input.TenantID, input.CheckoutIntentID)
	case input.SpecialRequestID != "":
		existing, err = getPaymentSessionBySpecialRequest(db, input.TenantID, input.SpecialRequestID)
	default:
		existing, err = getPaymentSessionBySubscriptionPurchase(db, input.TenantID, input.SubscriptionPurchaseID)
	}
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if existing.ClientID != input.ClientID ||
			existing.TenantID != input.TenantID ||
			existing.StoreID != input.StoreID ||
			existing.PaymentMethod != input.PaymentMethod ||
			existing.AmountMinorUnits != input.AmountMinorUnits ||
			existing.Currency != input.Currency ||
			stringValue(existing.CommercialProductReference) != input.CommercialProductReference {
			return nil, ErrIdempotencyConflict
		}
		return existing, nil
	}

	const q = `
		INSERT INTO wlt_payment_sessions
			(checkout_intent_id, special_request_id, subscription_purchase_id,
			 commercial_product_reference, tenant_id, client_id, store_id,
			 payment_method, status, amount_minor_units, currency, cart_snapshot_hash,
			 idempotency_key, correlation_id)
		VALUES (NULLIF($1, ''), NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''),
			$5, $6, $7, $8, 'reference_created', $9, $10, $11, $12, $13)
		RETURNING ` + paymentSessionCols

	row := db.QueryRow(q,
		input.CheckoutIntentID,
		input.SpecialRequestID,
		input.SubscriptionPurchaseID,
		input.CommercialProductReference,
		input.TenantID,
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

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func GetPaymentSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	const q = `
		SELECT ` + paymentSessionCols + `
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
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "payment source was already used with a different payload")
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
// for a given DSH checkout intent.
func GetPaymentSessionByCheckoutIntent(db *sql.DB, checkoutIntentID string) (*PaymentSession, error) {
	return getPaymentSessionByCheckoutIntent(db, "", checkoutIntentID)
}

func getPaymentSessionByCheckoutIntent(db *sql.DB, tenantID string, checkoutIntentID string) (*PaymentSession, error) {
	q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE checkout_intent_id = $1`
	args := []any{checkoutIntentID}
	if tenantID != "" {
		q += ` AND tenant_id = $2`
		args = append(args, tenantID)
	}
	session, err := scanPaymentSession(db.QueryRow(q, args...))
	if isUndefinedColumn(err) && tenantID != "" {
		return nil, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return session, err
}

func getPaymentSessionBySpecialRequest(db *sql.DB, tenantID string, specialRequestID string) (*PaymentSession, error) {
	q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE special_request_id = $1`
	args := []any{specialRequestID}
	if tenantID != "" {
		q += ` AND tenant_id = $2`
		args = append(args, tenantID)
	}
	session, err := scanPaymentSession(db.QueryRow(q, args...))
	if isUndefinedColumn(err) && tenantID != "" {
		return nil, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return session, err
}

func getPaymentSessionBySubscriptionPurchase(db *sql.DB, tenantID string, purchaseID string) (*PaymentSession, error) {
	q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE subscription_purchase_id = $1`
	args := []any{purchaseID}
	if tenantID != "" {
		q += ` AND tenant_id = $2`
		args = append(args, tenantID)
	}
	session, err := scanPaymentSession(db.QueryRow(q, args...))
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
		&session.SpecialRequestID,
		&session.SubscriptionPurchaseID,
		&session.CommercialProductReference,
		&session.TenantID,
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

func isUndefinedColumn(err error) bool {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return string(pqErr.Code) == "42703"
	}
	return false
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
