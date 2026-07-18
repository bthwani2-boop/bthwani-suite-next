package http

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/marketing"
	"dsh-api/internal/store"
	wltclient "dsh-api/internal/wlt"
)

type subscriptionPurchase struct {
	ID                  string `json:"id"`
	TenantID            string `json:"tenantId"`
	ClientID            string `json:"clientId"`
	PlanID              string `json:"planId"`
	WLTProductReference string `json:"wltProductReference"`
	WLTPaymentSessionID string `json:"wltPaymentSessionId"`
	PaymentMethod       string `json:"paymentMethod"`
	Status              string `json:"status"`
	FailureCode         string `json:"failureCode,omitempty"`
	ActivatedAt         string `json:"activatedAt,omitempty"`
	CreatedAt           string `json:"createdAt"`
	UpdatedAt           string `json:"updatedAt"`
}

const subscriptionPurchaseSelect = `id, tenant_id, client_id, plan_id::TEXT,
	wlt_product_reference, wlt_payment_session_id, payment_method, status,
	COALESCE(failure_code,''), COALESCE(activated_at::TEXT,''), created_at::TEXT, updated_at::TEXT`

func scanSubscriptionPurchase(row interface{ Scan(dest ...any) error }) (*subscriptionPurchase, error) {
	var purchase subscriptionPurchase
	if err := row.Scan(
		&purchase.ID,
		&purchase.TenantID,
		&purchase.ClientID,
		&purchase.PlanID,
		&purchase.WLTProductReference,
		&purchase.WLTPaymentSessionID,
		&purchase.PaymentMethod,
		&purchase.Status,
		&purchase.FailureCode,
		&purchase.ActivatedAt,
		&purchase.CreatedAt,
		&purchase.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &purchase, nil
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

func (s *protectedStoreServer) getSubscriptionPurchase(
	tenantID string,
	clientID string,
	purchaseID string,
) (*subscriptionPurchase, error) {
	purchase, err := scanSubscriptionPurchase(s.db.QueryRow(`SELECT `+subscriptionPurchaseSelect+`
		FROM dsh_subscription_purchases
		WHERE id=$1 AND tenant_id=$2 AND client_id=$3`, purchaseID, tenantID, clientID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, marketing.ErrNotFound
	}
	return purchase, err
}

func (s *protectedStoreServer) getSubscriptionPurchaseByIdempotency(
	tenantID string,
	clientID string,
	idempotencyKey string,
) (*subscriptionPurchase, error) {
	purchase, err := scanSubscriptionPurchase(s.db.QueryRow(`SELECT `+subscriptionPurchaseSelect+`
		FROM dsh_subscription_purchases
		WHERE tenant_id=$1 AND client_id=$2 AND idempotency_key=$3`, tenantID, clientID, idempotencyKey))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return purchase, err
}

func writeSubscriptionPurchaseError(w http.ResponseWriter, err error) {
	if errors.Is(err, marketing.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "subscription purchase not found")
		return
	}
	writeWLTCommercialError(w, err, "subscription purchase")
}

// POST /dsh/client/subscription-purchases
func (s *protectedStoreServer) handleCreateSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if idempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key is required")
		return
	}
	if correlationID == "" {
		store.SendError(w, http.StatusBadRequest, "MISSING_CORRELATION_ID", "X-Correlation-ID is required")
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
	plan, err := marketing.GetSubscriptionPlan(s.db, strings.TrimSpace(body.PlanID))
	if err != nil {
		writeCommercialProgramError(w, err, "subscription plan not found")
		return
	}
	if plan.Status != "active" || strings.TrimSpace(plan.WLTProductReference) == "" {
		store.SendError(w, http.StatusConflict, "PLAN_NOT_PURCHASABLE", "subscription plan is not active and financially linked")
		return
	}
	product, err := s.wlt.GetCommercialProduct(r.Context(), plan.WLTProductReference)
	if err != nil {
		writeWLTCommercialError(w, err, "verify WLT subscription product")
		return
	}
	if product.Status != "active" || !wltProductMatchesPlan(product, plan) {
		store.SendError(w, http.StatusConflict, "PLAN_TERMS_MISMATCH", "DSH plan terms do not match the active WLT product")
		return
	}

	tenantID := tenantIDForActor(actor)
	existing, err := s.getSubscriptionPurchaseByIdempotency(tenantID, actor.ID, idempotencyKey)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve subscription purchase idempotency")
		return
	}
	if existing != nil {
		if existing.PlanID != plan.ID || existing.PaymentMethod != paymentMethod {
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used for a different subscription purchase")
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"purchase": existing})
		return
	}

	purchaseID := deterministicSubscriptionPurchaseID(tenantID, actor.ID, idempotencyKey)
	session, err := s.wlt.CreateBoundSubscriptionPaymentSession(r.Context(), wltclient.BoundSubscriptionPaymentInput{
		SubscriptionPurchaseID: purchaseID,
		ProductReference:       product.Reference,
		TenantID:              tenantID,
		ClientID:              actor.ID,
		PaymentMethod:         paymentMethod,
		AmountMinorUnits:      product.PriceMinorUnits,
		Currency:              product.Currency,
	}, idempotencyKey, correlationID)
	if err != nil {
		writeWLTCommercialError(w, err, "create WLT subscription payment session")
		return
	}

	purchase, err := scanSubscriptionPurchase(s.db.QueryRow(`
		INSERT INTO dsh_subscription_purchases
			(id, tenant_id, client_id, plan_id, wlt_product_reference,
			 wlt_payment_session_id, payment_method, status, idempotency_key, correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_payment',$8,$9)
		RETURNING `+subscriptionPurchaseSelect,
		purchaseID,
		tenantID,
		actor.ID,
		plan.ID,
		plan.WLTProductReference,
		session.ID,
		paymentMethod,
		idempotencyKey,
		correlationID,
	))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to persist subscription purchase")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"purchase": purchase, "paymentSession": session})
}

