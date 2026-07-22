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

var (
	ErrSubscriptionNotActive = errors.New("subscription is not active")
	ErrSubscriptionExpired   = errors.New("subscription has expired")
	ErrCancellationReason    = errors.New("subscription cancellation reason is required")
)

type SubscriptionLifecycle struct {
	ID                          string   `json:"id"`
	ClientID                    string   `json:"clientId"`
	ProductReference            string   `json:"productReference"`
	Status                      string   `json:"status"`
	PaymentSessionID            *string  `json:"paymentSessionId,omitempty"`
	SubscriptionPurchaseID      *string  `json:"subscriptionPurchaseId,omitempty"`
	StartsAt                    string   `json:"startsAt"`
	EndsAt                      *string  `json:"endsAt,omitempty"`
	CancelAtPeriodEnd           bool     `json:"cancelAtPeriodEnd"`
	CancelledAt                 *string  `json:"cancelledAt,omitempty"`
	CancellationReason          *string  `json:"cancellationReason,omitempty"`
	LastRenewalPaymentSessionID *string  `json:"lastRenewalPaymentSessionId,omitempty"`
	CompensationStatus          string   `json:"compensationStatus"`
	CompensationReference       *string  `json:"compensationReference,omitempty"`
	Version                     int      `json:"version"`
	AllowedActions              []string `json:"allowedActions"`
	CreatedAt                   string   `json:"createdAt"`
	UpdatedAt                   string   `json:"updatedAt"`
}

const subscriptionLifecycleSelect = `id::TEXT, client_id, product_reference, status,
	payment_session_id::TEXT, subscription_purchase_id, starts_at::TEXT, ends_at::TEXT,
	cancel_at_period_end, cancelled_at::TEXT, cancellation_reason,
	last_renewal_payment_session_id, compensation_status, compensation_reference,
	version, created_at::TEXT, updated_at::TEXT`

