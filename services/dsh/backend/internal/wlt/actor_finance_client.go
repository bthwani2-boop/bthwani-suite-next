package wlt

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

func (c *Client) actorFinanceRequest(ctx context.Context, method, path string, body []byte, correlationID string) (int, []byte, error) {
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
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}
	if correlationID != "" {
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

func (c *Client) FinanceReadCodRecord(ctx context.Context, recordID, correlationID string) (int, []byte, error) {
	if recordID == "" {
		return 0, nil, fmt.Errorf("COD record id is required")
	}
	return c.actorFinanceRequest(ctx, http.MethodGet, "/wlt/cod-records/"+url.PathEscape(recordID), nil, correlationID)
}

func (c *Client) FinanceWriteCodRecord(ctx context.Context, recordID, action, correlationID string) (int, []byte, error) {
	if recordID == "" || (action != "collect" && action != "remit") {
		return 0, nil, fmt.Errorf("invalid COD record mutation")
	}
	return c.actorFinanceRequest(ctx, http.MethodPost, "/wlt/cod-records/"+url.PathEscape(recordID)+"/"+action, []byte("{}"), correlationID)
}

func (c *Client) FinanceReadPayoutDestination(ctx context.Context, actorID, correlationID string) (int, []byte, error) {
	if actorID == "" {
		return 0, nil, fmt.Errorf("actor id is required")
	}
	return c.actorFinanceRequest(ctx, http.MethodGet, "/wlt/payout-destinations/"+url.PathEscape(actorID), nil, correlationID)
}

func (c *Client) FinanceUpsertPayoutDestination(ctx context.Context, actorID string, body []byte, correlationID string) (int, []byte, error) {
	if actorID == "" || len(body) == 0 {
		return 0, nil, fmt.Errorf("actor id and payout destination body are required")
	}
	return c.actorFinanceRequest(ctx, http.MethodPut, "/wlt/payout-destinations/"+url.PathEscape(actorID), body, correlationID)
}

func (c *Client) FinanceDeactivatePayoutDestination(ctx context.Context, actorID, correlationID string) (int, []byte, error) {
	if actorID == "" {
		return 0, nil, fmt.Errorf("actor id is required")
	}
	return c.actorFinanceRequest(ctx, http.MethodPost, "/wlt/payout-destinations/"+url.PathEscape(actorID)+"/deactivate", []byte("{}"), correlationID)
}
