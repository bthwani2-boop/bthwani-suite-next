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