// GET /dsh/client/subscription-purchases/{purchaseId}
func (s *protectedStoreServer) handleGetSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	tenantID := tenantIDForActor(actor)
	purchase, err := s.getSubscriptionPurchase(tenantID, actor.ID, r.PathValue("purchaseId"))
	if err != nil {
		writeSubscriptionPurchaseError(w, err)
		return
	}
	session, err := s.wlt.GetSubscriptionPaymentSession(r.Context(), purchase.WLTPaymentSessionID)
	if err != nil {
		writeWLTCommercialError(w, err, "load WLT subscription payment session")
		return
	}
	if session.ClientID != actor.ID || stringValue(session.SubscriptionPurchaseID) != purchase.ID || stringValue(session.CommercialProductReference) != purchase.WLTProductReference {
		store.SendError(w, http.StatusBadGateway, "PAYMENT_SESSION_INTEGRITY_ERROR", "WLT payment session does not match the DSH purchase")
		return
	}
	if session.Status == "captured" && purchase.Status == "pending_payment" {
		updated, updateErr := scanSubscriptionPurchase(s.db.QueryRow(`UPDATE dsh_subscription_purchases
			SET status='payment_captured', updated_at=NOW()
			WHERE id=$1 AND status='pending_payment'
			RETURNING `+subscriptionPurchaseSelect, purchase.ID))
		if updateErr == nil {
			purchase = updated
		}
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"purchase": purchase, "paymentSession": session})
}

// POST /dsh/client/subscription-purchases/{purchaseId}/activate
func (s *protectedStoreServer) handleActivateSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	tenantID := tenantIDForActor(actor)
	purchase, err := s.getSubscriptionPurchase(tenantID, actor.ID, r.PathValue("purchaseId"))
	if err != nil {
		writeSubscriptionPurchaseError(w, err)
		return
	}
	if purchase.Status == "active" {
		store.SendJSON(w, http.StatusOK, map[string]any{"purchase": purchase})
		return
	}
	session, err := s.wlt.GetSubscriptionPaymentSession(r.Context(), purchase.WLTPaymentSessionID)
	if err != nil {
		writeWLTCommercialError(w, err, "load WLT subscription payment session")
		return
	}
	if session.Status != "captured" {
		store.SendError(w, http.StatusConflict, "PAYMENT_NOT_CAPTURED", "subscription payment must be captured before activation")
		return
	}
	if session.ClientID != actor.ID || stringValue(session.SubscriptionPurchaseID) != purchase.ID || stringValue(session.CommercialProductReference) != purchase.WLTProductReference {
		store.SendError(w, http.StatusBadGateway, "PAYMENT_SESSION_INTEGRITY_ERROR", "WLT payment session does not match the DSH purchase")
		return
	}
	subscription, err := s.wlt.ActivateCommercialSubscription(r.Context(), wltclient.ActivateCommercialSubscriptionInput{
		ClientID:               actor.ID,
		ProductReference:       purchase.WLTProductReference,
		PaymentSessionID:       purchase.WLTPaymentSessionID,
		SubscriptionPurchaseID: purchase.ID,
	}, marketingCorrelationID(r))
	if err != nil {
		writeWLTCommercialError(w, err, "activate WLT subscription")
		return
	}
	purchase, err = scanSubscriptionPurchase(s.db.QueryRow(`UPDATE dsh_subscription_purchases
		SET status='active', activated_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND status IN ('pending_payment','payment_captured')
		RETURNING `+subscriptionPurchaseSelect, purchase.ID))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "WLT subscription activated but DSH workflow state could not be updated")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"purchase": purchase, "subscription": subscription})
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}
