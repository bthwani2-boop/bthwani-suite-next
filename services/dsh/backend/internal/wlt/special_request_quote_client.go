package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type SpecialRequestQuoteInput struct {
	SpecialRequestID         string `json:"specialRequestId"`
	ClientID                 string `json:"clientId"`
	PolicyID                 string `json:"policyId"`
	ProposedAmountMinorUnits int64  `json:"proposedAmountMinorUnits"`
	ProposedCurrency         string `json:"proposedCurrency"`
	ProposalReason           string `json:"proposalReason"`
	CorrelationID            string `json:"-"`
	IdempotencyKey           string `json:"-"`
}

type SpecialRequestQuote struct {
	ID                       string    `json:"id"`
	OperatorContextID        string    `json:"operatorContextId"`
	SpecialRequestID         string    `json:"specialRequestId"`
	ClientID                 string    `json:"clientId"`
	PolicyID                 string    `json:"policyId"`
	PolicyVersion            int       `json:"policyVersion"`
	QuoteVersion             int       `json:"quoteVersion"`
	ProposedAmountMinorUnits int64     `json:"proposedAmountMinorUnits"`
	ProposedCurrency         string    `json:"proposedCurrency"`
	ProposalReason           string    `json:"proposalReason"`
	AmountMinorUnits         int64     `json:"amountMinorUnits"`
	Currency                 string    `json:"currency"`
	QuoteHash                string    `json:"quoteHash"`
	Status                   string    `json:"status"`
	ExpiresAt                time.Time `json:"expiresAt"`
	CreatedAt                time.Time `json:"createdAt"`
	UpdatedAt                time.Time `json:"updatedAt"`
}

func (c *Client) IssueSpecialRequestQuote(ctx context.Context, input SpecialRequestQuoteInput) (*SpecialRequestQuote, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT special-request quote handoff is not configured")
	}
	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("encode WLT special-request quote request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/internal/quotes/special-request", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build WLT special-request quote request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setDelegatedOperatorContextHeader(req, ""); err != nil {
		return nil, fmt.Errorf("prepare WLT special-request quote scope: %w", err)
	}
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = input.SpecialRequestID
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = deterministicMutationKey("special-request-quote", input.SpecialRequestID)
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return nil, fmt.Errorf("prepare WLT special-request quote mutation: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT special-request quote: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("WLT special-request quote returned HTTP %d", response.StatusCode)
	}
	var envelope struct {
		Quote SpecialRequestQuote `json:"quote"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT special-request quote: %w", err)
	}
	if strings.TrimSpace(envelope.Quote.ID) == "" {
		return nil, fmt.Errorf("WLT special-request quote response omitted quote id")
	}
	return &envelope.Quote, nil
}

func (c *Client) GetActiveSpecialRequestQuote(ctx context.Context, specialRequestID string) (*SpecialRequestQuote, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT special-request quote handoff is not configured")
	}
	specialRequestID = strings.TrimSpace(specialRequestID)
	if specialRequestID == "" {
		return nil, fmt.Errorf("special request id is required")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/wlt/internal/quotes/special-request/"+url.PathEscape(specialRequestID), nil)
	if err != nil {
		return nil, fmt.Errorf("build WLT special-request quote read: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setDelegatedOperatorContextHeader(req, ""); err != nil {
		return nil, fmt.Errorf("prepare WLT special-request quote scope: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("read WLT special-request quote: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("WLT special-request quote read returned HTTP %d", response.StatusCode)
	}
	var envelope struct {
		Quote SpecialRequestQuote `json:"quote"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT special-request quote read: %w", err)
	}
	if envelope.Quote.ID == "" {
		return nil, fmt.Errorf("WLT special-request quote read omitted quote id")
	}
	return &envelope.Quote, nil
}
