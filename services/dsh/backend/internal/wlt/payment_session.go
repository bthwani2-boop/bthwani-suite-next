package wlt

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

var ErrNotConfigured = errors.New("WLT client is not configured")

// PaymentSessionDetail is the reconciliation read model for an existing
// payment session, distinct from PaymentSession (the handoff-creation
// response) because it carries fields — Method, a parsed UpdatedAt, refund
// and failure detail — that only exist once WLT has processed the session.
type PaymentSessionDetail struct {
	ID              string     `json:"id"`
	IdempotencyKey  string     `json:"idempotencyKey"`
	ActorID         string     `json:"actorId"`
	StoreID         string     `json:"storeId"`
	Method          string     `json:"method"`
	Amount          int64      `json:"amount"`
	Currency        string     `json:"currency"`
	Status          string     `json:"status"`
	Reference       string     `json:"reference"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
	RefundReference string     `json:"refundReference,omitempty"`
	FailureCode     string     `json:"failureCode,omitempty"`
	FailureMessage  string     `json:"failureMessage,omitempty"`
}

// GetPaymentSession reads the current state of a previously created payment
// session for reconciliation. It never mutates WLT-owned state.
func (c *Client) GetPaymentSession(ctx context.Context, sessionID string) (*PaymentSessionDetail, error) {
	if !c.Configured() {
		return nil, ErrNotConfigured
	}
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return nil, errors.New("payment session id is required")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/wlt/payment-sessions/"+sessionID, nil)
	if err != nil {
		return nil, fmt.Errorf("build WLT payment session request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: call WLT payment session: %v", ErrPaymentSessionOutcomeUnknown, err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		if response.StatusCode == http.StatusRequestTimeout || response.StatusCode == http.StatusTooManyRequests || response.StatusCode >= 500 {
			return nil, fmt.Errorf("%w: HTTP %d", ErrPaymentSessionOutcomeUnknown, response.StatusCode)
		}
		return nil, PaymentSessionHTTPError{StatusCode: response.StatusCode}
	}

	var envelope struct {
		PaymentSession PaymentSessionDetail `json:"paymentSession"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("%w: decode WLT payment session response: %v", ErrPaymentSessionOutcomeUnknown, err)
	}
	session := envelope.PaymentSession
	if strings.TrimSpace(session.ID) == "" || strings.TrimSpace(session.Status) == "" {
		return nil, fmt.Errorf("%w: WLT payment session response is incomplete", ErrPaymentSessionOutcomeUnknown)
	}
	return &session, nil
}
