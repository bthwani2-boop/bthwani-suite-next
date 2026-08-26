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

func (c *Client) ExecuteFinanceRead(ctx context.Context, opID string, params map[string]string, query url.Values, correlationID, operatorContextID string) (int, []byte, error) {
	return c.executeFinance(ctx, opID, params, query, nil, correlationID, "", operatorContextID, "")
}

func (c *Client) ExecuteFinanceWrite(ctx context.Context, opID string, params map[string]string, body []byte, correlationID, idempotencyKey, operatorContextID, delegatedPrincipalID string) (int, []byte, error) {
	return c.executeFinance(ctx, opID, params, nil, body, correlationID, idempotencyKey, operatorContextID, delegatedPrincipalID)
}

func (c *Client) executeFinance(ctx context.Context, opID string, params map[string]string, query url.Values, body []byte, correlationID, idempotencyKey, operatorContextID, delegatedPrincipalID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	op, err := Registry.GetOperation(opID)
	if err != nil {
		return 0, nil, err
	}
	path, err := op.Path(params)
	if err != nil {
		return 0, nil, err
	}
	if authorized, ok := ctx.Value("authorized_action").(string); ok && strings.TrimSpace(authorized) != "" && strings.TrimSpace(authorized) != op.RequiredPermission {
		return 0, nil, fmt.Errorf("operation %s requires permission %q", opID, op.RequiredPermission)
	}
	if op.Type == OperationTypeRead && body != nil {
		return 0, nil, fmt.Errorf("operation %s is a read operation", opID)
	}
	if op.Type == OperationTypeWrite && body == nil {
		return 0, nil, fmt.Errorf("operation %s is a write operation", opID)
	}
	if op.RequiresDelegatedActor && strings.TrimSpace(delegatedPrincipalID) == "" {
		return 0, nil, fmt.Errorf("Identity-authenticated delegated finance principal is required")
	}
	correlationID = strings.TrimSpace(correlationID)
	if op.Type == OperationTypeWrite && correlationID == "" {
		return 0, nil, fmt.Errorf("WLT finance write correlation id is required")
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if op.RequiresIdempotencyKey && idempotencyKey == "" {
		return 0, nil, fmt.Errorf("WLT finance operation %s requires an idempotency key", opID)
	}

	ctx, cancel := context.WithTimeout(ctx, op.Timeout)
	defer cancel()
	target := c.baseURL + path
	if op.Type == OperationTypeRead && len(query) > 0 {
		target += "?" + query.Encode()
	}
	method := op.HTTPMethod
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, target, reader)
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT finance request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	if correlationID != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if _, err := c.setDelegatedOperatorContextHeader(req, operatorContextID); err != nil {
		return 0, nil, fmt.Errorf("prepare WLT finance OperatorContext: %w", err)
	}
	if delegatedPrincipalID = strings.TrimSpace(delegatedPrincipalID); delegatedPrincipalID != "" {
		req.Header.Set("X-Delegated-Principal-ID", delegatedPrincipalID)
	}
	if op.Type == OperationTypeWrite {
		if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
			return 0, nil, fmt.Errorf("prepare WLT finance request: %w", err)
		}
	}
	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT finance operation: %w", err)
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maxFinanceProxyResponseBytes))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT finance response: %w", err)
	}
	return response.StatusCode, responseBody, nil
}
