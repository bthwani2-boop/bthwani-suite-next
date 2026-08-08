package reference

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/payment"
	"wlt-api/internal/shared"
)

var ErrIdempotencyConflict = errors.New("payment session idempotency conflict")

const paymentSessionCols = `id, checkout_intent_id, special_request_id,
	 subscription_purchase_id, commercial_product_reference,
	 operator_context_id,
	 client_id, store_id, payment_method, status, provider_reference, amount_minor_units,
	 currency, financial_purpose, captured_at, created_at, updated_at`

type PaymentSession struct {
	ID                         string  `json:"id"`
	CheckoutIntentID           *string `json:"checkoutIntentId,omitempty"`
	SpecialRequestID           *string `json:"specialRequestId,omitempty"`
	SubscriptionPurchaseID     *string `json:"subscriptionPurchaseId,omitempty"`
	CommercialProductReference *string `json:"commercialProductReference,omitempty"`
	OperatorContextID          string  `json:"operatorContextId"`
	ClientID                   string  `json:"clientId"`
	StoreID                    string  `json:"storeId"`
	PaymentMethod              string  `json:"paymentMethod"`
	Status                     string  `json:"status"`
	ProviderReference          string  `json:"providerReference"`
	AmountMinorUnits           int64   `json:"amountMinorUnits"`
	Currency                   string  `json:"currency"`
	// FinancialPurpose is server-derived and read-only to every caller. It is
	// exposed so an auditor can see why the money moved without joining back to
	// whichever source system created the session.
	FinancialPurpose string                   `json:"financialPurpose"`
	Allocation       []payment.AllocationLine `json:"allocation,omitempty"`
	CapturedAt       *string                  `json:"capturedAt,omitempty"`
	CreatedAt        string                   `json:"createdAt"`
	UpdatedAt        string                   `json:"updatedAt"`
}

