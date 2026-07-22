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
	correlationID = strings.TrimSpace(correlationID)
	if method == http.MethodGet || method == http.MethodHead {
		if correlationID != "" {
			req.Header.Set("X-Correlation-ID", correlationID)
		}
	} else if err := setRequiredMutationHeaders(
		req,
		correlationID,
		deterministicMutationKey("actor-finance", method, path, string(body), correlationID),
	); err != nil {
		return 0, nil, fmt.Errorf("prepare WLT actor finance mutation: %w", err)
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

// FinanceWriteCodRecord forwards only the evidence payload already governed by
// DSH. WLT independently verifies the actor against the persisted collector,
// derives expected cash from its own COD record and owns all ledger effects.
func (c *Client) FinanceWriteCodRecord(ctx context.Context, recordID, action string, body []byte, correlationID string) (int, []byte, error) {
	recordID = strings.TrimSpace(recordID)
	if recordID == "" || (action != "collect" && action != "remit") || len(body) == 0 {
		return 0, nil, fmt.Errorf("invalid COD record mutation")
	}
	if !jsonBodyValid(body) {
		return 0, nil, fmt.Errorf("COD evidence body is invalid")
	}
	correlationID = strings.TrimSpace(correlationID)
	if correlationID == "" {
		correlationID = deterministicMutationKey("cod-custody", action, recordID, string(body))
	}
	return c.actorFinanceRequest(ctx, http.MethodPost, "/wlt/cod-records/"+url.PathEscape(recordID)+"/"+action, body, correlationID)
}

func jsonBodyValid(body []byte) bool {
	trimmed := strings.TrimSpace(string(body))
	return len(trimmed) >= 2 && strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}")
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

func (c *Client) FinanceReadPayoutDestination(ctx context.Context, actorType, actorID, correlationID string) (int, []byte, error) {
	actorType, err := governedPayoutActorType(actorType)
	if err != nil {
		return 0, nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return 0, nil, fmt.Errorf("actor id is required")
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID)
	return c.actorFinanceRequest(ctx, http.MethodGet, path, nil, correlationID)
}

func (c *Client) FinanceUpsertPayoutDestination(ctx context.Context, actorType, actorID string, body []byte, correlationID string) (int, []byte, error) {
	actorType, err := governedPayoutActorType(actorType)
	if err != nil {
		return 0, nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" || len(body) == 0 {
		return 0, nil, fmt.Errorf("actor id and payout destination body are required")
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID)
	return c.actorFinanceRequest(ctx, http.MethodPut, path, body, correlationID)
}

func (c *Client) FinanceDeactivatePayoutDestination(ctx context.Context, actorType, actorID, correlationID string) (int, []byte, error) {
	actorType, err := governedPayoutActorType(actorType)
	if err != nil {
		return 0, nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return 0, nil, fmt.Errorf("actor id is required")
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID) + "/deactivate"
	return c.actorFinanceRequest(ctx, http.MethodPost, path, []byte("{}"), correlationID)
}
