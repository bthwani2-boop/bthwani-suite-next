package commercial

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

var (
	ErrNotFound           = errors.New("commercial record not found")
	ErrInvalid            = errors.New("invalid commercial input")
	ErrConflict           = errors.New("commercial record conflict")
	ErrVersionConflict    = errors.New("commercial product version conflict")
	ErrInvalidTransition  = errors.New("invalid commercial product transition")
	ErrSeparationOfDuties = errors.New("independent commercial product approval required")
	ErrInsufficientPoints = errors.New("insufficient loyalty points")
	ErrAlreadyReversed    = errors.New("loyalty entry already reversed")
	ErrPaymentNotCaptured = errors.New("subscription payment is not captured")
	ErrPaymentMismatch    = errors.New("subscription payment does not match product")
	ErrActiveSubscription = errors.New("client already has an active subscription")
)

var productStatuses = map[string]bool{
	"draft": true, "active": true, "paused": true, "archived": true,
}

func productTransitionAllowed(from, to string) bool {
	if from == to {
		return true
	}
	switch from {
	case "draft":
		return to == "active" || to == "archived"
	case "active":
		return to == "paused" || to == "archived"
	case "paused":
		return to == "active" || to == "archived"
	case "archived":
		return false
	default:
		return false
	}
}

type Product struct {
	Reference         string  `json:"reference"`
	ProductType       string  `json:"productType"`
	DisplayName       string  `json:"displayName"`
	PriceMinorUnits   int64   `json:"priceMinorUnits"`
	Currency          string  `json:"currency"`
	BillingCycle      string  `json:"billingCycle"`
	Status            string  `json:"status"`
	Version           int     `json:"version"`
	CreatedByActorID  string  `json:"createdByActorId"`
	ApprovedByActorID *string `json:"approvedByActorId,omitempty"`
	ApprovedAt        *string `json:"approvedAt,omitempty"`
	CreatedAt         string  `json:"createdAt"`
	UpdatedAt         string  `json:"updatedAt"`
}

const productSelectCols = `reference, product_type, display_name, price_minor_units,
	currency, billing_cycle, status, version, created_by_actor_id,
	approved_by_actor_id, approved_at::TEXT, created_at::TEXT, updated_at::TEXT`

