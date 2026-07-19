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
)

const maxFinanceProxyResponseBytes = 4 << 20

// CancelSessionForOrderInput is the DSH operational decision sent to WLT.
// WLT remains responsible for selecting expire, refund-pending, or terminal no-op.
type CancelSessionForOrderInput struct {
	OrderID  string `json:"orderId"`
	ClientID string `json:"clientId"`
	Reason   string `json:"reason"`
}

func (c *Client) CancelSessionForOrder(
	ctx context.Context,
	paymentSessionID string,
	input CancelSessionForOrderInput,
) error {
	if !c.Configured() {
		return fmt.Errorf("WLT payment-session handoff is not configured")
	}
	paymentSessionID = strings.TrimSpace(paymentSessionID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	if paymentSessionID == "" || input.OrderID == "" {
		return fmt.Errorf("paymentSessionID and orderId are required")
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
	setServiceHeaders(req, c.serviceToken)
	req.Header.Set("Content-Type", "application/json")
	if err := setRequiredMutationHeaders(
		req,
		input.OrderID,
		deterministicMutationKey("payment-session-cancel-for-order", paymentSessionID, input.OrderID),
	); err != nil {
		return fmt.Errorf("prepare WLT cancel-for-order request: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT cancel-for-order: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT cancel-for-order returned HTTP %d", response.StatusCode)
	}
	return nil
}

var financeReadAllowlist = map[string]struct{}{
	"/wlt/settlements":              {},
	"/wlt/settlements/summary":      {},
	"/wlt/refunds":                  {},
	"/wlt/ledger/entries":           {},
	"/wlt/ledger/financial-summary": {},
	"/wlt/cod-records":              {},
	"/wlt/commissions":              {},
	"/wlt/references/wallet-status": {},
	"/wlt/payout-requests":          {},
	"/wlt/reconciliation-cases":     {},
}

func financeReadPathAllowed(path string) bool {
	if _, ok := financeReadAllowlist[path]; ok {
		return true
	}
	for _, prefix := range []string{"/wlt/refunds/", "/wlt/reconciliation-cases/"} {
		if rest, ok := strings.CutPrefix(path, prefix); ok {
			return rest != "" && !strings.Contains(rest, "/")
		}
	}
	return false
}

var financeReadWalletAllowlist = map[string]struct{}{
	"field": {},
}

func (c *Client) FinanceReadWallet(
	ctx context.Context,
	actorType string,
	actorID string,
	correlationID string,
) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	actorType = strings.TrimSpace(actorType)
	actorID = strings.TrimSpace(actorID)
	if _, ok := financeReadWalletAllowlist[actorType]; !ok {
		return 0, nil, fmt.Errorf("WLT wallet actor type %q is not allowlisted", actorType)
	}
	if actorID == "" {
		return 0, nil, fmt.Errorf("WLT wallet actor id must not be empty")
	}
	path := "/wlt/wallets/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID)
	return c.financeReadRequest(ctx, path, nil, correlationID)
}

func (c *Client) FinanceRead(
	ctx context.Context,
	path string,
	query url.Values,
	correlationID string,
) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	if !financeReadPathAllowed(path) {
		return 0, nil, fmt.Errorf("WLT finance read path %q is not allowlisted", path)
	}
	return c.financeReadRequest(ctx, path, query, correlationID)
}

func (c *Client) financeReadRequest(
	ctx context.Context,
	path string,
	query url.Values,
	correlationID string,
) (int, []byte, error) {
	target := c.baseURL + path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT finance read request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	if correlationID = strings.TrimSpace(correlationID); correlationID != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT finance read: %w", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, maxFinanceProxyResponseBytes))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT finance read response: %w", err)
	}
	return response.StatusCode, body, nil
}

func (c *Client) FinanceWrite(
	ctx context.Context,
	method string,
	path string,
	body []byte,
	correlationID string,
) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	if method != http.MethodPost && method != http.MethodPut && method != http.MethodPatch {
		return 0, nil, fmt.Errorf("WLT finance write method %q is not allowlisted", method)
	}
	if !financeWritePathAllowed(path) {
		return 0, nil, fmt.Errorf("WLT finance write path %q is not allowlisted", path)
	}
	correlationID = strings.TrimSpace(correlationID)
	if correlationID == "" {
		return 0, nil, fmt.Errorf("WLT finance write correlation id is required")
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT finance write request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	req.Header.Set("Content-Type", "application/json")
	if err := setRequiredMutationHeaders(
		req,
		correlationID,
		deterministicMutationKey("finance-proxy", method, path, string(body)),
	); err != nil {
		return 0, nil, fmt.Errorf("prepare WLT finance write request: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT finance write: %w", err)
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maxFinanceProxyResponseBytes))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT finance write response: %w", err)
	}
	return response.StatusCode, responseBody, nil
}

func financeWritePathAllowed(path string) bool {
	if path == "/wlt/payout-requests" {
		return true
	}
	for prefix, actions := range map[string]map[string]struct{}{
		"/wlt/payout-requests/": {
			"approve": {}, "reject": {}, "process": {}, "complete": {}, "fail": {},
		},
		"/wlt/reconciliation-cases/": {
			"assign": {}, "resolve": {},
		},
	} {
		rest, ok := strings.CutPrefix(path, prefix)
		if !ok {
			continue
		}
		parts := strings.Split(rest, "/")
		if len(parts) != 2 || strings.TrimSpace(parts[0]) == "" {
			return false
		}
		_, allowed := actions[parts[1]]
		return allowed
	}
	return false
}

func setServiceHeaders(req *http.Request, serviceToken string) {
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
}
