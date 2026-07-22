package http

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/marketing"
	wltclient "dsh-api/internal/wlt"
	"dsh-api/internal/store"

	"github.com/google/uuid"
)

type governedSubscriptionPurchase struct {
	ID                       string
	ClientID                 string
	SubscriptionPlanID       string
	WLTProductReference      string
	WLTSubscriptionID        *string
	WLTPaymentSessionID      *string
	RenewalOfPurchaseID      *string
	IdempotencyKey           string
	CorrelationID            string
	Status                   string
	PlanVersion              int
	PlanName                 string
	PlanPriceMinorUnits      int64
	PlanCurrency             string
	PlanDurationDays         int
	PlanDeliveryDiscountBps  int
	PlanFreeDeliveryMinMinor *int64
	PlanPrioritySupport      bool
	PlanBenefits             []byte
	ActivatedAt              *time.Time
	ExpiresAt                *time.Time
	CancelledAt              *time.Time
	FailureCode              *string
	Version                  int
	CreatedAt                time.Time
	UpdatedAt                time.Time
}

const governedSubscriptionPurchaseSelect = `
	id::text, client_id, subscription_plan_id::text, wlt_product_reference,
	wlt_subscription_id, wlt_payment_session_id, renewal_of_purchase_id::text,
	idempotency_key, correlation_id, status, plan_version, plan_name,
	plan_price_minor_units, plan_currency, plan_duration_days,
	plan_delivery_discount_bps, plan_free_delivery_min_minor,
	plan_priority_support, plan_benefits, activated_at, expires_at, cancelled_at,
	failure_code, version, created_at, updated_at`

func scanGovernedSubscriptionPurchase(row interface{ Scan(...any) error }) (*governedSubscriptionPurchase, error) {
	var item governedSubscriptionPurchase
	if err := row.Scan(
		&item.ID, &item.ClientID, &item.SubscriptionPlanID, &item.WLTProductReference,
		&item.WLTSubscriptionID, &item.WLTPaymentSessionID, &item.RenewalOfPurchaseID,
		&item.IdempotencyKey, &item.CorrelationID, &item.Status, &item.PlanVersion,
		&item.PlanName, &item.PlanPriceMinorUnits, &item.PlanCurrency,
		&item.PlanDurationDays, &item.PlanDeliveryDiscountBps,
		&item.PlanFreeDeliveryMinMinor, &item.PlanPrioritySupport, &item.PlanBenefits,
		&item.ActivatedAt, &item.ExpiresAt, &item.CancelledAt, &item.FailureCode,
		&item.Version, &item.CreatedAt, &item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &item, nil
}

func marshalGovernedSubscriptionPurchase(item *governedSubscriptionPurchase) map[string]any {
	var benefits any = []any{}
	if len(item.PlanBenefits) > 0 {
		_ = json.Unmarshal(item.PlanBenefits, &benefits)
	}
	return map[string]any{
		"id":                       item.ID,
		"clientId":                 item.ClientID,
		"subscriptionPlanId":       item.SubscriptionPlanID,
		"wltProductReference":      item.WLTProductReference,
		"wltSubscriptionId":        item.WLTSubscriptionID,
		"wltPaymentSessionId":      item.WLTPaymentSessionID,
		"renewalOfPurchaseId":      item.RenewalOfPurchaseID,
		"status":                   item.Status,
		"planVersion":              item.PlanVersion,
		"planName":                 item.PlanName,
		"planPriceMinorUnits":      item.PlanPriceMinorUnits,
		"planCurrency":             item.PlanCurrency,
		"planDurationDays":         item.PlanDurationDays,
		"planDeliveryDiscountBps":  item.PlanDeliveryDiscountBps,
		"planFreeDeliveryMinMinor": item.PlanFreeDeliveryMinMinor,
		"planPrioritySupport":      item.PlanPrioritySupport,
		"planBenefits":             benefits,
		"activatedAt":              item.ActivatedAt,
		"expiresAt":                item.ExpiresAt,
		"cancelledAt":              item.CancelledAt,
		"failureCode":              item.FailureCode,
		"version":                  item.Version,
		"createdAt":                item.CreatedAt,
		"updatedAt":                item.UpdatedAt,
	}
}

func requireGovernedSubscriptionHeaders(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if idempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key is required")
		return "", "", false
	}
	if correlationID == "" {
		store.SendError(w, http.StatusBadRequest, "MISSING_CORRELATION_ID", "X-Correlation-ID is required")
		return "", "", false
	}
	return idempotencyKey, correlationID, true
}

func hashGovernedSubscriptionInput(parts ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(parts, "\x1f")))
	return hex.EncodeToString(sum[:])
}

