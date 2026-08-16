package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const maxDispatchFinancialEligibilityResponseBytes = 64 << 10

var (
	ErrDispatchFinancialEligibilityUnavailable     = errors.New("WLT dispatch financial eligibility unavailable")
	ErrDispatchFinancialEligibilityInvalidDecision = errors.New("WLT dispatch financial eligibility decision invalid")
	ErrDispatchFinancialEligibilityInvalidRequest  = errors.New("WLT dispatch financial eligibility request invalid")
)

type DispatchFinancialEligibilityDecision struct {
	Eligible      bool      `json:"eligible"`
	ReasonCode    string    `json:"reasonCode"`
	DecisionID    string    `json:"decisionId"`
	PolicyVersion string    `json:"policyVersion"`
	EvaluatedAt   time.Time `json:"evaluatedAt"`
	ExpiresAt     time.Time `json:"expiresAt"`
}

type DispatchFinancialEligibilityHTTPError struct {
	StatusCode int
}

func (e DispatchFinancialEligibilityHTTPError) Error() string {
	return fmt.Sprintf("WLT dispatch financial eligibility returned HTTP %d", e.StatusCode)
}

func (e DispatchFinancialEligibilityHTTPError) Unwrap() error {
	return ErrDispatchFinancialEligibilityUnavailable
}

func (c *Client) EvaluateDispatchFinancialEligibility(
	ctx context.Context,
	captainID string,
	correlationID string,
	operatorContextID string,
) (DispatchFinancialEligibilityDecision, error) {
	if !c.Configured() {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: integration is not configured", ErrDispatchFinancialEligibilityUnavailable)
	}
	captainID = strings.TrimSpace(captainID)
	operatorContextID = strings.TrimSpace(operatorContextID)
	if captainID == "" || len(captainID) > 200 {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: captain id is required and must not exceed 200 characters", ErrDispatchFinancialEligibilityInvalidRequest)
	}
	trustedOperatorContextID, ok := OperatorContextIDFromContext(ctx)
	if !ok || strings.TrimSpace(trustedOperatorContextID) == "" {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: trusted operator context is required", ErrDispatchFinancialEligibilityInvalidRequest)
	}
	if trustedOperatorContextID != operatorContextID {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: trusted operator context does not match request scope", ErrDispatchFinancialEligibilityInvalidRequest)
	}

	payload, err := json.Marshal(map[string]any{"captainId": captainID})
	if err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: encode request: %v", ErrDispatchFinancialEligibilityInvalidRequest, err)
	}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/internal/dispatch-financial-eligibility/evaluate",
		bytes.NewReader(payload),
	)
	if err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: build request: %v", ErrDispatchFinancialEligibilityInvalidRequest, err)
	}
	setServiceHeaders(req, c.serviceToken)
	req.Header.Set("Content-Type", "application/json")
	correlationID = strings.TrimSpace(correlationID)
	if err := setRequiredMutationHeaders(req, correlationID, deterministicMutationKey("dispatch-financial-eligibility", captainID, operatorContextID)); err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: prepare mutation headers: %v", ErrDispatchFinancialEligibilityInvalidRequest, err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: call WLT: %v", ErrDispatchFinancialEligibilityUnavailable, err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, maxDispatchFinancialEligibilityResponseBytes))
	if err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: read response: %v", ErrDispatchFinancialEligibilityUnavailable, err)
	}
	if response.StatusCode != http.StatusOK {
		return DispatchFinancialEligibilityDecision{}, DispatchFinancialEligibilityHTTPError{StatusCode: response.StatusCode}
	}

	var envelope struct {
		Decision DispatchFinancialEligibilityDecision `json:"decision"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: decode response: %v", ErrDispatchFinancialEligibilityInvalidDecision, err)
	}
	decision := envelope.Decision
	decision.DecisionID = strings.TrimSpace(decision.DecisionID)
	decision.ReasonCode = strings.TrimSpace(decision.ReasonCode)
	decision.PolicyVersion = strings.TrimSpace(decision.PolicyVersion)
	decision.EvaluatedAt = decision.EvaluatedAt.UTC()
	decision.ExpiresAt = decision.ExpiresAt.UTC()
	if decision.DecisionID == "" || decision.ReasonCode == "" || decision.PolicyVersion == "" {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: metadata is incomplete", ErrDispatchFinancialEligibilityInvalidDecision)
	}
	if decision.EvaluatedAt.IsZero() || decision.ExpiresAt.IsZero() || !decision.ExpiresAt.After(decision.EvaluatedAt) {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: time window is invalid", ErrDispatchFinancialEligibilityInvalidDecision)
	}
	if !decision.ExpiresAt.After(time.Now().UTC()) {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("%w: decision is already expired", ErrDispatchFinancialEligibilityInvalidDecision)
	}
	return decision, nil
}
