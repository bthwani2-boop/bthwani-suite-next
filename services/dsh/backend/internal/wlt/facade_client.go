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

func (c *Client) ExecuteFinanceRead(ctx context.Context, opID string, path string, query url.Values, correlationID, operatorContextID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	op, err := Registry.GetOperation(opID)
	if err != nil {
		return 0, nil, err
	}
	if op.Type != OperationTypeRead {
		return 0, nil, fmt.Errorf("operation %s is not a read operation", opID)
	}

	ctx, cancel := context.WithTimeout(ctx, op.Timeout)
	defer cancel()

	return c.financeReadRequest(ctx, path, query, correlationID, operatorContextID)
}

func (c *Client) ExecuteFinanceWrite(ctx context.Context, opID string, method, path string, body []byte, correlationID, idempotencyKey, operatorContextID, delegatedPrincipalID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	op, err := Registry.GetOperation(opID)
	if err != nil {
		return 0, nil, err
	}
	if op.Type != OperationTypeWrite {
		return 0, nil, fmt.Errorf("operation %s is not a write operation", opID)
	}
	if method != http.MethodPost && method != http.MethodPut && method != http.MethodPatch {
		return 0, nil, fmt.Errorf("WLT finance write method %q is not allowlisted", method)
	}

	ctx, cancel := context.WithTimeout(ctx, op.Timeout)
	defer cancel()

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
	if operatorContextID = strings.TrimSpace(operatorContextID); operatorContextID != "" {
		req.Header.Set("X-Operator-Context-ID", operatorContextID)
	}
	delegatedPrincipalID = strings.TrimSpace(delegatedPrincipalID)
	if delegatedPrincipalID == "" {
		return 0, nil, fmt.Errorf("Identity-authenticated delegated finance principal is required")
	}
	req.Header.Set("X-Delegated-Principal-ID", delegatedPrincipalID)

	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" && op.Idempotent {
		idempotencyKey = deterministicMutationKey("finance-facade", method, path, string(body), operatorContextID)
	}

	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
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