func wltProductMatchesPlan(product *wltclient.CommercialProduct, plan marketing.SubscriptionPlan) bool {
	return product.ProductReference == plan.WLTProductReference &&
		product.PriceMinorUnits == plan.PriceMinorUnits &&
		strings.EqualFold(product.Currency, plan.Currency) &&
		product.DurationDays == plan.DurationDays &&
		product.DeliveryDiscountBps == plan.DeliveryDiscountBps &&
		product.FreeDeliveryMinMinor == plan.FreeDeliveryMinMinor &&
		product.PrioritySupport == plan.PrioritySupport
}

func appendGovernedSubscriptionEvent(
	tx *sql.Tx,
	purchase *governedSubscriptionPurchase,
	eventType, fromStatus, toStatus, idempotencyKey, correlationID, actorID string,
	payload map[string]any,
) error {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`
		INSERT INTO dsh_subscription_purchase_events (
			purchase_id, event_type, from_status, to_status, actor_id,
			idempotency_key, correlation_id, payload
		) VALUES ($1::uuid,$2,NULLIF($3,''),$4,$5,$6,$7,$8::jsonb)
		ON CONFLICT (purchase_id, event_type, idempotency_key) DO NOTHING`,
		purchase.ID, eventType, fromStatus, toStatus, actorID,
		idempotencyKey, correlationID, string(encoded),
	)
	return err
}

func createGovernedSubscriptionPurchase(
	ctx context.Context,
	s *protectedStoreServer,
	clientID string,
	plan marketing.SubscriptionPlan,
	product *wltclient.CommercialProduct,
	renewalOfPurchaseID *string,
	idempotencyKey, correlationID string,
) (*governedSubscriptionPurchase, *wltclient.PaymentSession, error) {
	inputHash := hashGovernedSubscriptionInput(
		clientID, plan.ID, plan.WLTProductReference,
		fmt.Sprint(plan.Version), fmt.Sprint(plan.PriceMinorUnits), plan.Currency,
		fmt.Sprint(plan.DurationDays), fmt.Sprint(plan.DeliveryDiscountBps),
		fmt.Sprint(plan.FreeDeliveryMinMinor), fmt.Sprint(plan.PrioritySupport),
		string(plan.Benefits), stringValue(renewalOfPurchaseID),
	)
	var existingHash string
	existing, err := scanGovernedSubscriptionPurchase(s.db.QueryRowContext(ctx, `
		SELECT `+governedSubscriptionPurchaseSelect+`, input_hash
		FROM dsh_subscription_purchases
		WHERE client_id=$1 AND idempotency_key=$2`, clientID, idempotencyKey))
	if err == nil {
		row := s.db.QueryRowContext(ctx, `SELECT input_hash FROM dsh_subscription_purchases WHERE id=$1::uuid`, existing.ID)
		if err := row.Scan(&existingHash); err != nil {
			return nil, nil, err
		}
		if existingHash != inputHash {
			return nil, nil, errors.New("SUBSCRIPTION_IDEMPOTENCY_CONFLICT")
		}
		if existing.WLTPaymentSessionID == nil {
			return nil, nil, errors.New("SUBSCRIPTION_PAYMENT_BINDING_INCOMPLETE")
		}
		session, err := s.wlt.GetPaymentSession(ctx, *existing.WLTPaymentSessionID)
		if err != nil {
			return nil, nil, err
		}
		return existing, &wltclient.PaymentSession{
			ID:                session.ID,
			ClientID:          session.ActorID,
			StoreID:           session.StoreID,
			PaymentMethod:     session.Method,
			Status:            session.Status,
			ProviderReference: session.Reference,
			AmountMinorUnits:  session.Amount,
			Currency:          session.Currency,
			CreatedAt:         session.CreatedAt.Format(time.RFC3339),
			UpdatedAt:         session.UpdatedAt.Format(time.RFC3339),
		}, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, nil, err
	}

	purchaseID := uuid.NewString()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	item, err := scanGovernedSubscriptionPurchase(tx.QueryRowContext(ctx, `
		INSERT INTO dsh_subscription_purchases (
			id, client_id, subscription_plan_id, wlt_product_reference,
			renewal_of_purchase_id, idempotency_key, correlation_id, input_hash,
			status, plan_version, plan_name, plan_price_minor_units,
			plan_currency, plan_duration_days, plan_delivery_discount_bps,
			plan_free_delivery_min_minor, plan_priority_support, plan_benefits
		) VALUES (
			$1::uuid,$2,$3::uuid,$4,NULLIF($5,'')::uuid,$6,$7,$8,'initiated',$9,$10,$11,$12,$13,$14,$15,$16::jsonb
		)
		RETURNING `+governedSubscriptionPurchaseSelect,
		purchaseID, clientID, plan.ID, plan.WLTProductReference, stringValue(renewalOfPurchaseID),
		idempotencyKey, correlationID, inputHash, plan.Version, plan.Name,
		plan.PriceMinorUnits, plan.Currency, plan.DurationDays,
		plan.DeliveryDiscountBps, plan.FreeDeliveryMinMinor,
		plan.PrioritySupport, string(plan.Benefits),
	))
	if err != nil {
		return nil, nil, err
	}
	if err := appendGovernedSubscriptionEvent(tx, item, "purchase_initiated", "", item.Status,
		idempotencyKey+":initiated", correlationID, clientID,
		map[string]any{"subscriptionPlanId": plan.ID, "wltProductReference": plan.WLTProductReference}); err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}

	session, err := s.wlt.CreateCommercialPaymentSession(ctx, wltclient.CreateCommercialPaymentSessionInput{
		SubscriptionPurchaseID:     item.ID,
		ClientID:                   clientID,
		CommercialProductReference: plan.WLTProductReference,
		StoreID:                    "bthwani-subscriptions",
		CorrelationID:              correlationID,
		IdempotencyKey:             idempotencyKey + ":wlt-payment",
	})
	if err != nil {
		_, _ = s.db.ExecContext(ctx, `
			UPDATE dsh_subscription_purchases
			SET status='payment_handoff_unknown', failure_code='WLT_PAYMENT_SESSION_UNKNOWN', version=version+1, updated_at=NOW()
			WHERE id=$1::uuid AND status='initiated'`, item.ID)
		return nil, nil, err
	}

	tx, err = s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()
	bound, err := scanGovernedSubscriptionPurchase(tx.QueryRowContext(ctx, `
		UPDATE dsh_subscription_purchases
		SET wlt_payment_session_id=$2,
		    status=CASE WHEN renewal_of_purchase_id IS NULL THEN 'pending_payment' ELSE 'renewal_pending_payment' END,
		    failure_code=NULL
		WHERE id=$1 AND status='initiated'
		RETURNING `+governedSubscriptionPurchaseSelect, item.ID, session.ID))
	if err != nil {
		return nil, nil, err
	}
	if err := appendGovernedSubscriptionEvent(tx, bound, "payment_session_bound", "initiated", bound.Status,
		idempotencyKey+":payment-session", correlationID, item.ClientID,
		map[string]any{"wltPaymentSessionId": session.ID}); err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}
	return bound, session, nil
}

