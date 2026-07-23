package http

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

type refundCommandCreate struct {
	PaymentSessionID     string `json:"paymentSessionId"`
	OrderID              string `json:"orderId"`
	ClientID             string `json:"clientId"`
	AmountMinorUnits     int64  `json:"amountMinorUnits"`
	Reason               string `json:"reason"`
	EligibilityReference string `json:"eligibilityReference"`
}

type refundCommandDecision struct {
	Reason string `json:"reason"`
}

type refundCommandReconcile struct {
	ResolutionAction  string `json:"resolutionAction"`
	EvidenceNote      string `json:"evidenceNote"`
	ProviderReference string `json:"providerReference"`
}

type privacyRefund struct {
	ID               string  `json:"id"`
	OrderID          string  `json:"orderId"`
	AmountMinorUnits int64   `json:"amountMinorUnits"`
	Currency         string  `json:"currency"`
	Status           string  `json:"status"`
	ResolvedAt       *string `json:"resolvedAt,omitempty"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

type refundReadEnvelope struct {
	Refunds []struct {
		ID               string  `json:"id"`
		OrderID          string  `json:"orderId"`
		AmountMinorUnits int64   `json:"amountMinorUnits"`
		Currency         string  `json:"currency"`
		Status           string  `json:"status"`
		ResolvedAt       *string `json:"resolvedAt"`
		CreatedAt        string  `json:"createdAt"`
		UpdatedAt        string  `json:"updatedAt"`
	} `json:"refunds"`
}

func refundHash(parts ...string) string {
	h := sha256.Sum256([]byte(strings.Join(parts, "\x1f")))
	return hex.EncodeToString(h[:])
}

func refundRequestIdentity(r *http.Request, fallbackParts ...string) (string, string) {
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	digest := refundHash(fallbackParts...)
	if correlationID == "" {
		correlationID = "refund-" + digest[:24]
	}
	if idempotencyKey == "" {
		idempotencyKey = "refund-" + digest
	}
	return correlationID, idempotencyKey
}

func writeWltProxyResponse(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) writeRefundCommand(w http.ResponseWriter, r *http.Request, path, tenantID, idempotencyKey string, body []byte) {
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		correlationID = "refund-" + refundHash(path, tenantID, string(body))[:24]
	}
	status, responseBody, err := s.wlt.FinanceRefundWrite(r.Context(), path, body, correlationID, idempotencyKey, tenantID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT refund command failed")
		return
	}
	writeWltProxyResponse(w, status, responseBody)
}

// POST /dsh/control-panel/finance/refunds
func (s *protectedStoreServer) handleCreateFinanceRefund(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	tenantID, ok := requiredPaymentTenant(w, r, actor.TenantID)
	if !ok {
		return
	}
	var input refundCommandCreate
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.EligibilityReference = strings.TrimSpace(input.EligibilityReference)
	if input.PaymentSessionID == "" || input.OrderID == "" || input.ClientID == "" || input.Reason == "" || input.EligibilityReference == "" || input.AmountMinorUnits <= 0 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "paymentSessionId, orderId, clientId, reason, eligibilityReference and a positive amountMinorUnits are required")
		return
	}
	body, _ := json.Marshal(map[string]any{
		"tenantId": tenantID, "paymentSessionId": input.PaymentSessionID, "orderId": input.OrderID,
		"clientId": input.ClientID, "amountMinorUnits": input.AmountMinorUnits, "reason": input.Reason,
		"eligibilityReference": input.EligibilityReference, "requestedByOperatorId": actor.ID,
	})
	correlationID, idempotencyKey := refundRequestIdentity(r, tenantID, input.PaymentSessionID, input.OrderID, input.ClientID, fmt.Sprint(input.AmountMinorUnits), input.Reason, input.EligibilityReference, actor.ID)
	r.Header.Set("X-Correlation-ID", correlationID)
	s.writeRefundCommand(w, r, "/wlt/refunds", tenantID, idempotencyKey, body)
}

func (s *protectedStoreServer) refundDecisionCommand(w http.ResponseWriter, r *http.Request, action string) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	tenantID, ok := requiredPaymentTenant(w, r, actor.TenantID)
	if !ok {
		return
	}
	refundID := strings.TrimSpace(r.PathValue("refundId"))
	if refundID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "refundId is required")
		return
	}
	var input refundCommandDecision
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	input.Reason = strings.TrimSpace(input.Reason)
	if input.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
		return
	}
	body, _ := json.Marshal(map[string]string{"operatorId": actor.ID, "reason": input.Reason})
	correlationID, idempotencyKey := refundRequestIdentity(r, tenantID, refundID, action, actor.ID, input.Reason)
	r.Header.Set("X-Correlation-ID", correlationID)
	s.writeRefundCommand(w, r, "/wlt/refunds/"+url.PathEscape(refundID)+"/"+action, tenantID, idempotencyKey, body)
}

func (s *protectedStoreServer) handleApproveFinanceRefund(w http.ResponseWriter, r *http.Request) {
	s.refundDecisionCommand(w, r, "approve")
}

func (s *protectedStoreServer) handleRejectFinanceRefund(w http.ResponseWriter, r *http.Request) {
	s.refundDecisionCommand(w, r, "reject")
}

func (s *protectedStoreServer) handleCompleteFinanceRefund(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	tenantID, ok := requiredPaymentTenant(w, r, actor.TenantID)
	if !ok {
		return
	}
	refundID := strings.TrimSpace(r.PathValue("refundId"))
	if refundID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "refundId is required")
		return
	}
	body, _ := json.Marshal(map[string]string{"operatorId": actor.ID})
	correlationID, idempotencyKey := refundRequestIdentity(r, tenantID, refundID, "complete", actor.ID)
	r.Header.Set("X-Correlation-ID", correlationID)
	s.writeRefundCommand(w, r, "/wlt/refunds/"+url.PathEscape(refundID)+"/complete", tenantID, idempotencyKey, body)
}

func (s *protectedStoreServer) handleReconcileFinanceRefund(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	tenantID, ok := requiredPaymentTenant(w, r, actor.TenantID)
	if !ok {
		return
	}
	refundID := strings.TrimSpace(r.PathValue("refundId"))
	if refundID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "refundId is required")
		return
	}
	var input refundCommandReconcile
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	input.ResolutionAction = strings.TrimSpace(input.ResolutionAction)
	input.EvidenceNote = strings.TrimSpace(input.EvidenceNote)
	input.ProviderReference = strings.TrimSpace(input.ProviderReference)
	if input.EvidenceNote == "" || (input.ResolutionAction != "confirmed_success" && input.ResolutionAction != "confirmed_failed") || (input.ResolutionAction == "confirmed_success" && input.ProviderReference == "") {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "resolutionAction, evidenceNote and providerReference for confirmed_success are required")
		return
	}
	body, _ := json.Marshal(map[string]string{
		"operatorId": actor.ID, "resolutionAction": input.ResolutionAction,
		"evidenceNote": input.EvidenceNote, "providerReference": input.ProviderReference,
	})
	correlationID, idempotencyKey := refundRequestIdentity(r, tenantID, refundID, "reconcile", actor.ID, input.ResolutionAction, input.EvidenceNote, input.ProviderReference)
	r.Header.Set("X-Correlation-ID", correlationID)
	s.writeRefundCommand(w, r, "/wlt/refunds/"+url.PathEscape(refundID)+"/reconcile", tenantID, idempotencyKey, body)
}

func (s *protectedStoreServer) handleFinanceRefundAudit(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator")
	if !ok {
		return
	}
	tenantID, ok := requiredPaymentTenant(w, r, actor.TenantID)
	if !ok {
		return
	}
	refundID := strings.TrimSpace(r.PathValue("refundId"))
	if refundID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "refundId is required")
		return
	}
	status, body, err := s.wlt.FinanceReadWithTenant(r.Context(), "/wlt/refunds/"+url.PathEscape(refundID)+"/audit", nil, r.Header.Get("X-Correlation-ID"), tenantID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT refund audit read failed")
		return
	}
	writeWltProxyResponse(w, status, body)
}

func privacyRefunds(body []byte) ([]privacyRefund, error) {
	var envelope refundReadEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, err
	}
	out := make([]privacyRefund, 0, len(envelope.Refunds))
	for _, item := range envelope.Refunds {
		out = append(out, privacyRefund{
			ID: item.ID, OrderID: item.OrderID, AmountMinorUnits: item.AmountMinorUnits,
			Currency: item.Currency, Status: item.Status, ResolvedAt: item.ResolvedAt,
			CreatedAt: item.CreatedAt, UpdatedAt: item.UpdatedAt,
		})
	}
	return out, nil
}

func (s *protectedStoreServer) proxyPrivacyRefunds(w http.ResponseWriter, r *http.Request, tenantID, orderID, clientID string) {
	query := url.Values{"orderId": []string{orderID}}
	if clientID != "" {
		query.Set("clientId", clientID)
	}
	status, body, err := s.wlt.FinanceReadWithTenant(r.Context(), "/wlt/refunds", query, r.Header.Get("X-Correlation-ID"), tenantID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT refund read failed")
		return
	}
	if status < 200 || status >= 300 {
		writeWltProxyResponse(w, status, body)
		return
	}
	items, err := privacyRefunds(body)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_INVALID_RESPONSE", "WLT refund response was invalid")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"refunds": items})
}

// Native clients do not supply a trusted tenant header. The tenant is derived
// from the authenticated actor's owned order before WLT is queried.
func (s *protectedStoreServer) handleClientOrderRefunds(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	orderID := strings.TrimSpace(r.PathValue("orderId"))
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	var tenantID string
	if err := s.db.QueryRowContext(r.Context(), `
		SELECT tenant_id FROM dsh_orders
		WHERE id=$1::uuid AND client_id=$2`, orderID, actor.ID).Scan(&tenantID); err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found for client")
		return
	}
	s.proxyPrivacyRefunds(w, r, tenantID, orderID, actor.ID)
}

func (s *protectedStoreServer) handlePartnerOrderRefunds(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	orderID := strings.TrimSpace(r.PathValue("orderId"))
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	var tenantID string
	if err := s.db.QueryRowContext(r.Context(), `
		SELECT tenant_id FROM dsh_orders
		WHERE id=$1::uuid AND store_id=$2`, orderID, storeID).Scan(&tenantID); err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found for partner store")
		return
	}
	s.proxyPrivacyRefunds(w, r, tenantID, orderID, "")
}
