package wlt

import (
	"context"
	"net/http"
)

type AppendLoyaltyEntryInput struct {
	ClientID       string         `json:"clientId"`
	Direction      string         `json:"direction"`
	Points         int64          `json:"points"`
	SourceType     string         `json:"sourceType"`
	SourceID       string         `json:"sourceId"`
	ReversalOf     string         `json:"reversalOf,omitempty"`
	IdempotencyKey string         `json:"idempotencyKey"`
	CorrelationID  string         `json:"correlationId,omitempty"`
	Metadata       map[string]any `json:"metadata"`
}

type LoyaltyEntry struct {
	ID             string         `json:"id"`
	ClientID       string         `json:"clientId"`
	Direction      string         `json:"direction"`
	Points         int64          `json:"points"`
	BalanceAfter   int64          `json:"balanceAfter"`
	SourceType     string         `json:"sourceType"`
	SourceID       string         `json:"sourceId"`
	ReversalOf     *string        `json:"reversalOf,omitempty"`
	IdempotencyKey string         `json:"idempotencyKey"`
	Metadata       map[string]any `json:"metadata"`
	CreatedAt      string         `json:"createdAt"`
}

func (c *Client) AppendLoyaltyEntry(ctx context.Context, input AppendLoyaltyEntryInput) (*LoyaltyEntry, error) {
	var envelope struct {
		Entry LoyaltyEntry `json:"entry"`
	}
	if err := c.commercialRequest(ctx, http.MethodPost, "/wlt/commercial/loyalty-entries", input, &envelope); err != nil {
		return nil, err
	}
	return &envelope.Entry, nil
}
