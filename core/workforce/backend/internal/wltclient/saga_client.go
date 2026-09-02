package wltclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	workforceauth "workforce-api/internal/auth"
)

var (
	ErrOutcomeUnknown = fmt.Errorf("WLT mutation outcome is unknown")
	ErrRetryable      = fmt.Errorf("WLT provider penalty request is retryable")
	ErrPermanent      = fmt.Errorf("WLT provider penalty request was permanently rejected")
	ErrNotFound       = fmt.Errorf("WLT provider penalty was not found")
)

type RequestError struct {
	Kind       error
	StatusCode int
	Code       string
	Message    string
	Cause      error
}

func (e *RequestError) Error() string {
	if e == nil {
		return "WLT provider penalty request failed"
	}
	if e.Code != "" {
		return fmt.Sprintf("%s: %s", e.Code, e.Message)
	}
	if e.Cause != nil {
		return e.Cause.Error()
	}
	return e.Kind.Error()
}

func (e *RequestError) Unwrap() error { return e.Kind }

type SagaProviderPenalty struct {
	ID                            string `json:"id"`
	IncidentID                    string `json:"incidentId"`
	ProviderActorID               string `json:"providerActorId"`
	ProviderActorType             string `json:"providerActorType"`
	PolicyID                      string `json:"policyId"`
	PolicyVersion                 string `json:"policyVersion"`
	Status                        string `json:"status"`
	LedgerTransactionID           string `json:"ledgerTransactionId"`
	ReversalLedgerTransactionID   string `json:"reversalLedgerTransactionId,omitempty"`
	IdempotencyKey                string `json:"idempotencyKey"`
	ReversalIdempotencyKey        string `json:"reversalIdempotencyKey,omitempty"`
	AmountMinorUnits              int64  `json:"amountMinorUnits"`
	WalletAppliedAmountMinorUnits int64  `json:"walletAppliedAmountMinorUnits"`
	DebtAmountMinorUnits          int64  `json:"debtAmountMinorUnits"`
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.token != ""
}

func (c *Client) sagaRequest(ctx context.Context, method, path, idempotencyKey, correlationID string, body any) (SagaProviderPenalty, error) {
	operatorContextID, ok := workforceauth.OperatorContextIDFromContext(ctx)
	if !c.Configured() || !ok {
		return SagaProviderPenalty{}, fmt.Errorf("WLT workforce saga client is not configured")
	}
	var encoded []byte
	var err error
	if body != nil {
		encoded, err = json.Marshal(body)
		if err != nil {
			return SagaProviderPenalty{}, err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(encoded))
	if err != nil {
		return SagaProviderPenalty{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("X-Service-Caller", "workforce")
	req.Header.Set("X-Delegated-Operator-Context", operatorContextID)
	if strings.TrimSpace(idempotencyKey) != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	if strings.TrimSpace(correlationID) != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
	}
	response, err := c.http.Do(req)
	if err != nil {
		kind := ErrRetryable
		if method != http.MethodGet {
			kind = ErrOutcomeUnknown
		}
		return SagaProviderPenalty{}, &RequestError{Kind: kind, Cause: fmt.Errorf("call WLT provider penalty: %w", err)}
	}
	defer func() { _ = response.Body.Close() }()
	payload, err := io.ReadAll(io.LimitReader(response.Body, 256*1024))
	if err != nil {
		kind := ErrRetryable
		if method != http.MethodGet {
			kind = ErrOutcomeUnknown
		}
		return SagaProviderPenalty{}, &RequestError{Kind: kind, Cause: err}
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var apiErr errorResponse
		_ = json.Unmarshal(payload, &apiErr)
		if apiErr.Code == "" {
			apiErr.Code = "WLT_PROVIDER_PENALTY_FAILED"
		}
		kind := ErrPermanent
		switch {
		case response.StatusCode == http.StatusNotFound:
			kind = ErrNotFound
		case response.StatusCode >= 500 || response.StatusCode == http.StatusTooManyRequests:
			kind = ErrRetryable
		}
		return SagaProviderPenalty{}, &RequestError{Kind: kind, StatusCode: response.StatusCode, Code: apiErr.Code, Message: apiErr.Message}
	}
	var result struct {
		ProviderPenalty SagaProviderPenalty `json:"providerPenalty"`
	}
	if err := json.Unmarshal(payload, &result); err != nil {
		kind := ErrRetryable
		if method != http.MethodGet {
			kind = ErrOutcomeUnknown
		}
		return SagaProviderPenalty{}, &RequestError{Kind: kind, Cause: err}
	}
	if result.ProviderPenalty.ID == "" || result.ProviderPenalty.LedgerTransactionID == "" {
		kind := ErrRetryable
		if method != http.MethodGet {
			kind = ErrOutcomeUnknown
		}
		return SagaProviderPenalty{}, &RequestError{Kind: kind, Cause: fmt.Errorf("WLT returned incomplete provider penalty proof")}
	}
	return result.ProviderPenalty, nil
}

func (c *Client) PostPenaltySaga(ctx context.Context, idempotencyKey, correlationID string, input PostPenaltyInput) (SagaProviderPenalty, error) {
	return c.sagaRequest(ctx, http.MethodPost, "/wlt/provider-penalties", idempotencyKey, correlationID, input)
}

func (c *Client) ReversePenaltySaga(ctx context.Context, penaltyID, idempotencyKey, correlationID string, input ReversePenaltyInput) (SagaProviderPenalty, error) {
	return c.sagaRequest(ctx, http.MethodPost, "/wlt/provider-penalties/reverse/"+penaltyID, idempotencyKey, correlationID, input)
}

func (c *Client) GetPenaltyByIncident(ctx context.Context, incidentID, correlationID string) (SagaProviderPenalty, error) {
	return c.sagaRequest(ctx, http.MethodGet, "/wlt/provider-penalties/by-incident/"+incidentID, "", correlationID, nil)
}

func (c *Client) GetPenalty(ctx context.Context, penaltyID, correlationID string) (SagaProviderPenalty, error) {
	return c.sagaRequest(ctx, http.MethodGet, "/wlt/provider-penalties/"+penaltyID, "", correlationID, nil)
}
