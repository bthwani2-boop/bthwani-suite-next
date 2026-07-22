package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

type CancelSessionForOrderInput struct {
	OrderID       string `json:"orderId"`
	ClientID      string `json:"clientId"`
	Reason        string `json:"reason"`
	CorrelationID string `json:"-"`
}

type CancelSessionForOrderResult struct {
	Action           string `json:"action"`
	SessionStatus    string `json:"sessionStatus,omitempty"`
	RefundID         string `json:"refundId,omitempty"`
	PaymentSessionID string `json:"paymentSessionId,omitempty"`
}

// CancelSessionForOrder preserves the established error-only contract for
// callers and tests that do not need the financial result projection.
func (c *Client) CancelSessionForOrder(
	ctx context.Context,
	paymentSessionID string,
	input CancelSessionForOrderInput,
) error {
	_, err := c.CancelSessionForOrderWithResult(ctx, paymentSessionID, input)
	return err
}

// CancelSessionForOrderWithResult is used by the durable DSH outbox worker to
// project WLT's expire/refund/no-op decision back onto the order journey.
func (c *Client) CancelSessionForOrderWithResult(
	ctx context.Context,
	paymentSessionID string,
	input CancelSessionForOrderInput,
) (*CancelSessionForOrderResult, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT payment-session handoff is not configured")
	}
	paymentSessionID = strings.TrimSpace(paymentSessionID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	if paymentSessionID == "" || input.OrderID == "" || input.ClientID == "" || input.Reason == "" {
		return nil, fmt.Errorf("paymentSessionId, orderId, clientId, and reason are required")
	}
	requestBody := struct {
		PaymentSessionID string `json:"paymentSessionId"`
		OrderID          string `json:"orderId"`
		ClientID         string `json:"clientId"`
		Reason           string `json:"reason"`
	}{
		PaymentSessionID: paymentSessionID,
		OrderID:          input.OrderID,
		ClientID:         input.ClientID,
		Reason:           input.Reason,
	}
	body, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("encode WLT cancel-for-order request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/order-cancellations", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build WLT cancel-for-order request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = "order-cancellation-" + input.OrderID
	}
	if err := setRequiredMutationHeaders(
		req,
		correlationID,
		deterministicMutationKey("cancel-session-for-order", paymentSessionID, input.OrderID),
	); err != nil {
		return nil, fmt.Errorf("prepare WLT cancel-for-order request: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT cancel-for-order: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("WLT cancel-for-order returned HTTP %d", response.StatusCode)
	}

	var envelope struct {
		Action         string `json:"action"`
		SessionStatus  string `json:"sessionStatus"`
		PaymentSession *struct {
			ID string `json:"id"`
		} `json:"paymentSession"`
		Refund *struct {
			ID string `json:"id"`
		} `json:"refund"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT cancel-for-order response: %w", err)
	}
	action := strings.TrimSpace(envelope.Action)
	if action != "expired" && action != "refund_requested" && action != "none" {
		return nil, fmt.Errorf("WLT cancel-for-order returned unsupported action %q", action)
	}
	result := &CancelSessionForOrderResult{
		Action:        action,
		SessionStatus: strings.TrimSpace(envelope.SessionStatus),
	}
	if envelope.PaymentSession != nil {
		result.PaymentSessionID = strings.TrimSpace(envelope.PaymentSession.ID)
	}
	if envelope.Refund != nil {
		result.RefundID = strings.TrimSpace(envelope.Refund.ID)
	}

	switch action {
	case "expired":
		if result.PaymentSessionID == "" || result.PaymentSessionID != paymentSessionID {
			return nil, fmt.Errorf("WLT expired result does not identify the requested payment session")
		}
	case "refund_requested":
		if result.RefundID == "" {
			return nil, fmt.Errorf("WLT refund_requested result is missing refund id")
		}
	case "none":
		if result.SessionStatus == "" {
			return nil, fmt.Errorf("WLT none result is missing session status")
		}
	}
	return result, nil
}