func scanSubscriptionLifecycle(row interface{ Scan(dest ...any) error }) (*SubscriptionLifecycle, error) {
	var item SubscriptionLifecycle
	var paymentSessionID, purchaseID, endsAt, cancelledAt, cancellationReason sql.NullString
	var renewalPaymentSessionID, compensationReference sql.NullString
	if err := row.Scan(
		&item.ID,
		&item.ClientID,
		&item.ProductReference,
		&item.Status,
		&paymentSessionID,
		&purchaseID,
		&item.StartsAt,
		&endsAt,
		&item.CancelAtPeriodEnd,
		&cancelledAt,
		&cancellationReason,
		&renewalPaymentSessionID,
		&item.CompensationStatus,
		&compensationReference,
		&item.Version,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if paymentSessionID.Valid {
		item.PaymentSessionID = &paymentSessionID.String
	}
	if purchaseID.Valid {
		item.SubscriptionPurchaseID = &purchaseID.String
	}
	if endsAt.Valid {
		item.EndsAt = &endsAt.String
	}
	if cancelledAt.Valid {
		item.CancelledAt = &cancelledAt.String
	}
	if cancellationReason.Valid {
		item.CancellationReason = &cancellationReason.String
	}
	if renewalPaymentSessionID.Valid {
		item.LastRenewalPaymentSessionID = &renewalPaymentSessionID.String
	}
	if compensationReference.Valid {
		item.CompensationReference = &compensationReference.String
	}
	item.AllowedActions = allowedSubscriptionActions(item)
	return &item, nil
}

func allowedSubscriptionActions(item SubscriptionLifecycle) []string {
	if item.Status != "active" {
		return []string{}
	}
	if item.EndsAt != nil {
		if end, err := time.Parse(time.RFC3339Nano, *item.EndsAt); err == nil && !end.After(time.Now().UTC()) {
			return []string{}
		}
	}
	actions := []string{"renew", "cancel"}
	if item.CancelAtPeriodEnd {
		actions = []string{"renew"}
	}
	return actions
}

type ActivateSubscriptionLifecycleInput struct {
	ClientID               string `json:"clientId"`
	ProductReference       string `json:"productReference"`
	PaymentSessionID       string `json:"paymentSessionId"`
	SubscriptionPurchaseID string `json:"subscriptionPurchaseId"`
}

type RenewSubscriptionLifecycleInput struct {
	ClientID               string `json:"clientId"`
	ProductReference       string `json:"productReference"`
	PaymentSessionID       string `json:"paymentSessionId"`
	SubscriptionPurchaseID string `json:"subscriptionPurchaseId"`
}

type CancelSubscriptionLifecycleInput struct {
	ClientID string `json:"clientId"`
	Reason   string `json:"reason"`
}

type SubscriptionCompensation struct {
	ID               string  `json:"id"`
	SubscriptionID   string  `json:"subscriptionId"`
	ClientID         string  `json:"clientId"`
	PaymentSessionID string  `json:"paymentSessionId"`
	Status           string  `json:"status"`
	Reason           string  `json:"reason"`
	RefundReference  *string `json:"refundReference,omitempty"`
	AmountMinorUnits int64   `json:"amountMinorUnits"`
	Currency         string  `json:"currency"`
	CorrelationID    string  `json:"correlationId"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
	CompletedAt      *string `json:"completedAt,omitempty"`
}

func requiredLifecycleHeaders(r *http.Request) (string, string, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	return idempotencyKey, correlationID, idempotencyKey != "" && correlationID != ""
}

func normalizeActivationInput(input ActivateSubscriptionLifecycleInput) ActivateSubscriptionLifecycleInput {
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.ProductReference = strings.TrimSpace(input.ProductReference)
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.SubscriptionPurchaseID = strings.TrimSpace(input.SubscriptionPurchaseID)
	return input
}

func validateBoundSubscriptionPayment(
	ctx context.Context,
	tx *sql.Tx,
	input ActivateSubscriptionLifecycleInput,
) (price int64, currency, cycle string, activationPoints int64, err error) {
	var productStatus string
	err = tx.QueryRowContext(ctx, `SELECT price_minor_units, currency, billing_cycle, status, activation_points
		FROM wlt_commercial_products WHERE reference=$1 FOR UPDATE`, input.ProductReference).
		Scan(&price, &currency, &cycle, &productStatus, &activationPoints)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, "", "", 0, ErrNotFound
	}
	if err != nil {
		return 0, "", "", 0, err
	}
	if productStatus != "active" {
		return 0, "", "", 0, ErrInvalidTransition
	}

	var paymentClient, paymentStatus, paymentCurrency string
	var paymentAmount int64
	var purchaseID, productReference, checkoutIntentID, specialRequestID sql.NullString
	err = tx.QueryRowContext(ctx, `SELECT client_id, status, amount_minor_units, currency,
		subscription_purchase_id, commercial_product_reference, checkout_intent_id, special_request_id
		FROM wlt_payment_sessions WHERE id=$1 FOR UPDATE`, input.PaymentSessionID).
		Scan(&paymentClient, &paymentStatus, &paymentAmount, &paymentCurrency,
			&purchaseID, &productReference, &checkoutIntentID, &specialRequestID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, "", "", 0, ErrNotFound
	}
	if err != nil {
		return 0, "", "", 0, err
	}
	if paymentStatus != "captured" {
		return 0, "", "", 0, ErrPaymentNotCaptured
	}
	if !purchaseID.Valid || purchaseID.String != input.SubscriptionPurchaseID ||
		!productReference.Valid || productReference.String != input.ProductReference ||
		checkoutIntentID.Valid || specialRequestID.Valid || paymentClient != input.ClientID ||
		paymentAmount != price || paymentCurrency != currency {
		return 0, "", "", 0, ErrPaymentMismatch
	}
	return price, currency, cycle, activationPoints, nil
}

func appendSubscriptionLifecycleEvent(
	ctx context.Context,
	tx *sql.Tx,
	subscriptionID, clientID, eventType, fromStatus, toStatus, paymentSessionID,
	purchaseID, idempotencyKey, correlationID, actorID string,
	metadata map[string]any,
) error {
	if metadata == nil {
		metadata = map[string]any{}
	}
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return ErrInvalid
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO wlt_subscription_lifecycle_events
		(subscription_id, client_id, event_type, from_status, to_status,
		 payment_session_id, subscription_purchase_id, idempotency_key,
		 correlation_id, actor_id, metadata)
		VALUES ($1,$2,$3,NULLIF($4,''),$5,NULLIF($6,''),NULLIF($7,''),$8,$9,$10,$11)
		ON CONFLICT (idempotency_key) DO NOTHING`,
		subscriptionID, clientID, eventType, fromStatus, toStatus,
		paymentSessionID, purchaseID, idempotencyKey, correlationID, actorID, encoded)
	return err
}

