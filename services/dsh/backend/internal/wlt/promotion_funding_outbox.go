package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// PromotionFundingOutboxInput is used only by the durable DSH outbox worker.
// The transition is idempotent in WLT and carries the OperatorContext explicitly.
type PromotionFundingOutboxInput struct {
	OperatorContextID       string `json:"operatorContextId"`
	OrderID        string `json:"orderId,omitempty"`
	Reason         string `json:"reason,omitempty"`
	IdempotencyKey string `json:"-"`
	CorrelationID  string `json:"-"`
}

type PromotionFundingOutboxResult struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

func (c *Client) TransitionPromotionFundingFromOutbox(
	ctx context.Context,
	reservationID, transition string,
	input PromotionFundingOutboxInput,
) (*PromotionFundingOutboxResult, error) {
	reservationID = strings.TrimSpace(reservationID)
	transition = strings.TrimSpace(transition)
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if reservationID == "" || input.OperatorContextID == "" || input.IdempotencyKey == "" || input.CorrelationID == "" {
		return nil, fmt.Errorf("invalid promotion funding outbox request")
	}
	if transition != "commit" && transition != "release" && transition != "reverse" {
		return nil, fmt.Errorf("invalid promotion funding transition")
	}
	if !c.Configured() {
		return nil, fmt.Errorf("WLT promotion funding service is not configured")
	}
	payload, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("encode WLT promotion funding transition: %w", err)
	}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/wlt/promotion-funding/reservations/"+url.PathEscape(reservationID)+"/"+transition,
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, fmt.Errorf("build WLT promotion funding transition: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Operator-Context-ID", input.OperatorContextID)
	if err := setRequiredMutationHeaders(req, input.CorrelationID, input.IdempotencyKey); err != nil {
		return nil, fmt.Errorf("prepare WLT promotion funding outbox mutation: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT promotion funding transition: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var apiError struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		}
		_ = json.NewDecoder(response.Body).Decode(&apiError)
		return nil, &CommercialHTTPError{
			Status:  response.StatusCode,
			Code:    apiError.Code,
			Message: apiError.Message,
		}
	}
	var envelope struct {
		Reservation PromotionFundingOutboxResult `json:"reservation"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT promotion funding transition: %w", err)
	}
	return &envelope.Reservation, nil
}
