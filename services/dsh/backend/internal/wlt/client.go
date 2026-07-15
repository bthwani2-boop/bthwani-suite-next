package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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
	CheckoutIntentID string `json:"checkoutIntentId"`
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
	if input.CorrelationID != "" {
		req.Header.Set("X-Correlation-ID", input.CorrelationID)
	} else {
		req.Header.Set("X-Correlation-ID", input.CheckoutIntentID)
	}
	if input.IdempotencyKey != "" {
		req.Header.Set("Idempotency-Key", input.IdempotencyKey)
	} else {
		req.Header.Set("Idempotency-Key", "dsh-checkout-intent:"+input.CheckoutIntentID)
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
	req.Header.Set("X-Correlation-ID", input.OrderID)

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
	if input.CorrelationID != "" {
		req.Header.Set("X-Correlation-ID", input.CorrelationID)
	} else {
		req.Header.Set("X-Correlation-ID", input.VisitID)
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
	if correlationID != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
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

// CancelSessionForOrderInput is the payload for CancelSessionForOrder.
type CancelSessionForOrderInput struct {
	OrderID  string `json:"orderId"`
	ClientID string `json:"clientId"`
	Reason   string `json:"reason"`
}

// CancelSessionForOrder tells WLT that the order backed by paymentSessionID
// has been rejected or cancelled. WLT decides internally whether to expire
// the session (not yet captured), open a pending refund for review (already
// captured), or no-op (already terminal); DSH treats any 2xx response as
// success regardless of which internal action WLT took.
func (c *Client) CancelSessionForOrder(ctx context.Context, paymentSessionID string, input CancelSessionForOrderInput) error {
	if !c.Configured() {
		return fmt.Errorf("WLT payment-session handoff is not configured")
	}
	if paymentSessionID == "" {
		return fmt.Errorf("paymentSessionID is required")
	}
	body, err := json.Marshal(input)
	if err != nil {
		return fmt.Errorf("encode WLT cancel-for-order request: %w", err)
	}
	path := "/wlt/payment-sessions/" + url.PathEscape(paymentSessionID) + "/cancel-for-order"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build WLT cancel-for-order request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Correlation-ID", input.OrderID)

	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT cancel-for-order: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT cancel-for-order returned HTTP %d", response.StatusCode)
	}
	// Response body shape (e.g. an "action" field indicating which internal
	// path WLT took) is not load-bearing for DSH's logic here; any 2xx is
	// success, same treatment as NotifyDeliveryCompleted.
	return nil
}

// financeReadAllowlist enumerates the WLT internal financial read collections
// DSH is allowed to proxy for its own authenticated surfaces. Anything else
// is rejected before an upstream request is made.
var financeReadAllowlist = map[string]struct{}{
	"/wlt/settlements":              {},
	"/wlt/settlements/summary":      {},
	"/wlt/refunds":                  {},
	"/wlt/ledger/entries":           {},
	"/wlt/cod-records":              {},
	"/wlt/commissions":              {},
	"/wlt/references/wallet-status": {},
	"/wlt/payout-requests":          {},
}

func financeReadPathAllowed(path string) bool {
	if _, ok := financeReadAllowlist[path]; ok {
		return true
	}
	// Single-resource refund detail: /wlt/refunds/{refundId}
	if rest, ok := strings.CutPrefix(path, "/wlt/refunds/"); ok {
		return rest != "" && !strings.Contains(rest, "/")
	}
	return false
}

// financeReadWalletAllowlist enumerates the actor types DSH may look up a
// wallet for via the path-parameterized WLT wallet route
// GET /wlt/wallets/{actorType}/{actorId}.
var financeReadWalletAllowlist = map[string]struct{}{
	"field": {},
}

// FinanceReadWallet performs a service-authenticated GET against WLT's
// path-parameterized wallet lookup route: GET /wlt/wallets/{actorType}/{actorId}.
// actorType must be allowlisted and actorId is URL-escaped before being
// embedded in the path so untrusted input can never alter the route shape.
func (c *Client) FinanceReadWallet(ctx context.Context, actorType, actorID, correlationID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	if _, ok := financeReadWalletAllowlist[actorType]; !ok {
		return 0, nil, fmt.Errorf("WLT wallet actor type %q is not allowlisted", actorType)
	}
	if actorID == "" {
		return 0, nil, fmt.Errorf("WLT wallet actor id must not be empty")
	}
	path := "/wlt/wallets/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT finance read request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if correlationID != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT finance read: %w", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT finance read response: %w", err)
	}
	return response.StatusCode, body, nil
}

// FinanceRead performs a service-authenticated GET against an allowlisted WLT
// internal financial read path and returns the upstream HTTP status plus the
// raw JSON body. WLT stays the only financial truth owner: DSH forwards the
// governed view verbatim and never derives or mutates amounts here.
func (c *Client) FinanceRead(ctx context.Context, path string, query url.Values, correlationID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	if !financeReadPathAllowed(path) {
		return 0, nil, fmt.Errorf("WLT finance read path %q is not allowlisted", path)
	}
	target := c.baseURL + path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT finance read request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if correlationID != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT finance read: %w", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT finance read response: %w", err)
	}
	return response.StatusCode, body, nil
}

// FinanceWrite performs a service-authenticated POST/PUT against an allowlisted WLT path.
func (c *Client) FinanceWrite(ctx context.Context, method, path string, body []byte, correlationID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}

	allowed := false
	if path == "/wlt/payout-requests" {
		allowed = true
	} else if strings.HasPrefix(path, "/wlt/payout-requests/") {
		parts := strings.Split(path, "/")
		// e.g. /wlt/payout-requests/{id}/approve
		if len(parts) == 5 && (parts[4] == "approve" || parts[4] == "reject" || parts[4] == "process" || parts[4] == "complete" || parts[4] == "fail") {
			allowed = true
		}
	}

	if !allowed {
		return 0, nil, fmt.Errorf("WLT finance write path %q is not allowlisted", path)
	}

	target := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(body))
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT finance write request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if correlationID != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT finance write: %w", err)
	}
	defer response.Body.Close()
	respBody, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT finance write response: %w", err)
	}
	return response.StatusCode, respBody, nil
}
