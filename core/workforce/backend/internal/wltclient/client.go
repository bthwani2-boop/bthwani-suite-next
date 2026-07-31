package wltclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL  string
	token    string
	operatorContextID string
	http     *http.Client
}

func NewClient(baseURL, token, operatorContextID string) *Client {
	return &Client{
		baseURL:  strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		token:    strings.TrimSpace(token),
		operatorContextID: strings.TrimSpace(operatorContextID),
		http:     &http.Client{Timeout: 12 * time.Second},
	}
}

type ProviderPenalty struct {
	ID                          string `json:"id"`
	IncidentID                  string `json:"incidentId"`
	ProviderActorID             string `json:"providerActorId"`
	ProviderActorType           string `json:"providerActorType"`
	AmountMinorUnits            int64  `json:"amountMinorUnits"`
	Currency                    string `json:"currency"`
	Status                      string `json:"status"`
	LedgerTransactionID         string `json:"ledgerTransactionId"`
	ReversalLedgerTransactionID string `json:"reversalLedgerTransactionId,omitempty"`
}

type PostPenaltyInput struct {
	IncidentID        string `json:"incidentId"`
	ProviderActorID   string `json:"providerActorId"`
	ProviderActorType string `json:"providerActorType"`
	AmountMinorUnits  int64  `json:"amountMinorUnits"`
	Currency          string `json:"currency"`
	Reason            string `json:"reason"`
	PostedByActorID   string `json:"postedByActorId"`
}

type ReversePenaltyInput struct {
	Reason            string `json:"reason"`
	ReversedByActorID string `json:"reversedByActorId"`
}

type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (c *Client) request(ctx context.Context, method, path, idempotencyKey, correlationID string, body any) (ProviderPenalty, error) {
	if c.baseURL == "" || c.token == "" || c.operatorContextID == "" {
		return ProviderPenalty{}, fmt.Errorf("WLT workforce client is not configured")
	}
	encoded, err := json.Marshal(body)
	if err != nil {
		return ProviderPenalty{}, err
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(encoded))
	if err != nil {
		return ProviderPenalty{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("X-Service-Caller", "workforce")
	req.Header.Set("X-Operator-Context-ID", c.operatorContextID)
	if strings.TrimSpace(idempotencyKey) != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	if strings.TrimSpace(correlationID) != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return ProviderPenalty{}, fmt.Errorf("call WLT provider penalty: %w", err)
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
	if err != nil {
		return ProviderPenalty{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiErr errorResponse
		_ = json.Unmarshal(payload, &apiErr)
		if apiErr.Code == "" {
			apiErr.Code = "WLT_PROVIDER_PENALTY_FAILED"
		}
		return ProviderPenalty{}, fmt.Errorf("%s: %s", apiErr.Code, apiErr.Message)
	}
	var result struct {
		ProviderPenalty ProviderPenalty `json:"providerPenalty"`
	}
	if err := json.Unmarshal(payload, &result); err != nil {
		return ProviderPenalty{}, err
	}
	if result.ProviderPenalty.ID == "" || result.ProviderPenalty.LedgerTransactionID == "" {
		return ProviderPenalty{}, fmt.Errorf("WLT returned incomplete provider penalty proof")
	}
	return result.ProviderPenalty, nil
}

func (c *Client) PostPenalty(ctx context.Context, idempotencyKey, correlationID string, input PostPenaltyInput) (ProviderPenalty, error) {
	return c.request(ctx, http.MethodPost, "/wlt/provider-penalties", idempotencyKey, correlationID, input)
}

func (c *Client) ReversePenalty(ctx context.Context, penaltyID, correlationID string, input ReversePenaltyInput) (ProviderPenalty, error) {
	return c.request(ctx, http.MethodPost, "/wlt/provider-penalties/"+penaltyID+"/reverse", "", correlationID, input)
}
