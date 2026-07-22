package http

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/marketing"
	"dsh-api/internal/store"
	wltclient "dsh-api/internal/wlt"
)

type subscriptionPurchase struct {
	ID                    string `json:"id"`
	TenantID              string `json:"tenantId"`
	ClientID              string `json:"clientId"`
	PlanID                string `json:"planId"`
	WLTProductReference   string `json:"wltProductReference"`
	WLTPaymentSessionID   string `json:"wltPaymentSessionId,omitempty"`
	WLTSubscriptionID     string `json:"wltSubscriptionId,omitempty"`
	RenewalOfPurchaseID   string `json:"renewalOfPurchaseId,omitempty"`
	PaymentMethod         string `json:"paymentMethod"`
	Status                string `json:"status"`
	LifecycleVersion      int    `json:"lifecycleVersion"`
	FailureCode           string `json:"failureCode,omitempty"`
	ActivatedAt           string `json:"activatedAt,omitempty"`
	ExpiresAt             string `json:"expiresAt,omitempty"`
	CancelledAt           string `json:"cancelledAt,omitempty"`
	CancellationReason    string `json:"cancellationReason,omitempty"`
	CompensationStatus    string `json:"compensationStatus"`
	CompensationReference string `json:"compensationReference,omitempty"`
	CreatedAt             string `json:"createdAt"`
	UpdatedAt             string `json:"updatedAt"`
}

const subscriptionPurchaseSelect = `id, tenant_id, client_id, plan_id::TEXT,
	wlt_product_reference, wlt_payment_session_id, wlt_subscription_id,
	renewal_of_purchase_id, payment_method, status, lifecycle_version,
	failure_code, activated_at::TEXT, expires_at::TEXT, cancelled_at::TEXT,
	cancellation_reason, compensation_status, compensation_reference,
	created_at::TEXT, updated_at::TEXT`

func scanSubscriptionPurchase(row interface{ Scan(dest ...any) error }) (*subscriptionPurchase, error) {
	var item subscriptionPurchase
	var paymentSessionID, subscriptionID, renewalOf, failureCode sql.NullString
	var activatedAt, expiresAt, cancelledAt, cancellationReason sql.NullString
	var compensationReference sql.NullString
	if err := row.Scan(
		&item.ID,
		&item.TenantID,
		&item.ClientID,
		&item.PlanID,
		&item.WLTProductReference,
		&paymentSessionID,
		&subscriptionID,
		&renewalOf,
		&item.PaymentMethod,
		&item.Status,
		&item.LifecycleVersion,
		&failureCode,
		&activatedAt,
		&expiresAt,
		&cancelledAt,
		&cancellationReason,
		&item.CompensationStatus,
		&compensationReference,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	item.WLTPaymentSessionID = subscriptionNullString(paymentSessionID)
	item.WLTSubscriptionID = subscriptionNullString(subscriptionID)
	item.RenewalOfPurchaseID = subscriptionNullString(renewalOf)
	item.FailureCode = subscriptionNullString(failureCode)
	item.ActivatedAt = subscriptionNullString(activatedAt)
	item.ExpiresAt = subscriptionNullString(expiresAt)
	item.CancelledAt = subscriptionNullString(cancelledAt)
	item.CancellationReason = subscriptionNullString(cancellationReason)
	item.CompensationReference = subscriptionNullString(compensationReference)
	return &item, nil
}

func subscriptionNullString(value sql.NullString) string {
	if !value.Valid {
		return ""
	}
	return strings.TrimSpace(value.String)
}

func deterministicSubscriptionPurchaseID(tenantID, clientID, idempotencyKey string) string {
	digest := sha256.Sum256([]byte(tenantID + "\x00" + clientID + "\x00" + idempotencyKey))
	return "subp-" + hex.EncodeToString(digest[:16])
}

func normalizeSubscriptionPaymentMethod(value string) (string, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "official_wallet", true
	}
	switch value {
	case "wallet", "mixed", "official_wallet":
		return value, true
	default:
		return "", false
	}
}

