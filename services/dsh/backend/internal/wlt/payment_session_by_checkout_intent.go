package wlt

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// GetPaymentSessionByCheckoutIntent resolves the WLT-owned payment session by
// its source identity. It is the recovery readback used when the create
// response was lost before DSH persisted the remote session id.
func (c *Client) GetPaymentSessionByCheckoutIntent(ctx context.Context, checkoutIntentID string) (*PaymentSessionDetail, error) {
	if !c.Configured() {
		return nil, ErrNotConfigured
	}
	checkoutIntentID = strings.TrimSpace(checkoutIntentID)
	if checkoutIntentID == "" {
		return nil, fmt.Errorf("checkout intent id is required")
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/wlt/payment-sessions/by-checkout-intent/"+url.PathEscape(checkoutIntentID)+"/lookup", nil)
	if err != nil {
		return nil, fmt.Errorf("build WLT checkout-intent payment-session read: %w", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Authorization", "Bearer "+c.serviceToken)
	request.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setDelegatedOperatorContextHeader(request, ""); err != nil {
		return nil, fmt.Errorf("prepare WLT checkout-intent payment-session read OperatorContext: %w", err)
	}
	response, err := c.http.Do(request)
	if err != nil {
		return nil, fmt.Errorf("%w: call WLT checkout-intent payment-session read: %v", ErrPaymentSessionOutcomeUnknown, err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		if response.StatusCode == http.StatusRequestTimeout || response.StatusCode == http.StatusTooManyRequests || response.StatusCode >= 500 {
			return nil, fmt.Errorf("%w: WLT checkout-intent payment-session read returned HTTP %d", ErrPaymentSessionOutcomeUnknown, response.StatusCode)
		}
		return nil, PaymentSessionHTTPError{StatusCode: response.StatusCode}
	}
	var envelope struct {
		PaymentSession PaymentSessionDetail `json:"paymentSession"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("%w: decode WLT checkout-intent payment-session read: %v", ErrPaymentSessionOutcomeUnknown, err)
	}
	if strings.TrimSpace(envelope.PaymentSession.ID) == "" || strings.TrimSpace(envelope.PaymentSession.Status) == "" {
		return nil, fmt.Errorf("%w: WLT checkout-intent payment-session read is incomplete", ErrPaymentSessionOutcomeUnknown)
	}
	return &envelope.PaymentSession, nil
}
