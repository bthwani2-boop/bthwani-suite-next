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

// FinanceWriteCommission calls only JRN-036 commission policy, adjustment and
// lifecycle routes. It is intentionally separate from the generic finance
// proxy so adding one governed action cannot expose arbitrary WLT mutations.
func (c *Client) FinanceWriteCommission(
	ctx context.Context,
	method string,
	path string,
	body []byte,
	correlationID string,
) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	if !commissionWritePathAllowed(method, path) {
		return 0, nil, fmt.Errorf("WLT governed commission path %q is not allowlisted", path)
	}
	correlationID = strings.TrimSpace(correlationID)
	if correlationID == "" {
		return 0, nil, fmt.Errorf("WLT governed commission correlation id is required")
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT governed commission request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	req.Header.Set("Content-Type", "application/json")
	if err := setRequiredMutationHeaders(
		req,
		correlationID,
		deterministicMutationKey("commission", method, path, string(body)),
	); err != nil {
		return 0, nil, fmt.Errorf("prepare WLT governed commission mutation: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT governed commission mutation: %w", err)
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maxFinanceProxyResponseBytes))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT governed commission response: %w", err)
	}
	return response.StatusCode, responseBody, nil
}

func commissionWritePathAllowed(method, path string) bool {
	if method == http.MethodPut && path == "/wlt/commission-policies" {
		return true
	}
	if method != http.MethodPost {
		return false
	}
	rest, ok := strings.CutPrefix(path, "/wlt/commissions/")
	if !ok {
		return false
	}
	parts := strings.Split(rest, "/")
	if len(parts) != 2 || strings.TrimSpace(parts[0]) == "" || url.PathEscape(parts[0]) != parts[0] {
		return false
	}
	switch parts[1] {
	case "adjust", "confirm", "settle", "reject", "reverse":
		return true
	default:
		return false
	}
}
