package wlt

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// GetPaymentSession reads WLT-owned financial status. DSH uses this only for
// canonical readback; it never derives capture, balance, settlement, or refund
// truth from its own operational state.
func (c *Client) GetPaymentSession(ctx context.Context, paymentSessionID string) (*PaymentSession, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT payment-session read is not configured")
	}
	paymentSessionID = strings.TrimSpace(paymentSessionID)
	if paymentSessionID == "" {
		return nil, fmt.Errorf("paymentSessionID is required")
	}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		c.baseURL+"/wlt/payment-sessions/"+url.PathEscape(paymentSessionID),
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("build WLT payment-session read: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("read WLT payment session: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, PaymentSessionHTTPError{StatusCode: response.StatusCode}
	}
	var envelope struct {
		PaymentSession PaymentSession `json:"paymentSession"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT payment-session read: %w", err)
	}
	if envelope.PaymentSession.ID == "" {
		return nil, fmt.Errorf("WLT payment-session read missing id")
	}
	return &envelope.PaymentSession, nil
}
