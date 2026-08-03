package wlt

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

const maxDispatchFinancialEligibilityResponseBytes = 64 << 10

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

func (c *Client) EvaluateDispatchFinancialEligibility(
	ctx context.Context,
	captainID string,
	correlationID string,
	operatorContextID string,
) (DispatchFinancialEligibilityDecision, error) {
	if !c.Configured() {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("WLT integration is not configured")
	}
	captainID = strings.TrimSpace(captainID)
	operatorContextID = strings.TrimSpace(operatorContextID)
	if captainID == "" || len(captainID) > 200 {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("captain id is required and must not exceed 200 characters")
	}
	trustedOperatorContextID, ok := OperatorContextIDFromContext(ctx)
	if !ok || strings.TrimSpace(trustedOperatorContextID) == "" {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("trusted operator context is required")
	}
	if trustedOperatorContextID != operatorContextID {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("trusted operator context does not match request scope")
	}

	payload, err := json.Marshal(map[string]any{"captainId": captainID})
	if err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("encode WLT dispatch financial eligibility request: %w", err)
	}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/internal/dispatch-financial-eligibility/evaluate",
		bytes.NewReader(payload),
	)
	if err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("build WLT dispatch financial eligibility request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	req.Header.Set("Content-Type", "application/json")
	if correlationID = strings.TrimSpace(correlationID); correlationID != "" {
		req.Header.Set("X-Correlation-ID", correlationID)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("call WLT dispatch financial eligibility: %w", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, maxDispatchFinancialEligibilityResponseBytes))
	if err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("read WLT dispatch financial eligibility response: %w", err)
	}
	if response.StatusCode != http.StatusOK {
		return DispatchFinancialEligibilityDecision{}, DispatchFinancialEligibilityHTTPError{StatusCode: response.StatusCode}
	}

	var envelope struct {
		Decision DispatchFinancialEligibilityDecision `json:"decision"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("decode WLT dispatch financial eligibility response: %w", err)
	}
	decision := envelope.Decision
	decision.DecisionID = strings.TrimSpace(decision.DecisionID)
	decision.ReasonCode = strings.TrimSpace(decision.ReasonCode)
	decision.PolicyVersion = strings.TrimSpace(decision.PolicyVersion)
	decision.EvaluatedAt = decision.EvaluatedAt.UTC()
	decision.ExpiresAt = decision.ExpiresAt.UTC()
	if decision.DecisionID == "" || decision.ReasonCode == "" || decision.PolicyVersion == "" {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("WLT dispatch financial eligibility decision metadata is incomplete")
	}
	if decision.EvaluatedAt.IsZero() || decision.ExpiresAt.IsZero() || !decision.ExpiresAt.After(decision.EvaluatedAt) {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("WLT dispatch financial eligibility decision time window is invalid")
	}
	if !decision.ExpiresAt.After(time.Now().UTC()) {
		return DispatchFinancialEligibilityDecision{}, fmt.Errorf("WLT dispatch financial eligibility decision is already expired")
	}
	return decision, nil
}
