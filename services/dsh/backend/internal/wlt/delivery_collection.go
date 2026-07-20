package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type NotifyDeliveryCollectionInput struct {
	OrderID          string `json:"orderId"`
	CollectorType    string `json:"collectorType"`
	CollectorID      string `json:"collectorId"`
	PartnerID        string `json:"partnerId"`
	CheckoutIntentID string `json:"checkoutIntentId"`
}

func (c *Client) NotifyDeliveryCollection(ctx context.Context, input NotifyDeliveryCollectionInput) error {
	if !c.Configured() {
		return fmt.Errorf("WLT delivery collection handoff is not configured")
	}
	if input.OrderID == "" || input.CollectorType == "" || input.CollectorID == "" ||
		input.PartnerID == "" || input.CheckoutIntentID == "" {
		return fmt.Errorf("order, collector, partner, and checkout intent references are required")
	}
	body, err := json.Marshal(input)
	if err != nil {
		return fmt.Errorf("encode WLT delivery collection request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/delivery-collections", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build WLT delivery collection request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if err := setRequiredMutationHeaders(
		req,
		"dsh-delivery-collection-"+input.OrderID,
		deterministicMutationKey("delivery-collection", input.OrderID),
	); err != nil {
		return fmt.Errorf("prepare WLT delivery collection request: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT delivery collection: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT delivery collection returned HTTP %d", response.StatusCode)
	}
	return nil
}
