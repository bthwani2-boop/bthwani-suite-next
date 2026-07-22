package wlt

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// FinanceRefundWrite is the refund-specific mutation seam. Unlike the generic
// finance proxy it preserves the caller's Idempotency-Key, allowing WLT to
// detect a replay whose payload changed instead of silently allocating a new
// financial operation identity.
func (c *Client) FinanceRefundWrite(
	ctx context.Context,
	path string,
	body []byte,
	correlationID string,
	idempotencyKey string,
	tenantID string,
) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	if !financeWritePathAllowed(path) || (path != "/wlt/refunds" && !strings.HasPrefix(path, "/wlt/refunds/")) {
		return 0, nil, fmt.Errorf("WLT refund write path %q is not allowlisted", path)
	}
	correlationID = strings.TrimSpace(correlationID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	tenantID = strings.TrimSpace(tenantID)
	if correlationID == "" || idempotencyKey == "" || tenantID == "" {
		return 0, nil, fmt.Errorf("refund correlation id, idempotency key and tenant id are required")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT refund request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", tenantID)
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return 0, nil, fmt.Errorf("prepare WLT refund request: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT refund route: %w", err)
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maxFinanceProxyResponseBytes))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT refund response: %w", err)
	}
	return response.StatusCode, responseBody, nil
}
