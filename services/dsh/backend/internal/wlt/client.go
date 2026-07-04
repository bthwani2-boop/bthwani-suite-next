package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
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

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != ""
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
	req.Header.Set("Authorization", "Bearer dsh-service")
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
	req.Header.Set("Authorization", "Bearer dsh-service")
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