func scanProduct(row interface{ Scan(dest ...any) error }) (*Product, error) {
	var product Product
	var approvedBy sql.NullString
	var approvedAt sql.NullString
	err := row.Scan(
		&product.Reference,
		&product.ProductType,
		&product.DisplayName,
		&product.PriceMinorUnits,
		&product.Currency,
		&product.BillingCycle,
		&product.Status,
		&product.Version,
		&product.CreatedByActorID,
		&approvedBy,
		&approvedAt,
		&product.CreatedAt,
		&product.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if approvedBy.Valid {
		product.ApprovedByActorID = &approvedBy.String
	}
	if approvedAt.Valid {
		product.ApprovedAt = &approvedAt.String
	}
	return &product, nil
}

func GetProduct(db *sql.DB, reference string) (*Product, error) {
	if db == nil || strings.TrimSpace(reference) == "" {
		return nil, ErrInvalid
	}
	return scanProduct(db.QueryRow(`SELECT `+productSelectCols+`
		FROM wlt_commercial_products WHERE reference=$1`, strings.TrimSpace(reference)))
}

type CreateProductInput struct {
	Reference        string `json:"reference"`
	DisplayName      string `json:"displayName"`
	PriceMinorUnits  int64  `json:"priceMinorUnits"`
	Currency         string `json:"currency"`
	BillingCycle     string `json:"billingCycle"`
	CreatedByActorID string `json:"createdByActorId"`
}

func validateProductInput(input CreateProductInput) error {
	input.Reference = strings.TrimSpace(input.Reference)
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	if input.Reference == "" || input.DisplayName == "" || input.CreatedByActorID == "" || input.PriceMinorUnits <= 0 {
		return ErrInvalid
	}
	if input.Currency == "" {
		input.Currency = "YER"
	}
	if input.Currency != "YER" {
		return ErrInvalid
	}
	switch input.BillingCycle {
	case "monthly", "quarterly", "annual":
		return nil
	default:
		return ErrInvalid
	}
}

func CreateProduct(db *sql.DB, input CreateProductInput) (*Product, error) {
	if db == nil || validateProductInput(input) != nil {
		return nil, ErrInvalid
	}
	input.Reference = strings.TrimSpace(input.Reference)
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	if input.Currency == "" {
		input.Currency = "YER"
	}

	existing, err := GetProduct(db, input.Reference)
	if err == nil {
		if existing.DisplayName == input.DisplayName &&
			existing.PriceMinorUnits == input.PriceMinorUnits &&
			existing.Currency == input.Currency &&
			existing.BillingCycle == input.BillingCycle &&
			existing.CreatedByActorID == input.CreatedByActorID {
			return existing, nil
		}
		return nil, ErrConflict
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	return scanProduct(db.QueryRow(`
		INSERT INTO wlt_commercial_products
			(reference, product_type, display_name, price_minor_units, currency,
			 billing_cycle, status, created_by_actor_id)
		VALUES ($1, 'subscription', $2, $3, $4, $5, 'draft', $6)
		RETURNING `+productSelectCols,
		input.Reference,
		input.DisplayName,
		input.PriceMinorUnits,
		input.Currency,
		input.BillingCycle,
		input.CreatedByActorID,
	))
}

type UpdateProductInput struct {
	DisplayName     *string `json:"displayName"`
	PriceMinorUnits *int64  `json:"priceMinorUnits"`
	Currency        *string `json:"currency"`
	BillingCycle    *string `json:"billingCycle"`
	Status          *string `json:"status"`
	ExpectedVersion int     `json:"expectedVersion"`
	ActorID         string  `json:"actorId"`
}

func UpdateProduct(db *sql.DB, reference string, input UpdateProductInput) (*Product, error) {
	if db == nil || strings.TrimSpace(reference) == "" || input.ExpectedVersion <= 0 || input.ActorID == "" {
		return nil, ErrInvalid
	}
	before, err := GetProduct(db, reference)
	if err != nil {
		return nil, err
	}
	if before.Version != input.ExpectedVersion {
		return nil, ErrVersionConflict
	}

	displayName := before.DisplayName
	price := before.PriceMinorUnits
	currency := before.Currency
	cycle := before.BillingCycle
	status := before.Status
	if input.DisplayName != nil {
		displayName = strings.TrimSpace(*input.DisplayName)
	}
	if input.PriceMinorUnits != nil {
		price = *input.PriceMinorUnits
	}
	if input.Currency != nil {
		currency = strings.ToUpper(strings.TrimSpace(*input.Currency))
	}
	if input.BillingCycle != nil {
		cycle = *input.BillingCycle
	}
	if input.Status != nil {
		status = *input.Status
	}

	if validateProductInput(CreateProductInput{
		Reference: reference, DisplayName: displayName, PriceMinorUnits: price,
		Currency: currency, BillingCycle: cycle, CreatedByActorID: before.CreatedByActorID,
	}) != nil || !productStatuses[status] {
		return nil, ErrInvalid
	}
	if !productTransitionAllowed(before.Status, status) {
		return nil, ErrInvalidTransition
	}
	termsChanged := displayName != before.DisplayName || price != before.PriceMinorUnits ||
		currency != before.Currency || cycle != before.BillingCycle
	if before.Status == "active" && status == "active" && termsChanged {
		return nil, ErrConflict
	}
	if status == "active" && before.Status != "active" && input.ActorID == before.CreatedByActorID {
		return nil, ErrSeparationOfDuties
	}

	approvedBy := before.ApprovedByActorID
	approvedAt := before.ApprovedAt
	if status == "active" && before.Status != "active" {
		actor := input.ActorID
		now := time.Now().UTC().Format(time.RFC3339Nano)
		approvedBy = &actor
		approvedAt = &now
	}

	product, err := scanProduct(db.QueryRow(`
		UPDATE wlt_commercial_products SET
			display_name=$2,
			price_minor_units=$3,
			currency=$4,
			billing_cycle=$5,
			status=$6,
			approved_by_actor_id=$7,
			approved_at=$8
		WHERE reference=$1 AND version=$9
		RETURNING `+productSelectCols,
		reference,
		displayName,
		price,
		currency,
		cycle,
		status,
		approvedBy,
		approvedAt,
		input.ExpectedVersion,
	))
	if errors.Is(err, ErrNotFound) {
		return nil, ErrVersionConflict
	}
	return product, err
}

type LoyaltyAccount struct {
	OperatorContextID string  `json:"operatorContextId"`
	ClientID          string  `json:"clientId"`
	PointsBalance     int64   `json:"pointsBalance"`
	LifetimePoints    int64   `json:"lifetimePoints"`
	TierReference     *string `json:"tierReference,omitempty"`
	UpdatedAt         string  `json:"updatedAt"`
}

type LoyaltyEntry struct {
	ID                string         `json:"id"`
	OperatorContextID string         `json:"operatorContextId"`
	ClientID          string         `json:"clientId"`
	Direction         string         `json:"direction"`
	Points            int64          `json:"points"`
	BalanceAfter      int64          `json:"balanceAfter"`
	SourceType        string         `json:"sourceType"`
	SourceID          string         `json:"sourceId"`
	ReversalOf        *string        `json:"reversalOf,omitempty"`
	IdempotencyKey    string         `json:"idempotencyKey"`
	CorrelationID     *string        `json:"correlationId,omitempty"`
	Metadata          map[string]any `json:"metadata"`
	CreatedAt         string         `json:"createdAt"`
}

const loyaltyEntrySelectCols = `id::TEXT, operator_context_id, client_id, direction, points, balance_after,
	source_type, source_id, reversal_of::TEXT, idempotency_key, correlation_id,
	metadata, created_at::TEXT`

func scanLoyaltyEntry(row interface{ Scan(dest ...any) error }) (*LoyaltyEntry, error) {
	var entry LoyaltyEntry
	var reversal sql.NullString
	var correlation sql.NullString
	var metadata []byte
	err := row.Scan(
		&entry.ID, &entry.OperatorContextID, &entry.ClientID, &entry.Direction, &entry.Points,
		&entry.BalanceAfter, &entry.SourceType, &entry.SourceID, &reversal,
		&entry.IdempotencyKey, &correlation, &metadata, &entry.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if reversal.Valid {
		entry.ReversalOf = &reversal.String
	}
	if correlation.Valid {
		entry.CorrelationID = &correlation.String
	}
	entry.Metadata = map[string]any{}
	_ = json.Unmarshal(metadata, &entry.Metadata)
	return &entry, nil
}

type AppendLoyaltyEntryInput struct {
	ClientID       string         `json:"clientId"`
	Direction      string         `json:"direction"`
	Points         int64          `json:"points"`
	SourceType     string         `json:"sourceType"`
	SourceID       string         `json:"sourceId"`
	ReversalOf     string         `json:"reversalOf"`
	IdempotencyKey string         `json:"idempotencyKey"`
	CorrelationID  string         `json:"correlationId"`
	Metadata       map[string]any `json:"metadata"`
}

func GetLoyaltyEntryByIdempotency(ctx context.Context, db *sql.DB, key string) (*LoyaltyEntry, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil || db == nil || strings.TrimSpace(key) == "" {
		return nil, ErrInvalid
	}
	return scanLoyaltyEntry(db.QueryRowContext(ctx, `SELECT `+loyaltyEntrySelectCols+`
		FROM wlt_loyalty_entries WHERE operator_context_id=$1 AND idempotency_key=$2`, operatorContextID, key))
}

func AppendLoyaltyEntry(ctx context.Context, db *sql.DB, input AppendLoyaltyEntryInput) (*LoyaltyEntry, error) {
	operatorContextID, contextErr := shared.RequireOperatorContext(ctx)
	if contextErr != nil {
		return nil, ErrInvalid
	}
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.SourceType = strings.TrimSpace(input.SourceType)
	input.SourceID = strings.TrimSpace(input.SourceID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if db == nil || input.ClientID == "" || input.SourceType == "" || input.SourceID == "" ||
		input.IdempotencyKey == "" || input.Points <= 0 {
		return nil, ErrInvalid
	}
	if input.Direction != "earn" && input.Direction != "burn" && input.Direction != "expire" && input.Direction != "reverse" {
		return nil, ErrInvalid
	}
	if input.Direction == "reverse" && input.ReversalOf == "" {
		return nil, ErrInvalid
	}
	if input.Direction != "reverse" && input.ReversalOf != "" {
		return nil, ErrInvalid
	}

	existing, err := GetLoyaltyEntryByIdempotency(ctx, db, input.IdempotencyKey)
	if err == nil {
		if existing.ClientID != input.ClientID || existing.Direction != input.Direction ||
			existing.SourceType != input.SourceType || existing.SourceID != input.SourceID {
			return nil, ErrConflict
		}
		return existing, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	_, err = tx.ExecContext(ctx, `INSERT INTO wlt_loyalty_accounts(operator_context_id, client_id) VALUES ($1,$2)
		ON CONFLICT (operator_context_id, client_id) DO NOTHING`, operatorContextID, input.ClientID)
	if err != nil {
		return nil, err
	}

	var balance, lifetime int64
	if err := tx.QueryRowContext(ctx, `SELECT points_balance, lifetime_points
		FROM wlt_loyalty_accounts WHERE operator_context_id=$1 AND client_id=$2 FOR UPDATE`, operatorContextID, input.ClientID).Scan(&balance, &lifetime); err != nil {
		return nil, err
	}

	points := input.Points
	deltaBalance := int64(0)
	deltaLifetime := int64(0)
	var reversal any
	switch input.Direction {
	case "earn":
		deltaBalance = points
		deltaLifetime = points
	case "burn", "expire":
		deltaBalance = -points
	case "reverse":
		var originalOperatorContext, originalClient, originalDirection string
		var originalPoints int64
		if err := tx.QueryRowContext(ctx, `SELECT operator_context_id, client_id, direction, points
				FROM wlt_loyalty_entries WHERE id=$1 AND operator_context_id=$2 FOR UPDATE`, input.ReversalOf, operatorContextID).
			Scan(&originalOperatorContext, &originalClient, &originalDirection, &originalPoints); errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		} else if err != nil {
			return nil, err
		}
		if originalOperatorContext != operatorContextID || originalClient != input.ClientID || originalDirection == "reverse" {
			return nil, ErrInvalid
		}
		var reversalCount int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_loyalty_entries WHERE operator_context_id=$1 AND reversal_of=$2`, operatorContextID, input.ReversalOf).Scan(&reversalCount); err != nil {
			return nil, err
		}
		if reversalCount > 0 {
			return nil, ErrAlreadyReversed
		}
		points = originalPoints
		if originalDirection == "earn" {
			deltaBalance = -points
			deltaLifetime = -points
		} else {
			deltaBalance = points
		}
		reversal = input.ReversalOf
	}

	newBalance := balance + deltaBalance
	newLifetime := lifetime + deltaLifetime
	if newBalance < 0 || newLifetime < 0 {
		return nil, ErrInsufficientPoints
	}
	if _, err := tx.ExecContext(ctx, `UPDATE wlt_loyalty_accounts
		SET points_balance=$3, lifetime_points=$4, updated_at=NOW()
		WHERE operator_context_id=$1 AND client_id=$2`, operatorContextID, input.ClientID, newBalance, newLifetime); err != nil {
		return nil, err
	}

	metadata, err := json.Marshal(input.Metadata)
	if err != nil {
		return nil, ErrInvalid
	}
	entry, err := scanLoyaltyEntry(tx.QueryRowContext(ctx, `
			INSERT INTO wlt_loyalty_entries
				(operator_context_id, client_id, direction, points, balance_after, source_type, source_id,
			 reversal_of, idempotency_key, correlation_id, metadata)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10,''), $11)
			RETURNING `+loyaltyEntrySelectCols,
		operatorContextID, input.ClientID,
		input.Direction,
		points,
		newBalance,
		input.SourceType,
		input.SourceID,
		reversal,
		input.IdempotencyKey,
		input.CorrelationID,
		metadata,
	))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return entry, nil
}

type Subscription struct {
	ID                string  `json:"id"`
	OperatorContextID string  `json:"operatorContextId"`
	ClientID          string  `json:"clientId"`
	ProductReference  string  `json:"productReference"`
	Status            string  `json:"status"`
	PaymentSessionID  *string `json:"paymentSessionId,omitempty"`
	StartsAt          string  `json:"startsAt"`
	EndsAt            *string `json:"endsAt,omitempty"`
	CreatedAt         string  `json:"createdAt"`
	UpdatedAt         string  `json:"updatedAt"`
}

const subscriptionSelectCols = `id::TEXT, operator_context_id, client_id, product_reference, status,
	payment_session_id::TEXT, starts_at::TEXT, ends_at::TEXT, created_at::TEXT, updated_at::TEXT`

func scanSubscription(row interface{ Scan(dest ...any) error }) (*Subscription, error) {
	var subscription Subscription
	var paymentSession sql.NullString
	var endsAt sql.NullString
	err := row.Scan(
		&subscription.ID, &subscription.OperatorContextID, &subscription.ClientID, &subscription.ProductReference,
		&subscription.Status, &paymentSession, &subscription.StartsAt, &endsAt,
		&subscription.CreatedAt, &subscription.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if paymentSession.Valid {
		subscription.PaymentSessionID = &paymentSession.String
	}
	if endsAt.Valid {
		subscription.EndsAt = &endsAt.String
	}
	return &subscription, nil
}

func cycleEnd(start time.Time, cycle string) time.Time {
	switch cycle {
	case "monthly":
		return start.AddDate(0, 1, 0)
	case "quarterly":
		return start.AddDate(0, 3, 0)
	default:
		return start.AddDate(1, 0, 0)
	}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		shared.SendError(w, http.StatusBadRequest, "INVALID_JSON", "request body is invalid")
		return false
	}
	return true
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		shared.SendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case errors.Is(err, ErrInvalid):
		shared.SendError(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
	case errors.Is(err, ErrInsufficientPoints):
		shared.SendError(w, http.StatusConflict, "INSUFFICIENT_POINTS", err.Error())
	case errors.Is(err, ErrPaymentNotCaptured):
		shared.SendError(w, http.StatusConflict, "PAYMENT_NOT_CAPTURED", err.Error())
	case errors.Is(err, ErrPaymentMismatch):
		shared.SendError(w, http.StatusConflict, "PAYMENT_MISMATCH", err.Error())
	case errors.Is(err, ErrSeparationOfDuties):
		shared.SendError(w, http.StatusConflict, "SEPARATION_OF_DUTIES_REQUIRED", err.Error())
	case errors.Is(err, ErrVersionConflict):
		shared.SendError(w, http.StatusConflict, "VERSION_CONFLICT", err.Error())
	case errors.Is(err, ErrInvalidTransition):
		shared.SendError(w, http.StatusConflict, "INVALID_TRANSITION", err.Error())
	case errors.Is(err, ErrAlreadyReversed):
		shared.SendError(w, http.StatusConflict, "ALREADY_REVERSED", err.Error())
	case errors.Is(err, ErrActiveSubscription):
		shared.SendError(w, http.StatusConflict, "ACTIVE_SUBSCRIPTION_EXISTS", err.Error())
	case errors.Is(err, ErrConflict):
		shared.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
	default:
		shared.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "commercial operation failed")
	}
}

func HandleGetProduct(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		product, err := GetProduct(db, r.PathValue("productReference"))
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"product": product})
	}
}

func HandleCreateProduct(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateProductInput
		if !decodeJSON(w, r, &input) {
			return
		}
		product, err := CreateProduct(db, input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"product": product})
	}
}

func ProductMatches(product *Product, displayName string, priceMinorUnits int64, currency, billingCycle string) error {
	if product == nil {
		return ErrNotFound
	}
	if product.Status != "active" {
		return ErrInvalidTransition
	}
	if product.DisplayName != strings.TrimSpace(displayName) ||
		product.PriceMinorUnits != priceMinorUnits ||
		product.Currency != strings.ToUpper(strings.TrimSpace(currency)) ||
		product.BillingCycle != billingCycle {
		return fmt.Errorf("%w: WLT product terms differ from DSH marketing definition", ErrPaymentMismatch)
	}
	return nil
}