func appendActivationLoyaltyEntry(
	ctx context.Context,
	tx *sql.Tx,
	clientID, subscriptionID, purchaseID, correlationID string,
	points int64,
) error {
	if points <= 0 {
		return nil
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_loyalty_accounts(client_id)
		VALUES ($1) ON CONFLICT (client_id) DO NOTHING`, clientID); err != nil {
		return err
	}
	var balance, lifetime int64
	if err := tx.QueryRowContext(ctx, `SELECT points_balance, lifetime_points
		FROM wlt_loyalty_accounts WHERE client_id=$1 FOR UPDATE`, clientID).
		Scan(&balance, &lifetime); err != nil {
		return err
	}
	balance += points
	lifetime += points
	if _, err := tx.ExecContext(ctx, `UPDATE wlt_loyalty_accounts
		SET points_balance=$2, lifetime_points=$3, updated_at=NOW() WHERE client_id=$1`,
		clientID, balance, lifetime); err != nil {
		return err
	}
	metadata, _ := json.Marshal(map[string]any{
		"journeyId":              "JRN-027",
		"subscriptionId":         subscriptionID,
		"subscriptionPurchaseId": purchaseID,
	})
	_, err := tx.ExecContext(ctx, `INSERT INTO wlt_loyalty_entries
		(client_id, direction, points, balance_after, source_type, source_id,
		 idempotency_key, correlation_id, metadata)
		VALUES ($1,'earn',$2,$3,'subscription_activation',$4,$5,$6,$7)
		ON CONFLICT (idempotency_key) DO NOTHING`,
		clientID, points, balance, subscriptionID,
		"subscription-activation:"+purchaseID, correlationID, metadata)
	return err
}

func ActivateSubscriptionLifecycleGoverned(
	ctx context.Context,
	db *sql.DB,
	input ActivateSubscriptionLifecycleInput,
	idempotencyKey, correlationID string,
) (*SubscriptionLifecycle, error) {
	input = normalizeActivationInput(input)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if db == nil || input.ClientID == "" || input.ProductReference == "" ||
		input.PaymentSessionID == "" || input.SubscriptionPurchaseID == "" ||
		idempotencyKey == "" || correlationID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	existing, existingErr := scanSubscriptionLifecycle(tx.QueryRowContext(ctx,
		`SELECT `+subscriptionLifecycleSelect+` FROM wlt_client_subscriptions
		 WHERE subscription_purchase_id=$1 FOR UPDATE`, input.SubscriptionPurchaseID))
	if existingErr == nil {
		if existing.ClientID != input.ClientID || existing.ProductReference != input.ProductReference ||
			existing.PaymentSessionID == nil || *existing.PaymentSessionID != input.PaymentSessionID {
			return nil, ErrConflict
		}
		return existing, nil
	}
	if !errors.Is(existingErr, ErrNotFound) {
		return nil, existingErr
	}

	_, _, cycle, activationPoints, err := validateBoundSubscriptionPayment(ctx, tx, input)
	if err != nil {
		return nil, err
	}
	var activeCount int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_client_subscriptions
		WHERE client_id=$1 AND status='active' AND (ends_at IS NULL OR ends_at > NOW())`, input.ClientID).
		Scan(&activeCount); err != nil {
		return nil, err
	}
	if activeCount > 0 {
		return nil, ErrActiveSubscription
	}

	start := time.Now().UTC()
	end := cycleEnd(start, cycle)
	item, err := scanSubscriptionLifecycle(tx.QueryRowContext(ctx, `INSERT INTO wlt_client_subscriptions
		(client_id, product_reference, status, payment_session_id,
		 subscription_purchase_id, starts_at, ends_at, lifecycle_correlation_id)
		VALUES ($1,$2,'active',$3,$4,$5,$6,$7)
		RETURNING `+subscriptionLifecycleSelect,
		input.ClientID, input.ProductReference, input.PaymentSessionID,
		input.SubscriptionPurchaseID, start, end, correlationID))
	if err != nil {
		return nil, err
	}
	if err := appendActivationLoyaltyEntry(ctx, tx, input.ClientID, item.ID,
		input.SubscriptionPurchaseID, correlationID, activationPoints); err != nil {
		return nil, err
	}
	if err := appendSubscriptionLifecycleEvent(ctx, tx, item.ID, input.ClientID,
		"activated", "", "active", input.PaymentSessionID, input.SubscriptionPurchaseID,
		idempotencyKey, correlationID, input.ClientID,
		map[string]any{"activationPoints": activationPoints}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return item, nil
}

func GetSubscriptionLifecycle(ctx context.Context, db *sql.DB, subscriptionID string) (*SubscriptionLifecycle, error) {
	if db == nil || strings.TrimSpace(subscriptionID) == "" {
		return nil, ErrInvalid
	}
	return scanSubscriptionLifecycle(db.QueryRowContext(ctx,
		`SELECT `+subscriptionLifecycleSelect+` FROM wlt_client_subscriptions WHERE id=$1`,
		strings.TrimSpace(subscriptionID)))
}

func RenewSubscriptionLifecycleGoverned(
	ctx context.Context,
	db *sql.DB,
	subscriptionID string,
	input RenewSubscriptionLifecycleInput,
	idempotencyKey, correlationID string,
) (*SubscriptionLifecycle, error) {
	subscriptionID = strings.TrimSpace(subscriptionID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.ProductReference = strings.TrimSpace(input.ProductReference)
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.SubscriptionPurchaseID = strings.TrimSpace(input.SubscriptionPurchaseID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if db == nil || subscriptionID == "" || input.ClientID == "" ||
		input.ProductReference == "" || input.PaymentSessionID == "" ||
		input.SubscriptionPurchaseID == "" || idempotencyKey == "" || correlationID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	current, err := scanSubscriptionLifecycle(tx.QueryRowContext(ctx,
		`SELECT `+subscriptionLifecycleSelect+` FROM wlt_client_subscriptions WHERE id=$1 FOR UPDATE`, subscriptionID))
	if err != nil {
		return nil, err
	}
	if current.ClientID != input.ClientID || current.ProductReference != input.ProductReference {
		return nil, ErrPaymentMismatch
	}
	if current.Status != "active" {
		return nil, ErrSubscriptionNotActive
	}
	if current.EndsAt == nil {
		return nil, ErrInvalid
	}
	endAt, err := time.Parse(time.RFC3339Nano, *current.EndsAt)
	if err != nil {
		return nil, err
	}
	if !endAt.After(time.Now().UTC()) {
		return nil, ErrSubscriptionExpired
	}

	activationInput := ActivateSubscriptionLifecycleInput{
		ClientID: input.ClientID, ProductReference: input.ProductReference,
		PaymentSessionID: input.PaymentSessionID, SubscriptionPurchaseID: input.SubscriptionPurchaseID,
	}
	_, _, cycle, _, err := validateBoundSubscriptionPayment(ctx, tx, activationInput)
	if err != nil {
		return nil, err
	}
	var usedCount int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_client_subscriptions
		WHERE payment_session_id=$1 OR last_renewal_payment_session_id=$1`, input.PaymentSessionID).
		Scan(&usedCount); err != nil {
		return nil, err
	}
	if usedCount > 0 {
		if current.LastRenewalPaymentSessionID != nil && *current.LastRenewalPaymentSessionID == input.PaymentSessionID {
			return current, nil
		}
		return nil, ErrConflict
	}

	newEnd := cycleEnd(endAt, cycle)
	updated, err := scanSubscriptionLifecycle(tx.QueryRowContext(ctx, `UPDATE wlt_client_subscriptions
		SET ends_at=$2, last_renewal_payment_session_id=$3,
		    lifecycle_correlation_id=$4, cancel_at_period_end=FALSE
		WHERE id=$1 AND version=$5
		RETURNING `+subscriptionLifecycleSelect,
		subscriptionID, newEnd, input.PaymentSessionID, correlationID, current.Version))
	if err != nil {
		return nil, err
	}
	if err := appendSubscriptionLifecycleEvent(ctx, tx, subscriptionID, input.ClientID,
		"renewed", "active", "active", input.PaymentSessionID, input.SubscriptionPurchaseID,
		idempotencyKey, correlationID, input.ClientID,
		map[string]any{"previousEndsAt": endAt, "newEndsAt": newEnd}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return updated, nil
}

func CancelSubscriptionLifecycleGoverned(
	ctx context.Context,
	db *sql.DB,
	subscriptionID string,
	input CancelSubscriptionLifecycleInput,
	idempotencyKey, correlationID string,
) (*SubscriptionLifecycle, *SubscriptionCompensation, error) {
	subscriptionID = strings.TrimSpace(subscriptionID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if db == nil || subscriptionID == "" || input.ClientID == "" || idempotencyKey == "" || correlationID == "" {
		return nil, nil, ErrInvalid
	}
	if input.Reason == "" {
		return nil, nil, ErrCancellationReason
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = tx.Rollback() }()
	current, err := scanSubscriptionLifecycle(tx.QueryRowContext(ctx,
		`SELECT `+subscriptionLifecycleSelect+` FROM wlt_client_subscriptions WHERE id=$1 FOR UPDATE`, subscriptionID))
	if err != nil {
		return nil, nil, err
	}
	if current.ClientID != input.ClientID {
		return nil, nil, ErrNotFound
	}
	if current.Status == "cancelled" {
		compensation, _ := getSubscriptionCompensationTx(ctx, tx, subscriptionID)
		return current, compensation, nil
	}
	if current.Status != "active" {
		return nil, nil, ErrSubscriptionNotActive
	}

	compensationStatus := "not_required"
	var compensation *SubscriptionCompensation
	if current.EndsAt != nil && current.PaymentSessionID != nil {
		endAt, parseErr := time.Parse(time.RFC3339Nano, *current.EndsAt)
		if parseErr != nil {
			return nil, nil, parseErr
		}
		if endAt.After(time.Now().UTC()) {
			var amount int64
			var currency string
			if err := tx.QueryRowContext(ctx, `SELECT price_minor_units, currency
				FROM wlt_commercial_products WHERE reference=$1`, current.ProductReference).
				Scan(&amount, &currency); err != nil {
				return nil, nil, err
			}
			compensationStatus = "pending"
			compensation, err = scanSubscriptionCompensation(tx.QueryRowContext(ctx, `INSERT INTO wlt_subscription_compensations
				(subscription_id, client_id, payment_session_id, status, reason,
				 amount_minor_units, currency, requested_by_actor_id, correlation_id)
				VALUES ($1,$2,$3,'pending',$4,$5,$6,$2,$7)
				ON CONFLICT (subscription_id) DO UPDATE SET reason=EXCLUDED.reason
				RETURNING id::TEXT, subscription_id::TEXT, client_id, payment_session_id,
				 status, reason, refund_reference, amount_minor_units, currency,
				 correlation_id, created_at::TEXT, updated_at::TEXT, completed_at::TEXT`,
				subscriptionID, input.ClientID, *current.PaymentSessionID, input.Reason,
				amount, currency, correlationID))
			if err != nil {
				return nil, nil, err
			}
		}
	}

	updated, err := scanSubscriptionLifecycle(tx.QueryRowContext(ctx, `UPDATE wlt_client_subscriptions
		SET status='cancelled', cancelled_at=NOW(), cancellation_reason=$2,
		    cancel_at_period_end=FALSE, compensation_status=$3,
		    lifecycle_correlation_id=$4
		WHERE id=$1 AND version=$5
		RETURNING `+subscriptionLifecycleSelect,
		subscriptionID, input.Reason, compensationStatus, correlationID, current.Version))
	if err != nil {
		return nil, nil, err
	}
	if err := appendSubscriptionLifecycleEvent(ctx, tx, subscriptionID, input.ClientID,
		"cancelled", "active", "cancelled", "", "", idempotencyKey,
		correlationID, input.ClientID, map[string]any{"reason": input.Reason}); err != nil {
		return nil, nil, err
	}
	if compensationStatus == "pending" {
		if err := appendSubscriptionLifecycleEvent(ctx, tx, subscriptionID, input.ClientID,
			"compensation_requested", "cancelled", "cancelled", "", "",
			idempotencyKey+":compensation", correlationID, input.ClientID,
			map[string]any{"reason": input.Reason}); err != nil {
			return nil, nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}
	return updated, compensation, nil
}

func scanSubscriptionCompensation(row interface{ Scan(dest ...any) error }) (*SubscriptionCompensation, error) {
	var item SubscriptionCompensation
	var refundReference, completedAt sql.NullString
	if err := row.Scan(&item.ID, &item.SubscriptionID, &item.ClientID, &item.PaymentSessionID,
		&item.Status, &item.Reason, &refundReference, &item.AmountMinorUnits,
		&item.Currency, &item.CorrelationID, &item.CreatedAt, &item.UpdatedAt, &completedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if refundReference.Valid {
		item.RefundReference = &refundReference.String
	}
	if completedAt.Valid {
		item.CompletedAt = &completedAt.String
	}
	return &item, nil
}

func getSubscriptionCompensationTx(ctx context.Context, tx *sql.Tx, subscriptionID string) (*SubscriptionCompensation, error) {
	return scanSubscriptionCompensation(tx.QueryRowContext(ctx, `SELECT id::TEXT, subscription_id::TEXT,
		client_id, payment_session_id, status, reason, refund_reference, amount_minor_units,
		currency, correlation_id, created_at::TEXT, updated_at::TEXT, completed_at::TEXT
		FROM wlt_subscription_compensations WHERE subscription_id=$1`, subscriptionID))
}

func ExpireDueSubscriptions(ctx context.Context, db *sql.DB, clientID, correlationID string) (int, error) {
	if db == nil {
		return 0, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()
	query := `SELECT ` + subscriptionLifecycleSelect + ` FROM wlt_client_subscriptions
		WHERE status='active' AND ends_at IS NOT NULL AND ends_at <= NOW()`
	args := []any{}
	if strings.TrimSpace(clientID) != "" {
		query += ` AND client_id=$1`
		args = append(args, strings.TrimSpace(clientID))
	}
	query += ` FOR UPDATE SKIP LOCKED`
	rows, err := tx.QueryContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	var due []*SubscriptionLifecycle
	for rows.Next() {
		item, scanErr := scanSubscriptionLifecycle(rows)
		if scanErr != nil {
			return 0, scanErr
		}
		due = append(due, item)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, item := range due {
		if _, err := tx.ExecContext(ctx, `UPDATE wlt_client_subscriptions
			SET status='expired', cancel_at_period_end=FALSE,
			    lifecycle_correlation_id=$2 WHERE id=$1 AND version=$3`,
			item.ID, correlationID, item.Version); err != nil {
			return 0, err
		}
		if err := appendSubscriptionLifecycleEvent(ctx, tx, item.ID, item.ClientID,
			"expired", "active", "expired", "", "",
			"subscription-expire:"+item.ID+":"+stringValue(item.EndsAt),
			correlationID, "wlt-system", nil); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return len(due), nil
}

type ClientLifecycleBenefits struct {
	LoyaltyAccount     *LoyaltyAccount           `json:"loyaltyAccount,omitempty"`
	ActiveSubscription *SubscriptionLifecycle    `json:"activeSubscription,omitempty"`
	Compensation       *SubscriptionCompensation `json:"compensation,omitempty"`
}

func GetClientLifecycleBenefits(ctx context.Context, db *sql.DB, clientID, correlationID string) (*ClientLifecycleBenefits, error) {
	clientID = strings.TrimSpace(clientID)
	if db == nil || clientID == "" {
		return nil, ErrInvalid
	}
	if _, err := ExpireDueSubscriptions(ctx, db, clientID, correlationID); err != nil {
		return nil, err
	}
	benefits := &ClientLifecycleBenefits{}
	var account LoyaltyAccount
	var tier sql.NullString
	err := db.QueryRowContext(ctx, `SELECT client_id, points_balance, lifetime_points,
		tier_reference, updated_at::TEXT FROM wlt_loyalty_accounts WHERE client_id=$1`, clientID).
		Scan(&account.ClientID, &account.PointsBalance, &account.LifetimePoints, &tier, &account.UpdatedAt)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		if tier.Valid {
			account.TierReference = &tier.String
		}
		benefits.LoyaltyAccount = &account
	}
	active, activeErr := scanSubscriptionLifecycle(db.QueryRowContext(ctx,
		`SELECT `+subscriptionLifecycleSelect+` FROM wlt_client_subscriptions
		 WHERE client_id=$1 AND status='active' AND (ends_at IS NULL OR ends_at > NOW())
		 ORDER BY starts_at DESC LIMIT 1`, clientID))
	if activeErr != nil && !errors.Is(activeErr, ErrNotFound) {
		return nil, activeErr
	}
	if activeErr == nil {
		benefits.ActiveSubscription = active
	}
	compensation, compensationErr := scanSubscriptionCompensation(db.QueryRowContext(ctx,
		`SELECT c.id::TEXT, c.subscription_id::TEXT, c.client_id, c.payment_session_id,
		 c.status, c.reason, c.refund_reference, c.amount_minor_units, c.currency,
		 c.correlation_id, c.created_at::TEXT, c.updated_at::TEXT, c.completed_at::TEXT
		 FROM wlt_subscription_compensations c
		 WHERE c.client_id=$1 AND c.status IN ('pending','failed')
		 ORDER BY c.created_at DESC LIMIT 1`, clientID))
	if compensationErr != nil && !errors.Is(compensationErr, ErrNotFound) {
		return nil, compensationErr
	}
	if compensationErr == nil {
		benefits.Compensation = compensation
	}
	return benefits, nil
}

func HandleActivateSubscriptionLifecycle(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idempotencyKey, correlationID, ok := requiredLifecycleHeaders(r)
		if !ok {
			shared.SendError(w, http.StatusBadRequest, "MISSING_MUTATION_HEADERS", "Idempotency-Key and X-Correlation-ID are required")
			return
		}
		var input ActivateSubscriptionLifecycleInput
		if !decodeJSON(w, r, &input) {
			return
		}
		item, err := ActivateSubscriptionLifecycleGoverned(r.Context(), db, input, idempotencyKey, correlationID)
		if err != nil {
			writeLifecycleError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"subscription": item})
	}
}

func HandleRenewSubscriptionLifecycle(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idempotencyKey, correlationID, ok := requiredLifecycleHeaders(r)
		if !ok {
			shared.SendError(w, http.StatusBadRequest, "MISSING_MUTATION_HEADERS", "Idempotency-Key and X-Correlation-ID are required")
			return
		}
		var input RenewSubscriptionLifecycleInput
		if !decodeJSON(w, r, &input) {
			return
		}
		item, err := RenewSubscriptionLifecycleGoverned(r.Context(), db,
			r.PathValue("subscriptionId"), input, idempotencyKey, correlationID)
		if err != nil {
			writeLifecycleError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"subscription": item})
	}
}

func HandleCancelSubscriptionLifecycle(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idempotencyKey, correlationID, ok := requiredLifecycleHeaders(r)
		if !ok {
			shared.SendError(w, http.StatusBadRequest, "MISSING_MUTATION_HEADERS", "Idempotency-Key and X-Correlation-ID are required")
			return
		}
		var input CancelSubscriptionLifecycleInput
		if !decodeJSON(w, r, &input) {
			return
		}
		item, compensation, err := CancelSubscriptionLifecycleGoverned(r.Context(), db,
			r.PathValue("subscriptionId"), input, idempotencyKey, correlationID)
		if err != nil {
			writeLifecycleError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{
			"subscription": item,
			"compensation": compensation,
		})
	}
}

func HandleExpireDueSubscriptions(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, correlationID, ok := requiredLifecycleHeaders(r)
		if !ok {
			shared.SendError(w, http.StatusBadRequest, "MISSING_MUTATION_HEADERS", "Idempotency-Key and X-Correlation-ID are required")
			return
		}
		count, err := ExpireDueSubscriptions(r.Context(), db, "", correlationID)
		if err != nil {
			writeLifecycleError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"expiredCount": count})
	}
}

func HandleGetSubscriptionLifecycle(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		item, err := GetSubscriptionLifecycle(r.Context(), db, r.PathValue("subscriptionId"))
		if err != nil {
			writeLifecycleError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"subscription": item})
	}
}

func HandleGetClientBenefitsGoverned(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
		if correlationID == "" {
			correlationID = "benefits-read:" + strings.TrimSpace(r.PathValue("clientId"))
		}
		benefits, err := GetClientLifecycleBenefits(r.Context(), db,
			r.PathValue("clientId"), correlationID)
		if err != nil {
			writeLifecycleError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"benefits": benefits})
	}
}

func writeLifecycleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrCancellationReason):
		shared.SendError(w, http.StatusBadRequest, "CANCELLATION_REASON_REQUIRED", err.Error())
	case errors.Is(err, ErrSubscriptionNotActive):
		shared.SendError(w, http.StatusConflict, "SUBSCRIPTION_NOT_ACTIVE", err.Error())
	case errors.Is(err, ErrSubscriptionExpired):
		shared.SendError(w, http.StatusConflict, "SUBSCRIPTION_EXPIRED", err.Error())
	default:
		writeError(w, err)
	}
}
