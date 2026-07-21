package wlt

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

type PaymentSession struct {
	ID               string     `json:"id"`
	IdempotencyKey   string     `json:"idempotencyKey"`
	ActorID          string     `json:"actorId"`
	StoreID          string     `json:"storeId"`
	Method           string     `json:"method"`
	Amount           int64      `json:"amount"`
	Currency         string     `json:"currency"`
	Status           string     `json:"status"`
	Reference        string     `json:"reference"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	ExpiresAt        *time.Time `json:"expiresAt,omitempty"`
	RefundReference  string     `json:"refundReference,omitempty"`
	FailureCode      string     `json:"failureCode,omitempty"`
	FailureMessage   string     `json:"failureMessage,omitempty"`
}

func (c *Client) GetPaymentSession(ctx context.Context, sessionID string) (*PaymentSession, error) {
	if !c.Configured() {
		return nil, ErrNotConfigured
	}
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return nil, errors.New("payment session id is required")
	}
	var session PaymentSession
	if err := c.requestJSON(ctx, "GET", "/payment-sessions/"+sessionID, nil, &session); err != nil {
		return nil, fmt.Errorf("get WLT payment session: %w", err)
	}
	if strings.TrimSpace(session.ID) == "" || strings.TrimSpace(session.Status) == "" {
		return nil, errors.New("WLT payment session response is incomplete")
	}
	return &session, nil
}
