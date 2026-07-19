package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL      string
	serviceToken string
	http         *http.Client
}

type CreatePaymentSessionInput struct {
	CheckoutIntentID string `json:"checkoutIntentId,omitempty"`
	SpecialRequestID string `json:"specialRequestId,omitempty"`
	TenantID         string `json:"tenantId,omitempty"`
	ClientID         string `json:"clientId"`
	StoreID          string `json:"storeId"`
	PaymentMethod    string `json:"paymentMethod"`
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
	CartSnapshotHash string `json:"cartSnapshotHash"`
	CorrelationID    string `json:"-"`
	IdempotencyKey   string `json:"-"`
}

type PaymentSession struct {
	ID                string `json:"id"`
	CheckoutIntentID  string `json:"checkoutIntentId"`
	SpecialRequestID  string `json:"specialRequestId"`
	TenantID          string `json:"tenantId"`
	ClientID          string `json:"clientId"`
	StoreID           string `json:"storeId"`
	PaymentMethod     string `json:"paymentMethod"`
	Status            string `json:"status"`
	ProviderReference string `json:"providerReference"`
	AmountMinorUnits  int64  `json:"amountMinorUnits"`
	Currency          string `json:"currency"`
	CreatedAt         string `json:"createdAt"`
	UpdatedAt         string `json:"updatedAt"`
}

// NewClient builds a client for calling WLT. serviceToken is the shared
// secret WLT validates via WLT_DSH_SERVICE_TOKEN; it is sent as the bearer
// token on every outbound request alongside X-Service-Caller: dsh.
func NewClient(baseURL, serviceToken string) *Client {
	return &Client{
		baseURL:      strings.TrimRight(baseURL, "/"),
		serviceToken: serviceToken,
		http:         &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.serviceToken != ""
}

func (c *Client) CreatePaymentSession(ctx context.Context, input CreatePaymentSessionInput) (*PaymentSession, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT payment-session handoff is not configured")
	}
	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("encode WLT payment session request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/payment-sessions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build WLT payment session request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if input.TenantID != "" {
		req.Header.Set("X-Tenant-ID", input.TenantID)
	}
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		if input.SpecialRequestID != "" {
			correlationID = input.SpecialRequestID
		} else {
			correlationID = input.CheckoutIntentID
		}
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		if input.SpecialRequestID != "" {
			idempotencyKey = deterministicMutationKey("special-request-payment-session", input.SpecialRequestID)
		} else {
			idempotencyKey = deterministicMutationKey("checkout-payment-session", input.CheckoutIntentID)
		}
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return nil, fmt.Errorf("prepare WLT payment session request: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT payment session: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("WLT payment session returned HTTP %d", response.StatusCode)
	}
	var envelope struct {
		PaymentSession PaymentSession `json:"paymentSession"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT payment session response: %w", err)
	}
	if envelope.PaymentSession.ID == "" {
		return nil, fmt.Errorf("WLT payment session response missing id")
	}
	return &envelope.PaymentSession, nil
}

type NotifyDeliveryCompletedInput struct {
	OrderID          string `json:"orderId"`
	CaptainID        string `json:"captainId"`
	PartnerID        string `json:"partnerId"`
	CheckoutIntentID string `json:"checkoutIntentId"`
	CorrelationID    string `json:"-"`
	IdempotencyKey   string `json:"-"`
}

// NotifyDeliveryCompleted tells WLT a COD order has been delivered so it can
// open its own COD collection record. WLT re-derives the amount from its own
// payment session for the checkout intent; DSH never computes or forwards a
// financial amount. Errors are the caller's to decide whether to retry.
func (c *Client) NotifyDeliveryCompleted(ctx context.Context, input NotifyDeliveryCompletedInput) error {
	if !c.Configured() {
		return fmt.Errorf("WLT payment-session handoff is not configured")
	}
	body, err := json.Marshal(input)
	if err != nil {
		return fmt.Errorf("encode WLT delivery-completed request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/cod-records", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build WLT delivery-completed request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = input.OrderID
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = deterministicMutationKey("cod-record-create", input.OrderID, input.CheckoutIntentID)
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return fmt.Errorf("prepare WLT delivery-completed request: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT delivery-completed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT delivery-completed returned HTTP %d", response.StatusCode)
	}
	return nil
}

type DeliverFieldCommissionInput struct {
	BeneficiaryActorID   string `json:"beneficiaryActorId"`
	BeneficiaryActorType string `json:"beneficiaryActorType"`
	SourceType           string `json:"sourceType"`
	SourceID             string `json:"sourceId"`
	VisitID              string `json:"visitId"`
	StoreID              string `json:"storeId"`
	IdempotencyKey       string `json:"idempotencyKey"`
	CorrelationID        string `json:"-"`
}

// DeliverFieldCommission tells WLT a field agent completed an onboarding
// visit so it can derive the commission amount itself from a commission
// policy and post the effect to the beneficiary's wallet. WLT re-derives the
// amount from its own commission policy for the visit; DSH never computes or
// forwards a financial amount here.
func (c *Client) DeliverFieldCommission(ctx context.Context, input DeliverFieldCommissionInput) error {
	if !c.Configured() {
		return fmt.Errorf("WLT payment-session handoff is not configured")
	}
	if input.BeneficiaryActorType == "" {
		input.BeneficiaryActorType = "field"
	}
	if input.SourceType == "" {
		input.SourceType = "field_visit"
	}
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		input.IdempotencyKey = deterministicMutationKey("field-commission", input.VisitID, input.SourceID, input.BeneficiaryActorID)
	}
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = strings.TrimSpace(input.VisitID)
	}
	body, err := json.Marshal(input)
	if err != nil {
		return fmt.Errorf("encode WLT field commission request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/commissions", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build WLT field commission request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if err := setRequiredMutationHeaders(req, correlationID, input.IdempotencyKey); err != nil {
		return fmt.Errorf("prepare WLT field commission request: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT field commission: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT field commission returned HTTP %d", response.StatusCode)
	}
	return nil
}

// ExpireSession tells WLT to expire a payment session that was created but
// never captured — e.g. because the checkout intent it belonged to was
// cancelled by the client before any order existed. WLT owns the decision of
// whether the session is still in an expirable state.
//
// A 409 response means WLT considers the session already past the point
// where it can be expired (e.g. it was already captured, expired, or
// cancelled by some other path). That is treated as a terminal, non-retryable
// success rather than an error: retrying forever against a session that has
// already moved on would just waste outbox attempts, and the *outcome* DSH
// cares about — the session no longer being left dangling in an open state —
// already holds true whenever WLT reports 409 here.
func (c *Client) ExpireSession(ctx context.Context, paymentSessionID, correlationID string) error {
	if !c.Configured() {
		return fmt.Errorf("WLT payment-session handoff is not configured")
	}
	if paymentSessionID == "" {
		return fmt.Errorf("paymentSessionID is required")
	}
	path := "/wlt/payment-sessions/" + url.PathEscape(paymentSessionID) + "/expire"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, nil)
	if err != nil {
		return fmt.Errorf("build WLT expire-session request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if strings.TrimSpace(correlationID) == "" {
		correlationID = paymentSessionID
	}
	if err := setRequiredMutationHeaders(req, correlationID, deterministicMutationKey("payment-session-expire", paymentSessionID)); err != nil {
		return fmt.Errorf("prepare WLT expire-session request: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT expire-session: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusConflict {
		// Already not expirable (captured/expired/cancelled elsewhere): the
		// outcome DSH needs already holds, so treat as terminal success.
		return nil
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT expire-session returned HTTP %d", response.StatusCode)
	}
	return nil
}