func requireSubscriptionMutationHeaders(w http.ResponseWriter, r *http.Request) (string, string, bool) {
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

func (s *protectedStoreServer) getSubscriptionPurchase(
	tenantID string,
	clientID string,
	purchaseID string,
) (*subscriptionPurchase, error) {
	item, err := scanSubscriptionPurchase(s.db.QueryRow(`SELECT `+subscriptionPurchaseSelect+`
		FROM dsh_subscription_purchases
		WHERE id=$1 AND tenant_id=$2 AND client_id=$3`, purchaseID, tenantID, clientID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, marketing.ErrNotFound
	}
	return item, err
}

func (s *protectedStoreServer) getSubscriptionPurchaseByIdempotency(
	tenantID string,
	clientID string,
	idempotencyKey string,
) (*subscriptionPurchase, error) {
	item, err := scanSubscriptionPurchase(s.db.QueryRow(`SELECT `+subscriptionPurchaseSelect+`
		FROM dsh_subscription_purchases
		WHERE tenant_id=$1 AND client_id=$2 AND idempotency_key=$3`, tenantID, clientID, idempotencyKey))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return item, err
}

func (s *protectedStoreServer) getSubscriptionPurchaseByWLTSubscription(
	tenantID string,
	clientID string,
	subscriptionID string,
) (*subscriptionPurchase, error) {
	item, err := scanSubscriptionPurchase(s.db.QueryRow(`SELECT `+subscriptionPurchaseSelect+`
		FROM dsh_subscription_purchases
		WHERE tenant_id=$1 AND client_id=$2 AND wlt_subscription_id=$3
		ORDER BY CASE WHEN renewal_of_purchase_id IS NULL THEN 0 ELSE 1 END, created_at
		LIMIT 1`, tenantID, clientID, subscriptionID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, marketing.ErrNotFound
	}
	return item, err
}

func writeSubscriptionPurchaseError(w http.ResponseWriter, err error) {
	if errors.Is(err, marketing.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "subscription purchase not found")
		return
	}
	writeWLTCommercialError(w, err, "subscription purchase")
}

func appendSubscriptionLifecycleEvent(
	tx *sql.Tx,
	item *subscriptionPurchase,
	eventType, fromStatus, toStatus, idempotencyKey, correlationID, actorID string,
	metadata map[string]any,
) error {
	if metadata == nil {
		metadata = map[string]any{}
	}
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`INSERT INTO dsh_subscription_lifecycle_events
		(purchase_id, tenant_id, client_id, event_type, from_status, to_status,
		 wlt_payment_session_id, wlt_subscription_id, idempotency_key,
		 correlation_id, actor_id, metadata)
		VALUES ($1,$2,$3,$4,NULLIF($5,''),$6,NULLIF($7,''),NULLIF($8,''),$9,$10,$11,$12)
		ON CONFLICT (purchase_id, idempotency_key, event_type) DO NOTHING`,
		item.ID, item.TenantID, item.ClientID, eventType, fromStatus, toStatus,
		item.WLTPaymentSessionID, item.WLTSubscriptionID, idempotencyKey,
		correlationID, actorID, encoded)
	return err
}

func subscriptionCommercialErrorCode(err error) string {
	var httpError *wltclient.CommercialHTTPError
	if errors.As(err, &httpError) && strings.TrimSpace(httpError.Code) != "" {
		return strings.TrimSpace(httpError.Code)
	}
	return "WLT_UNAVAILABLE"
}

func validateSubscriptionPlan(
	r *http.Request,
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
	product, err := s.wlt.GetCommercialProduct(r.Context(), plan.WLTProductReference)
	if err != nil {
		return nil, nil, err
	}
	if product.Status != "active" || !wltProductMatchesPlan(product, plan) {
		return nil, nil, errors.New("PLAN_TERMS_MISMATCH")
	}
	return plan, product, nil
}

func writeSubscriptionPlanValidationError(w http.ResponseWriter, err error) {
	switch err.Error() {
	case "PLAN_NOT_PURCHASABLE":
		store.SendError(w, http.StatusConflict, "PLAN_NOT_PURCHASABLE", "subscription plan is not active and financially linked")
	case "PLAN_TERMS_MISMATCH":
		store.SendError(w, http.StatusConflict, "PLAN_TERMS_MISMATCH", "DSH plan terms do not match the active WLT product")
	default:
		writeCommercialProgramError(w, err, "subscription plan not found")
	}
}

func (s *protectedStoreServer) initializeSubscriptionPurchase(
	tenantID, clientID string,
	plan *marketing.SubscriptionPlan,
	paymentMethod, idempotencyKey, correlationID, renewalOfPurchaseID string,
) (*subscriptionPurchase, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	item, err := scanSubscriptionPurchase(tx.QueryRow(`INSERT INTO dsh_subscription_purchases
		(id, tenant_id, client_id, plan_id, wlt_product_reference,
		 payment_method, status, idempotency_key, correlation_id, renewal_of_purchase_id)
		VALUES ($1,$2,$3,$4,$5,$6,'initiated',$7,$8,NULLIF($9,''))
		RETURNING `+subscriptionPurchaseSelect,
		deterministicSubscriptionPurchaseID(tenantID, clientID, idempotencyKey),
		tenantID, clientID, plan.ID, plan.WLTProductReference,
		paymentMethod, idempotencyKey, correlationID, renewalOfPurchaseID))
	if err != nil {
		return nil, err
	}
	eventType := "purchase_initiated"
	if renewalOfPurchaseID != "" {
		eventType = "renewal_initiated"
	}
	if err := appendSubscriptionLifecycleEvent(tx, item, eventType, "", "initiated",
		idempotencyKey+":initiated", correlationID, clientID, nil); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *protectedStoreServer) bindSubscriptionPaymentSession(
	r *http.Request,
	item *subscriptionPurchase,
	product *wltclient.CommercialProduct,
	idempotencyKey, correlationID string,
) (*subscriptionPurchase, *wltclient.SubscriptionPaymentSession, error) {
	session, err := s.wlt.CreateBoundSubscriptionPaymentSession(r.Context(), wltclient.BoundSubscriptionPaymentInput{
		SubscriptionPurchaseID: item.ID,
		ProductReference:       product.Reference,
		TenantID:               item.TenantID,
		ClientID:               item.ClientID,
		PaymentMethod:          item.PaymentMethod,
		AmountMinorUnits:       product.PriceMinorUnits,
		Currency:               product.Currency,
	}, idempotencyKey, correlationID)
	if err != nil {
		_, _ = s.db.Exec(`UPDATE dsh_subscription_purchases
			SET failure_code=$2, updated_at=NOW() WHERE id=$1 AND status='initiated'`,
			item.ID, subscriptionCommercialErrorCode(err))
		return nil, nil, err
	}
	tx, err := s.db.Begin()
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = tx.Rollback() }()
	bound, err := scanSubscriptionPurchase(tx.QueryRow(`UPDATE dsh_subscription_purchases
		SET wlt_payment_session_id=$2,
		    status=CASE WHEN renewal_of_purchase_id IS NULL THEN 'pending_payment' ELSE 'renewal_pending_payment' END,
		    failure_code=NULL
		WHERE id=$1 AND status='initiated'
		RETURNING `+subscriptionPurchaseSelect, item.ID, session.ID))
	if err != nil {
		return nil, nil, err
	}
	if err := appendSubscriptionLifecycleEvent(tx, bound, "payment_session_bound", "initiated", bound.Status,
		idempotencyKey+":payment-session", correlationID, item.ClientID,
		map[string]any{"wltPaymentSessionId": session.ID}); err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}
	return bound, session, nil
}

