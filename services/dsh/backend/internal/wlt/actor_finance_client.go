package wlt

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

func (c *Client) actorFinanceReadRequest(ctx context.Context, path, correlationID, operatorContextID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, fmt.Errorf("WLT integration is not configured")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT actor finance read request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setDelegatedOperatorContextHeader(req, operatorContextID); err != nil {
		return 0, nil, fmt.Errorf("prepare WLT actor finance OperatorContext: %w", err)
	}
	if correlationID = strings.TrimSpace(correlationID); correlationID != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
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
	return c.actorFinanceReadRequest(ctx, path, correlationID, operatorContextID)
}
