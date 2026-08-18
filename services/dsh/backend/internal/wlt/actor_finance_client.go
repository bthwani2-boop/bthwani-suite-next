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

func (c *Client) actorFinanceRequest(ctx context.Context, method, path string, body []byte, correlationID, idempotencyKey, operatorContextID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	var reader io.Reader
	if len(body) > 0 {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT actor finance request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID != "" {
		req.Header.Set("X-Operator-Context-Id", operatorContextID)
	}
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}
	correlationID = strings.TrimSpace(correlationID)
	if method == http.MethodGet || method == http.MethodHead {
		if correlationID != "" {
			req.Header.Set("X-Correlation-ID", correlationID)
		}
	} else {
		idempotencyKey = strings.TrimSpace(idempotencyKey)
		if idempotencyKey == "" {
			idempotencyKey = deterministicMutationKey("actor-finance", method, path, string(body), correlationID)
		}
		if err := setRequiredMutationHeaders(
			req,
			correlationID,
			idempotencyKey,
		); err != nil {
			return 0, nil, fmt.Errorf("prepare WLT actor finance mutation: %w", err)
		}
	}
	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT actor finance route: %w", err)
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT actor finance response: %w", err)
	}
	return response.StatusCode, responseBody, nil
}

func governedPayoutActorType(actorType string) (string, error) {
	actorType = strings.ToLower(strings.TrimSpace(actorType))
	switch actorType {
	case "partner", "captain", "field":
		return actorType, nil
	default:
		return "", fmt.Errorf("unsupported payout actor type %q", actorType)
	}
}

func (c *Client) FinanceReadPayoutDestinationWithOperatorContext(ctx context.Context, actorType, actorID, correlationID, operatorContextID string) (int, []byte, error) {
	actorType, err := governedPayoutActorType(actorType)
	if err != nil {
		return 0, nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return 0, nil, fmt.Errorf("actor id is required")
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID)
	return c.actorFinanceRequest(ctx, http.MethodGet, path, nil, correlationID, "", operatorContextID)
}

func (c *Client) FinanceUpsertPayoutDestinationWithOperatorContext(ctx context.Context, actorType, actorID string, body []byte, correlationID, operatorContextID string) (int, []byte, error) {
	actorType, err := governedPayoutActorType(actorType)
	if err != nil {
		return 0, nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" || len(body) == 0 {
		return 0, nil, fmt.Errorf("actor id and payout destination body are required")
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID)
	return c.actorFinanceRequest(ctx, http.MethodPut, path, body, correlationID, "", operatorContextID)
}

func (c *Client) FinanceDeactivatePayoutDestinationWithOperatorContext(ctx context.Context, actorType, actorID, correlationID, operatorContextID string) (int, []byte, error) {
	actorType, err := governedPayoutActorType(actorType)
	if err != nil {
		return 0, nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return 0, nil, fmt.Errorf("actor id is required")
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID) + "/deactivate"
	return c.actorFinanceRequest(ctx, http.MethodPost, path, []byte("{}"), correlationID, "", operatorContextID)
}