// POST /dsh/client/marketing/subscriptions/purchase
func (s *protectedStoreServer) handleCreateSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	idempotencyKey, correlationID, ok := requireSubscriptionMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		PlanID        string `json:"planId"`
		PaymentMethod string `json:"paymentMethod"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	paymentMethod, valid := normalizeSubscriptionPaymentMethod(body.PaymentMethod)
	if !valid {
		store.SendError(w, http.StatusBadRequest, "INVALID_PAYMENT_METHOD", "subscription payment method is not supported")
		return
	}
	plan, product, err := validateSubscriptionPlan(r, s, body.PlanID)
	if err != nil {
		writeSubscriptionPlanValidationError(w, err)
		return
	}
	tenantID := strings.TrimSpace(actor.TenantID)
	if tenantID == "" {
		store.SendError(w, http.StatusForbidden, "TENANT_REQUIRED", "authenticated client tenant is required")
		return
	}
	item, err := s.getSubscriptionPurchaseByIdempotency(tenantID, actor.ID, idempotencyKey)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve subscription purchase idempotency")
		return
	}
	if item != nil {
		if item.PlanID != plan.ID || item.PaymentMethod != paymentMethod || item.RenewalOfPurchaseID != "" {
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used for a different subscription purchase")
			return
		}
		if item.Status != "initiated" {
			store.SendJSON(w, http.StatusOK, map[string]any{"purchase": item})
			return
		}
	} else {
		item, err = s.initializeSubscriptionPurchase(
			tenantID, actor.ID, plan, paymentMethod, idempotencyKey, correlationID, "")
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to initialize subscription purchase")
			return
		}
	}
	item, session, err := s.bindSubscriptionPaymentSession(r, item, product, idempotencyKey, correlationID)
	if err != nil {
		writeWLTCommercialError(w, err, "create WLT subscription payment session")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"purchase": item, "paymentSession": session})
}

// GET /dsh/client/marketing/subscriptions/purchases/{purchaseId}
func (s *protectedStoreServer) handleGetSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	tenantID := strings.TrimSpace(actor.TenantID)
	if tenantID == "" {
		store.SendError(w, http.StatusForbidden, "TENANT_REQUIRED", "authenticated client tenant is required")
		return
	}
	item, err := s.getSubscriptionPurchase(tenantID, actor.ID, r.PathValue("purchaseId"))
	if err != nil {
		writeSubscriptionPurchaseError(w, err)
		return
	}
	if item.WLTPaymentSessionID == "" {
		store.SendJSON(w, http.StatusOK, map[string]any{"purchase": item})
		return
	}
	session, err := s.wlt.GetSubscriptionPaymentSession(r.Context(), item.WLTPaymentSessionID)
	if err != nil {
		writeWLTCommercialError(w, err, "load WLT subscription payment session")
		return
	}
	if session.ClientID != actor.ID || stringValue(session.SubscriptionPurchaseID) != item.ID ||
		stringValue(session.CommercialProductReference) != item.WLTProductReference {
		store.SendError(w, http.StatusBadGateway, "PAYMENT_SESSION_INTEGRITY_ERROR", "WLT payment session does not match the DSH purchase")
		return
	}
	if session.Status == "captured" && (item.Status == "pending_payment" || item.Status == "renewal_pending_payment") {
		tx, txErr := s.db.Begin()
		if txErr == nil {
			fromStatus := item.Status
			updated, updateErr := scanSubscriptionPurchase(tx.QueryRow(`UPDATE dsh_subscription_purchases
				SET status='payment_captured', failure_code=NULL
				WHERE id=$1 AND status IN ('pending_payment','renewal_pending_payment')
				RETURNING `+subscriptionPurchaseSelect, item.ID))
			if updateErr == nil {
				if appendSubscriptionLifecycleEvent(tx, updated, "payment_captured", fromStatus, "payment_captured",
					item.ID+":captured", item.ID, actor.ID, nil) == nil && tx.Commit() == nil {
					item = updated
				} else {
					_ = tx.Rollback()
				}
			} else {
				_ = tx.Rollback()
			}
		}
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"purchase": item, "paymentSession": session})
}

// POST /dsh/client/marketing/subscriptions/{purchaseId}/activate
func (s *protectedStoreServer) handleActivateSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	idempotencyKey, correlationID, ok := requireSubscriptionMutationHeaders(w, r)
	if !ok {
		return
	}
	tenantID := strings.TrimSpace(actor.TenantID)
	if tenantID == "" {
		store.SendError(w, http.StatusForbidden, "TENANT_REQUIRED", "authenticated client tenant is required")
		return
	}
	item, err := s.getSubscriptionPurchase(tenantID, actor.ID, r.PathValue("purchaseId"))
	if err != nil {
		writeSubscriptionPurchaseError(w, err)
		return
	}
	if item.Status == "active" || item.Status == "renewed" {
		store.SendJSON(w, http.StatusOK, map[string]any{"purchase": item})
		return
	}
	if item.WLTPaymentSessionID == "" {
		store.SendError(w, http.StatusConflict, "PAYMENT_SESSION_REQUIRED", "subscription purchase does not have a bound WLT payment session")
		return
	}
	session, err := s.wlt.GetSubscriptionPaymentSession(r.Context(), item.WLTPaymentSessionID)
	if err != nil {
		writeWLTCommercialError(w, err, "load WLT subscription payment session")
		return
	}
	if session.Status != "captured" {
		store.SendError(w, http.StatusConflict, "PAYMENT_NOT_CAPTURED", "subscription payment must be captured before activation")
		return
	}
	if session.ClientID != actor.ID || stringValue(session.SubscriptionPurchaseID) != item.ID ||
		stringValue(session.CommercialProductReference) != item.WLTProductReference {
		store.SendError(w, http.StatusBadGateway, "PAYMENT_SESSION_INTEGRITY_ERROR", "WLT payment session does not match the DSH purchase")
		return
	}

	var subscription *wltclient.CommercialSubscription
	if item.RenewalOfPurchaseID == "" {
		subscription, err = s.wlt.ActivateCommercialSubscription(r.Context(), wltclient.ActivateCommercialSubscriptionInput{
			ClientID: actor.ID, ProductReference: item.WLTProductReference,
			PaymentSessionID: item.WLTPaymentSessionID, SubscriptionPurchaseID: item.ID,
		}, correlationID)
	} else {
		original, loadErr := s.getSubscriptionPurchase(tenantID, actor.ID, item.RenewalOfPurchaseID)
		if loadErr != nil || original.WLTSubscriptionID == "" {
			store.SendError(w, http.StatusConflict, "SUBSCRIPTION_REFERENCE_REQUIRED", "renewal source does not have an active WLT subscription reference")
			return
		}
		subscription, err = s.wlt.RenewCommercialSubscription(r.Context(), original.WLTSubscriptionID,
			wltclient.RenewCommercialSubscriptionInput{
				ClientID: actor.ID, ProductReference: item.WLTProductReference,
				PaymentSessionID: item.WLTPaymentSessionID, SubscriptionPurchaseID: item.ID,
			}, idempotencyKey, correlationID)
	}
	if err != nil {
		writeWLTCommercialError(w, err, "commit WLT subscription lifecycle")
		return
	}

	fromStatus := item.Status
	tx, err := s.db.Begin()
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "WLT lifecycle committed but DSH transaction could not start")
		return
	}
	defer func() { _ = tx.Rollback() }()
	status := "active"
	eventType := "activated"
	if item.RenewalOfPurchaseID != "" {
		status = "renewed"
		eventType = "renewed"
	}
	item, err = scanSubscriptionPurchase(tx.QueryRow(`UPDATE dsh_subscription_purchases
		SET status=$2, wlt_subscription_id=$3, activated_at=COALESCE(activated_at,NOW()),
		    expires_at=$4, failure_code=NULL
		WHERE id=$1 AND status IN ('pending_payment','payment_captured','renewal_pending_payment')
		RETURNING `+subscriptionPurchaseSelect,
		item.ID, status, subscription.ID, subscription.EndsAt))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "WLT lifecycle committed but DSH workflow state could not be updated")
		return
	}
	if item.RenewalOfPurchaseID != "" {
		_, _ = tx.Exec(`UPDATE dsh_subscription_purchases SET expires_at=$2
			WHERE id=$1 AND wlt_subscription_id=$3`, item.RenewalOfPurchaseID, subscription.EndsAt, subscription.ID)
	}
	if err := appendSubscriptionLifecycleEvent(tx, item, eventType, fromStatus, status,
		idempotencyKey, correlationID, actor.ID,
		map[string]any{"wltSubscriptionId": subscription.ID}); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to append subscription lifecycle evidence")
		return
	}
	if err := tx.Commit(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to commit DSH subscription readback")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"purchase": item, "subscription": subscription})
}

// POST /dsh/client/marketing/subscriptions/{subscriptionId}/renew
func (s *protectedStoreServer) handleRenewSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	idempotencyKey, correlationID, ok := requireSubscriptionMutationHeaders(w, r)
	if !ok {
		return
	}
	tenantID := strings.TrimSpace(actor.TenantID)
	if tenantID == "" {
		store.SendError(w, http.StatusForbidden, "TENANT_REQUIRED", "authenticated client tenant is required")
		return
	}
	subscription, err := s.wlt.GetCommercialSubscriptionLifecycle(r.Context(), r.PathValue("subscriptionId"))
	if err != nil {
		writeWLTCommercialError(w, err, "load WLT subscription lifecycle")
		return
	}
	if subscription.ClientID != actor.ID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "subscription not found")
		return
	}
	if subscription.Status != "active" {
		store.SendError(w, http.StatusConflict, "SUBSCRIPTION_NOT_ACTIVE", "only an active subscription can be renewed")
		return
	}
	original, err := s.getSubscriptionPurchaseByWLTSubscription(tenantID, actor.ID, subscription.ID)
	if err != nil {
		writeSubscriptionPurchaseError(w, err)
		return
	}
	plan, product, err := validateSubscriptionPlan(r, s, original.PlanID)
	if err != nil {
		writeSubscriptionPlanValidationError(w, err)
		return
	}
	var body struct {
		PaymentMethod string `json:"paymentMethod"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	paymentMethod, valid := normalizeSubscriptionPaymentMethod(body.PaymentMethod)
	if !valid {
		store.SendError(w, http.StatusBadRequest, "INVALID_PAYMENT_METHOD", "subscription payment method is not supported")
		return
	}
	item, err := s.getSubscriptionPurchaseByIdempotency(tenantID, actor.ID, idempotencyKey)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve renewal idempotency")
		return
	}
	if item != nil {
		if item.RenewalOfPurchaseID != original.ID || item.PlanID != plan.ID || item.PaymentMethod != paymentMethod {
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used for a different lifecycle action")
			return
		}
		if item.Status != "initiated" {
			store.SendJSON(w, http.StatusOK, map[string]any{"purchase": item})
			return
		}
	} else {
		item, err = s.initializeSubscriptionPurchase(
			tenantID, actor.ID, plan, paymentMethod, idempotencyKey, correlationID, original.ID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to initialize subscription renewal")
			return
		}
	}
	item, session, err := s.bindSubscriptionPaymentSession(r, item, product, idempotencyKey, correlationID)
	if err != nil {
		writeWLTCommercialError(w, err, "create WLT renewal payment session")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"purchase": item, "paymentSession": session})
}

