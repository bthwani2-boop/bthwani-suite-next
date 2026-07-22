// Package dshnotify sends durable payment and refund outcome events from WLT
// back to DSH. WLT remains the sole owner of financial truth; DSH receives
// only the operational projection needed to advance affected journeys.
package dshnotify

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

var ErrNotConfigured = errors.New("dshnotify: client is not configured (missing baseURL or serviceToken)")

type Client struct {
	baseURL      string
	serviceToken string
	http         *http.Client
}

type Event struct {
	EventID          string
	CorrelationID    string
	TenantID         string
	CheckoutIntentID *string
	SpecialRequestID *string
	PaymentSessionID string
	Status           string
	OrderID          string
	RefundReference  string
	Reason           string
}

func NewClient(baseURL, serviceToken string) *Client {
	return &Client{
		baseURL:      strings.TrimRight(baseURL, "/"),
		serviceToken: serviceToken,
		http:         &http.Client{Timeout: 5 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.serviceToken != ""
}

// Notify preserves the established payment-event call contract.
func (c *Client) Notify(ctx context.Context, tenantID string, checkoutIntentID, specialRequestID *string, paymentSessionID, status string) error {
	return c.NotifyEvent(ctx, Event{
		TenantID: tenantID, CheckoutIntentID: checkoutIntentID, SpecialRequestID: specialRequestID,
		PaymentSessionID: paymentSessionID, Status: status,
	})
}

// NotifyEvent delivers either a payment-session event or a completed-refund
// event. Refund events include order/refund identity and never expose provider
// secrets or operator identities to DSH.
func (c *Client) NotifyEvent(ctx context.Context, event Event) error {
	if !c.Configured() {
		return ErrNotConfigured
	}
	payload := map[string]string{
		"paymentSessionId": event.PaymentSessionID,
		"status":           event.Status,
	}
	if event.EventID != "" {
		payload["eventId"] = event.EventID
	}
	if event.TenantID != "" {
		payload["tenantId"] = event.TenantID
	}
	if event.OrderID != "" {
		payload["orderId"] = event.OrderID
	}
	if event.RefundReference != "" {
		payload["refundReference"] = event.RefundReference
	}
	if event.Reason != "" {
		payload["reason"] = event.Reason
	}
	correlationID := strings.TrimSpace(event.CorrelationID)
	if correlationID == "" {
		correlationID = event.PaymentSessionID
	}
	switch {
	case event.CheckoutIntentID != nil && *event.CheckoutIntentID != "":
		payload["checkoutIntentId"] = *event.CheckoutIntentID
		if correlationID == "" { correlationID = *event.CheckoutIntentID }
	case event.SpecialRequestID != nil && *event.SpecialRequestID != "":
		payload["specialRequestId"] = *event.SpecialRequestID
		if correlationID == "" { correlationID = *event.SpecialRequestID }
	}
	if correlationID != "" {
		payload["correlationId"] = correlationID
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/dsh/internal/wlt/payment-session-events", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "wlt")
	req.Header.Set("X-Correlation-ID", correlationID)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &httpStatusError{status: resp.StatusCode}
	}
	return nil
}

type httpStatusError struct{ status int }

func (e *httpStatusError) Error() string {
	return "DSH WLT event webhook returned non-2xx status"
}
