package wlt

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

func (c *Client) ReadPaymentSessionTimeline(ctx context.Context, tenantID, paymentSessionID, correlationID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	tenantID = strings.TrimSpace(tenantID)
	paymentSessionID = strings.TrimSpace(paymentSessionID)
	if tenantID == "" || paymentSessionID == "" {
		return 0, nil, fmt.Errorf("tenantID and paymentSessionID are required")
	}
	path := "/wlt/payment-sessions/" + url.PathEscape(paymentSessionID) + "/timeline"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT payment timeline request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	req.Header.Set("X-Tenant-ID", tenantID)
	if correlationID = strings.TrimSpace(correlationID); correlationID != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
	}
	return c.doPaymentSessionRequest(req)
}

func (c *Client) RefreshPaymentSessionProviderStatus(ctx context.Context, tenantID, paymentSessionID, correlationID, idempotencyKey string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	tenantID = strings.TrimSpace(tenantID)
	paymentSessionID = strings.TrimSpace(paymentSessionID)
	if tenantID == "" || paymentSessionID == "" {
		return 0, nil, fmt.Errorf("tenantID and paymentSessionID are required")
	}
	path := "/wlt/payment-sessions/" + url.PathEscape(paymentSessionID) + "/refresh-provider-status"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, nil)
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT provider status refresh request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	req.Header.Set("X-Tenant-ID", tenantID)
	if correlationID = strings.TrimSpace(correlationID); correlationID == "" {
		correlationID = paymentSessionID
	}
	if idempotencyKey = strings.TrimSpace(idempotencyKey); idempotencyKey == "" {
		idempotencyKey = deterministicMutationKey("payment-provider-status-refresh", tenantID, paymentSessionID, correlationID)
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return 0, nil, fmt.Errorf("prepare WLT provider status refresh request: %w", err)
	}
	return c.doPaymentSessionRequest(req)
}

func (c *Client) doPaymentSessionRequest(req *http.Request) (int, []byte, error) {
	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT payment session endpoint: %w", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, maxFinanceProxyResponseBytes))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT payment session response: %w", err)
	}
	return response.StatusCode, body, nil
}