// POST /dsh/client/marketing/subscriptions/{subscriptionId}/cancel
func (s *protectedStoreServer) handleCancelSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	idempotencyKey, correlationID, ok := requireSubscriptionMutationHeaders(w, r)
	if !ok {
		return
	}
	tenantID := strings.TrimSpace(actor.TenantID)
	if tenantID == "" {
		store.SendError(w, http.StatusForbidden, "TENANT_REQUIRED", "authenticated client tenant is required")
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	body.Reason = strings.TrimSpace(body.Reason)
	if body.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "CANCELLATION_REASON_REQUIRED", "cancellation reason is required")
		return
	}
	subscriptionID := strings.TrimSpace(r.PathValue("subscriptionId"))
	current, err := s.wlt.GetCommercialSubscriptionLifecycle(r.Context(), subscriptionID)
	if err != nil {
		writeWLTCommercialError(w, err, "load WLT subscription lifecycle")
		return
	}
	if current.ClientID != actor.ID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "subscription not found")
		return
	}
	original, err := s.getSubscriptionPurchaseByWLTSubscription(tenantID, actor.ID, subscriptionID)
	if err != nil {
		writeSubscriptionPurchaseError(w, err)
		return
	}
	subscription, compensation, err := s.wlt.CancelCommercialSubscription(r.Context(), subscriptionID,
		wltclient.CancelCommercialSubscriptionInput{ClientID: actor.ID, Reason: body.Reason},
		idempotencyKey, correlationID)
	if err != nil {
		writeWLTCommercialError(w, err, "cancel WLT subscription")
		return
	}
	compensationStatus := subscription.CompensationStatus
	compensationReference := subscription.CompensationReference
	if compensation != nil {
		compensationStatus = compensation.Status
		compensationReference = compensation.RefundReference
	}
	targetStatus := "cancelled"
	if compensationStatus == "pending" {
		targetStatus = "compensation_pending"
	}
	tx, err := s.db.Begin()
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "WLT cancellation committed but DSH transaction could not start")
		return
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.Exec(`UPDATE dsh_subscription_purchases
		SET status=$4, cancelled_at=NOW(), cancellation_reason=$5,
		    compensation_status=COALESCE(NULLIF($6,''),'not_required'),
		    compensation_reference=$7, expires_at=$8
		WHERE tenant_id=$1 AND client_id=$2 AND wlt_subscription_id=$3
		  AND status NOT IN ('cancelled','expired','compensated','failed')`,
		tenantID, actor.ID, subscription.ID, targetStatus, body.Reason,
		compensationStatus, compensationReference, subscription.EndsAt); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "WLT cancellation committed but DSH projection update failed")
		return
	}
	fromStatus := original.Status
	original.Status = targetStatus
	original.CancellationReason = body.Reason
	original.CompensationStatus = compensationStatus
	if compensationReference != nil {
		original.CompensationReference = *compensationReference
	}
	if err := appendSubscriptionLifecycleEvent(tx, original, "cancelled", fromStatus, targetStatus,
		idempotencyKey, correlationID, actor.ID,
		map[string]any{"reason": body.Reason, "compensationStatus": compensationStatus}); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to append cancellation evidence")
		return
	}
	if err := tx.Commit(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to commit DSH cancellation readback")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"subscription": subscription,
		"compensation": compensation,
	})
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}