func validateGovernedSubscriptionPlan(
	ctx context.Context,
	s *protectedStoreServer,
	planID string,
) (*marketing.SubscriptionPlan, *wltclient.CommercialProduct, error) {
	plan, err := marketing.GetSubscriptionPlan(s.db, strings.TrimSpace(planID))
	if err != nil {
		return nil, nil, err
	}
	if plan.Status != "active" || strings.TrimSpace(plan.WLTProductReference) == "" {
		return nil, nil, errors.New("PLAN_NOT_PURCHASABLE")
	}
	product, err := s.wlt.GetCommercialProduct(ctx, plan.WLTProductReference)
	if err != nil {
		return nil, nil, err
	}
	if product.Status != "active" || !wltProductMatchesPlan(product, plan) {
		return nil, nil, errors.New("PLAN_TERMS_MISMATCH")
	}
	return &plan, product, nil
}

func writeGovernedSubscriptionValidationError(w http.ResponseWriter, err error) {
	switch err.Error() {
	case "PLAN_NOT_PURCHASABLE":
		store.SendError(w, http.StatusConflict, "PLAN_NOT_PURCHASABLE", "subscription plan is not active and financially linked")
	case "PLAN_TERMS_MISMATCH":
		store.SendError(w, http.StatusConflict, "PLAN_TERMS_MISMATCH", "DSH plan terms do not match the active WLT product")
	default:
		writeCommercialProgramError(w, err, "subscription plan not found")
	}
}

func (s *protectedStoreServer) handleCreateGovernedSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	idempotencyKey, correlationID, ok := requireGovernedSubscriptionHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		SubscriptionPlanID string `json:"subscriptionPlanId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	plan, product, err := validateGovernedSubscriptionPlan(r.Context(), s, body.SubscriptionPlanID)
	if err != nil {
		writeGovernedSubscriptionValidationError(w, err)
		return
	}
	purchase, session, err := createGovernedSubscriptionPurchase(
		r.Context(), s, actor.ID, *plan, product, nil, idempotencyKey, correlationID,
	)
	if err != nil {
		writeCommercialProgramError(w, err, "subscription purchase failed")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{
		"purchase":       marshalGovernedSubscriptionPurchase(purchase),
		"paymentSession": session,
	})
}
