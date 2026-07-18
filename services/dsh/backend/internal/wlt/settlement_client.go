package wlt

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// FinanceWriteSettlement calls only the governed WLT settlement mutation
// shapes: delivered-order creation and partner policy upsert. It deliberately
// remains separate from generic finance writes so no caller can reach an
// arbitrary WLT mutation through DSH.
func (c *Client) FinanceWriteSettlement(ctx context.Context, method, path string, body []byte, correlationID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}

	allowed := method == http.MethodPost && path == "/wlt/settlements"
	if method == http.MethodPut && strings.HasPrefix(path, "/wlt/settlement-policies/") {
		partnerID, ok := strings.CutPrefix(path, "/wlt/settlement-policies/")
		allowed = ok && partnerID != "" && !strings.Contains(partnerID, "/") && url.PathEscape(partnerID) == partnerID
	}
	if !allowed {
		return 0, nil, fmt.Errorf("WLT governed settlement path %q is not allowlisted", path)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT settlement request: %w", err)
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
		return 0, nil, fmt.Errorf("call WLT settlement mutation: %w", err)
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT settlement response: %w", err)
	}
	return response.StatusCode, responseBody, nil
}
