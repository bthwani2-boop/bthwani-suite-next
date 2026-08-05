package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type RefundOutboxInput struct {
	OperatorContextID string `json:"operatorContextId"`
	OrderID           string `json:"orderId"`
	ReturnID          string `json:"returnId"`
	AmountMinorUnits  int64  `json:"amountMinorUnits"`
	Reason            string `json:"reason"`
	IdempotencyKey    string `json:"-"`
	CorrelationID     string `json:"-"`
}

type RefundOutboxResult struct {
	ID string `json:"id"`
}

func (c *Client) RefundFromOutbox(ctx context.Context, input RefundOutboxInput) (*RefundOutboxResult, error) {
	if input.OperatorContextID == "" {
		return nil, fmt.Errorf("RefundFromOutbox requires operator context")
	}

	body, err := json.Marshal(map[string]any{
		"operatorContextId":    input.OperatorContextID,
		"orderId":              input.OrderID,
		"amountMinorUnits":     input.AmountMinorUnits,
		"reason":               input.Reason,
		"eligibilityReference": input.ReturnID, // Use the DSH Return Case as the eligibility reference
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/internal/finance/refunds", c.baseURL), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if input.IdempotencyKey != "" {
		req.Header.Set("Idempotency-Key", input.IdempotencyKey)
	}
	if input.CorrelationID != "" {
		req.Header.Set("X-Correlation-ID", input.CorrelationID)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("WLT refund returned status %d", resp.StatusCode)
	}

	var result struct {
		Refund struct {
			ID string `json:"id"`
		} `json:"refund"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &RefundOutboxResult{ID: result.Refund.ID}, nil
}
