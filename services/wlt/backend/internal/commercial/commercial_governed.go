package commercial

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

func UpdateProductGoverned(db *sql.DB, reference string, input UpdateProductInput) (*Product, error) {
	before, err := GetProduct(db, reference)
	if err != nil {
		return nil, err
	}
	if before.Status == "archived" {
		return nil, ErrInvalidTransition
	}
	return UpdateProduct(db, reference, input)
}

func HandleUpdateProductGoverned(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpdateProductInput
		if !decodeJSON(w, r, &input) {
			return
		}
		product, err := UpdateProductGoverned(db, r.PathValue("productReference"), input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"product": product})
	}
}

func AppendLoyaltyEntryGoverned(ctx context.Context, db *sql.DB, input AppendLoyaltyEntryInput) (*LoyaltyEntry, error) {
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.SourceType = strings.TrimSpace(input.SourceType)
	input.SourceID = strings.TrimSpace(input.SourceID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if db == nil || input.ClientID == "" || input.SourceType == "" || input.SourceID == "" || input.IdempotencyKey == "" || input.Points <= 0 {
		return nil, ErrInvalid
	}
	if input.Direction != "earn" && input.Direction != "burn" && input.Direction != "expire" && input.Direction != "reverse" {
		return nil, ErrInvalid
	}
	if input.Direction == "reverse" && strings.TrimSpace(input.ReversalOf) == "" {
		return nil, ErrInvalid
	}
	if input.Direction != "reverse" && strings.TrimSpace(input.ReversalOf) != "" {
		return nil, ErrInvalid
	}
	if input.Metadata == nil {
		input.Metadata = map[string]any{}
	}

	existing, err := GetLoyaltyEntryByIdempotency(db, input.IdempotencyKey)
	if err == nil {
		if existing.ClientID != input.ClientID || existing.Direction != input.Direction || existing.Points != input.Points || existing.SourceType != input.SourceType || existing.SourceID != input.SourceID || stringValue(existing.ReversalOf) != strings.TrimSpace(input.ReversalOf) {
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

	if _, err = tx.ExecContext(ctx, `INSERT INTO wlt_loyalty_accounts(client_id) VALUES ($1) ON CONFLICT (client_id) DO NOTHING`, input.ClientID); err != nil {
		return nil, err
	}

	var balance, lifetime int64
	if err := tx.QueryRowContext(ctx, `SELECT points_balance, lifetime_points FROM wlt_loyalty_accounts WHERE client_id=$1 FOR UPDATE`, input.ClientID).Scan(&balance, &lifetime); err != nil {
		return nil, err
	}

	points := input.Points
	var deltaBalance, deltaLifetime int64
	var reversal any
	switch input.Direction {
	case "earn":
		deltaBalance = points
		deltaLifetime = points
	case "burn", "expire":
		deltaBalance = -points
	case "reverse":
		var originalClient, originalDirection string
		var originalPoints int64
		err := tx.QueryRowContext(ctx, `SELECT client_id, direction, points FROM wlt_loyalty_entries WHERE id=$1 FOR UPDATE`, strings.TrimSpace(input.ReversalOf)).Scan(&originalClient, &originalDirection, &originalPoints)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		if err != nil {
			return nil, err
		}
		if originalClient != input.ClientID || originalDirection == "reverse" {
			return nil, ErrInvalid
		}
		var reversalCount int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_loyalty_entries WHERE reversal_of=$1`, input.ReversalOf).Scan(&reversalCount); err != nil {
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
		reversal = strings.TrimSpace(input.ReversalOf)
	}

	newBalance := balance + deltaBalance
	newLifetime := lifetime + deltaLifetime
	if newBalance < 0 || newLifetime < 0 {
		return nil, ErrInsufficientPoints
	}
	if _, err := tx.ExecContext(ctx, `UPDATE wlt_loyalty_accounts SET points_balance=$2, lifetime_points=$3, updated_at=NOW() WHERE client_id=$1`, input.ClientID, newBalance, newLifetime); err != nil {
		return nil, err
	}

	metadata, err := json.Marshal(input.Metadata)
	if err != nil {
		return nil, ErrInvalid
	}
	entry, err := scanLoyaltyEntry(tx.QueryRowContext(ctx, `
		INSERT INTO wlt_loyalty_entries
			(client_id, direction, points, balance_after, source_type, source_id, reversal_of, idempotency_key, correlation_id, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9,''), $10)
		RETURNING `+loyaltyEntrySelectCols,
		input.ClientID, input.Direction, points, newBalance, input.SourceType, input.SourceID, reversal, input.IdempotencyKey, input.CorrelationID, metadata,
	))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return entry, nil
}

func HandleAppendLoyaltyEntryGoverned(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input AppendLoyaltyEntryInput
		if !decodeJSON(w, r, &input) {
			return
		}
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		}
		if input.CorrelationID == "" {
			input.CorrelationID = r.Header.Get("X-Correlation-ID")
		}
		entry, err := AppendLoyaltyEntryGoverned(r.Context(), db, input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"entry": entry})
	}
}

type ActivateSubscriptionGovernedInput struct {
	ClientID               string `json:"clientId"`
	ProductReference       string `json:"productReference"`
	PaymentSessionID       string `json:"paymentSessionId"`
	SubscriptionPurchaseID string `json:"subscriptionPurchaseId"`
}

func ActivateSubscriptionGoverned(ctx context.Context, db *sql.DB, input ActivateSubscriptionGovernedInput) (*Subscription, error) {
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.ProductReference = strings.TrimSpace(input.ProductReference)
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.SubscriptionPurchaseID = strings.TrimSpace(input.SubscriptionPurchaseID)
	if db == nil || input.ClientID == "" || input.ProductReference == "" || input.PaymentSessionID == "" || input.SubscriptionPurchaseID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var price int64
	var currency, cycle, productStatus string
	err = tx.QueryRowContext(ctx, `SELECT price_minor_units, currency, billing_cycle, status FROM wlt_commercial_products WHERE reference=$1 FOR UPDATE`, input.ProductReference).Scan(&price, &currency, &cycle, &productStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if productStatus != "active" {
		return nil, ErrInvalidTransition
	}

	var paymentClient, paymentStatus, paymentCurrency string
	var paymentAmount int64
	var purchaseID, productReference, checkoutIntentID, specialRequestID sql.NullString
	err = tx.QueryRowContext(ctx, `SELECT client_id, status, amount_minor_units, currency, subscription_purchase_id, commercial_product_reference, checkout_intent_id, special_request_id FROM wlt_payment_sessions WHERE id=$1 FOR UPDATE`, input.PaymentSessionID).Scan(&paymentClient, &paymentStatus, &paymentAmount, &paymentCurrency, &purchaseID, &productReference, &checkoutIntentID, &specialRequestID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if paymentStatus != "captured" {
		return nil, ErrPaymentNotCaptured
	}
	if !purchaseID.Valid || purchaseID.String != input.SubscriptionPurchaseID || !productReference.Valid || productReference.String != input.ProductReference || checkoutIntentID.Valid || specialRequestID.Valid || paymentClient != input.ClientID || paymentAmount != price || paymentCurrency != currency {
		return nil, ErrPaymentMismatch
	}

	var activeCount int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_client_subscriptions WHERE client_id=$1 AND status='active'`, input.ClientID).Scan(&activeCount); err != nil {
		return nil, err
	}
	if activeCount > 0 {
		return nil, ErrActiveSubscription
	}

	start := time.Now().UTC()
	end := cycleEnd(start, cycle)
	subscription, err := scanSubscription(tx.QueryRowContext(ctx, `
		INSERT INTO wlt_client_subscriptions
			(client_id, product_reference, status, payment_session_id, subscription_purchase_id, starts_at, ends_at)
		VALUES ($1, $2, 'active', $3, $4, $5, $6)
		RETURNING `+subscriptionSelectCols,
		input.ClientID, input.ProductReference, input.PaymentSessionID, input.SubscriptionPurchaseID, start, end,
	))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return subscription, nil
}

func HandleActivateSubscriptionGoverned(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input ActivateSubscriptionGovernedInput
		if !decodeJSON(w, r, &input) {
			return
		}
		subscription, err := ActivateSubscriptionGoverned(r.Context(), db, input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"subscription": subscription})
	}
}