// Exactly one source identifier must be present. A subscription purchase also
// requires commercialProductReference so later activation can prove that the
// captured payment was created for the exact WLT product being activated.
type CreatePaymentSessionInput struct {
	CheckoutIntentID           string `json:"checkoutIntentId"`
	SpecialRequestID           string `json:"specialRequestId"`
	SubscriptionPurchaseID     string `json:"subscriptionPurchaseId"`
	CommercialProductReference string `json:"commercialProductReference"`
	// OperatorContextID is a temporary persistence compatibility field. The
	// HTTP handler ignores any caller value and overwrites it from authenticated
	// server configuration before validation or database access.
	OperatorContextID string `json:"operatorContextId"`
	ClientID          string `json:"clientId"`
	StoreID           string `json:"storeId"`
	PaymentMethod     string `json:"paymentMethod"`
	AmountMinorUnits  int64  `json:"amountMinorUnits"`
	Currency          string `json:"currency"`
	CartSnapshotHash  string `json:"cartSnapshotHash"`
	// Allocation is the caller's price breakdown of AmountMinorUnits. DSH owns
	// what an order costs and therefore supplies the numbers; WLT owns what
	// those numbers mean and rejects any set that does not conserve the total.
	// Omitting it is allowed and records no breakdown.
	Allocation     []payment.AllocationLine `json:"allocation,omitempty"`
	IdempotencyKey string                   `json:"-"`
	CorrelationID  string                   `json:"-"`
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
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	if input.OperatorContextID == "" || input.ClientID == "" || input.StoreID == "" {
		return nil, fmt.Errorf("financial compatibility scope, clientId and storeId are required")
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

	// The purpose is resolved from the source identity the caller has already
	// been validated against, never from anything it could set directly.
	purpose, err := payment.DerivePaymentSessionPurpose(payment.SessionSource{
		CheckoutIntentID:       input.CheckoutIntentID,
		SpecialRequestID:       input.SpecialRequestID,
		SubscriptionPurchaseID: input.SubscriptionPurchaseID,
	})
	if err != nil {
		return nil, err
	}
	if err := payment.ValidatePaymentAllocation(input.Allocation, input.AmountMinorUnits); err != nil {
		return nil, err
	}

	var existing *PaymentSession
	switch {
	case input.CheckoutIntentID != "":
		existing, err = getPaymentSessionByCheckoutIntent(db, input.OperatorContextID, input.CheckoutIntentID)
	case input.SpecialRequestID != "":
		existing, err = getPaymentSessionBySpecialRequest(db, input.OperatorContextID, input.SpecialRequestID)
	default:
		existing, err = getPaymentSessionBySubscriptionPurchase(db, input.OperatorContextID, input.SubscriptionPurchaseID)
	}
	if err != nil {
		return nil, err
	}
	if existing != nil {
		// The allocation is part of what makes a replay the same request: a
		// second call for the same source carrying a different breakdown is a
		// different financial claim, not a retry, so it must conflict rather
		// than silently return the first session.
		if existing.ClientID != input.ClientID ||
			existing.OperatorContextID != input.OperatorContextID ||
			existing.StoreID != input.StoreID ||
			existing.PaymentMethod != input.PaymentMethod ||
			existing.AmountMinorUnits != input.AmountMinorUnits ||
			existing.Currency != input.Currency ||
			stringValue(existing.CommercialProductReference) != input.CommercialProductReference ||
			!sameAllocation(existing.Allocation, input.Allocation) {
			return nil, ErrIdempotencyConflict
		}
		return existing, nil
	}

	const q = `
		INSERT INTO wlt_payment_sessions
			(checkout_intent_id, special_request_id, subscription_purchase_id,
			 commercial_product_reference, operator_context_id, client_id, store_id,
			 payment_method, status, amount_minor_units, currency, financial_purpose,
			 cart_snapshot_hash, idempotency_key, correlation_id)
		VALUES (NULLIF($1, ''), NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''),
			$5, $6, $7, $8, 'reference_created', $9, $10, $11, $12, $13, $14)
		RETURNING ` + paymentSessionCols

	// The session and its allocation are one financial fact and are written in
	// one transaction: a session must never become visible carrying a partial
	// breakdown. The deferred conservation trigger added in wlt-908 re-checks
	// the completed set at COMMIT.
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	session, err := scanPaymentSession(tx.QueryRow(q,
		input.CheckoutIntentID,
		input.SpecialRequestID,
		input.SubscriptionPurchaseID,
		input.CommercialProductReference,
		input.OperatorContextID,
		input.ClientID,
		input.StoreID,
		input.PaymentMethod,
		input.AmountMinorUnits,
		input.Currency,
		string(purpose),
		input.CartSnapshotHash,
		input.IdempotencyKey,
		input.CorrelationID,
	))
	if err != nil {
		return nil, err
	}

	for _, line := range input.Allocation {
		if _, err := tx.Exec(`
			INSERT INTO wlt_payment_allocation_components
				(payment_session_id, operator_context_id, component, amount_minor_units, currency)
			VALUES ($1, $2, $3, $4, $5)`,
			session.ID,
			input.OperatorContextID,
			string(line.Component),
			line.AmountMinorUnits,
			input.Currency,
		); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	session.Allocation = append([]payment.AllocationLine(nil), input.Allocation...)
	return session, nil
}

// sameAllocation compares two breakdowns as sets: the wire order of components
// carries no financial meaning, so reordering the same numbers is still the
// same claim and must replay rather than conflict.
func sameAllocation(left, right []payment.AllocationLine) bool {
	if len(left) != len(right) {
		return false
	}
	byComponent := make(map[payment.AllocationComponent]int64, len(left))
	for _, line := range left {
		byComponent[line.Component] = line.AmountMinorUnits
	}
	for _, line := range right {
		amount, ok := byComponent[line.Component]
		if !ok || amount != line.AmountMinorUnits {
			return false
		}
	}
	return true
}

// loadAllocation reads the persisted breakdown for a session. Components are
// ordered by name so a readback is stable for auditing and comparison.
func loadAllocation(db *sql.DB, sessionID string) ([]payment.AllocationLine, error) {
	rows, err := db.Query(`
		SELECT component, amount_minor_units
		FROM wlt_payment_allocation_components
		WHERE payment_session_id = $1
		ORDER BY component`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lines []payment.AllocationLine
	for rows.Next() {
		var line payment.AllocationLine
		if err := rows.Scan(&line.Component, &line.AmountMinorUnits); err != nil {
			return nil, err
		}
		lines = append(lines, line)
	}
	return lines, rows.Err()
}

// attachAllocation fills in the breakdown on a session that was just read.
// A nil session is passed through so callers can chain it onto a lookup that
// legitimately found nothing.
func attachAllocation(db *sql.DB, session *PaymentSession, err error) (*PaymentSession, error) {
	if err != nil || session == nil {
		return session, err
	}
	allocation, err := loadAllocation(db, session.ID)
	if err != nil {
		return nil, err
	}
	session.Allocation = allocation
	return session, nil
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
	return attachAllocation(db, session, err)
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
		compatibilityScope, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_BOUND", "server-owned financial compatibility scope is unavailable")
			return
		}
		input.OperatorContextID = compatibilityScope
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
// for a given DSH checkout intent. This service-only compatibility read is safe
// in the current single-platform deployment; server-scoped creation and source
// uniqueness remain mandatory while legacy columns are retired.
func GetPaymentSessionByCheckoutIntent(db *sql.DB, checkoutIntentID string) (*PaymentSession, error) {
	return getPaymentSessionByCheckoutIntent(db, "", checkoutIntentID)
}

func getPaymentSessionByCheckoutIntent(db *sql.DB, operatorContextID string, checkoutIntentID string) (*PaymentSession, error) {
	q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE checkout_intent_id = $1`
	args := []any{checkoutIntentID}
	if operatorContextID != "" {
		q += ` AND operator_context_id = $2`
		args = append(args, operatorContextID)
	}
	session, err := scanPaymentSession(db.QueryRow(q, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return attachAllocation(db, session, err)
}

func getPaymentSessionBySpecialRequest(db *sql.DB, operatorContextID string, specialRequestID string) (*PaymentSession, error) {
	q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE special_request_id = $1`
	args := []any{specialRequestID}
	if operatorContextID != "" {
		q += ` AND operator_context_id = $2`
		args = append(args, operatorContextID)
	}
	session, err := scanPaymentSession(db.QueryRow(q, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return attachAllocation(db, session, err)
}

func getPaymentSessionBySubscriptionPurchase(db *sql.DB, operatorContextID string, purchaseID string) (*PaymentSession, error) {
	q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE subscription_purchase_id = $1`
	args := []any{purchaseID}
	if operatorContextID != "" {
		q += ` AND operator_context_id = $2`
		args = append(args, operatorContextID)
	}
	session, err := scanPaymentSession(db.QueryRow(q, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return attachAllocation(db, session, err)
}

func requireDshServiceCaller(w http.ResponseWriter, r *http.Request) bool {
	return shared.RequireServiceCaller(w, r, "WLT_DSH_SERVICE_TOKEN", "dsh")
}

func scanPaymentSession(row *sql.Row) (*PaymentSession, error) {
	var session PaymentSession
	err := row.Scan(
		&session.ID,
		&session.CheckoutIntentID,
		&session.SpecialRequestID,
		&session.SubscriptionPurchaseID,
		&session.CommercialProductReference,
		&session.OperatorContextID,
		&session.ClientID,
		&session.StoreID,
		&session.PaymentMethod,
		&session.Status,
		&session.ProviderReference,
		&session.AmountMinorUnits,
		&session.Currency,
		&session.FinancialPurpose,
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
