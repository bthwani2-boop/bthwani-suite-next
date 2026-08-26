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

type CodReservation struct {
	ID                              string     `json:"id"`
	OperatorContextID               string     `json:"operatorContextId"`
	OrderID                         string     `json:"orderId"`
	CheckoutIntentID                string     `json:"checkoutIntentId"`
	CaptainID                       string     `json:"captainId"`
	AmountMinorUnits                int64      `json:"amountMinorUnits"`
	Currency                        string     `json:"currency"`
	Status                          string     `json:"status"`
	IdempotencyKey                  string     `json:"idempotencyKey"`
	ReleaseReason                   string     `json:"releaseReason,omitempty"`
	CreatedAt                       time.Time  `json:"createdAt"`
	UpdatedAt                       time.Time  `json:"updatedAt"`
	ResolvedAt                      *time.Time `json:"resolvedAt,omitempty"`
	FinalizationLedgerTransactionID string     `json:"finalizationLedgerTransactionId,omitempty"`
}

func (c *Client) ReserveCodCapacity(
	ctx context.Context,
	orderID string,
	checkoutIntentID string,
	captainID string,
	amountMinorUnits int64,
	currency string,
	correlationID string,
	idempotencyKey string,
) (*CodReservation, bool, error) {
	if !c.Configured() {
		return nil, false, fmt.Errorf("WLT integration is not configured")
	}
	orderID = strings.TrimSpace(orderID)
	checkoutIntentID = strings.TrimSpace(checkoutIntentID)
	if orderID == "" || checkoutIntentID == "" {
		return nil, false, fmt.Errorf("orderId and checkoutIntentId are required")
	}

	payload, err := json.Marshal(map[string]any{
		"orderId":          orderID,
		"checkoutIntentId": checkoutIntentID,
		"captainId":        captainID,
		"amountMinorUnits": amountMinorUnits,
		"currency":         currency,
	})
	if err != nil {
		return nil, false, fmt.Errorf("encode request: %v", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/wlt/cod-reservations/reserve",
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, false, fmt.Errorf("build request: %v", err)
	}
	setServiceHeaders(req, c.serviceToken)
	c.setDelegatedOperatorContextHeader(req, "")
	correlationID = strings.TrimSpace(correlationID)
	if correlationID == "" {
		correlationID = orderID
	}
	if idempotencyKey = strings.TrimSpace(idempotencyKey); idempotencyKey == "" {
		idempotencyKey = deterministicMutationKey("cod-reserve", orderID, captainID, fmt.Sprint(amountMinorUnits), currency)
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return nil, false, fmt.Errorf("prepare WLT COD reservation mutation: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return nil, false, fmt.Errorf("call WLT: %v", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, 64<<10))
	if err != nil {
		return nil, false, fmt.Errorf("read response: %v", err)
	}

	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusConflict {
		return nil, false, fmt.Errorf("WLT returned %s: %s", response.Status, string(body))
	}

	var envelope struct {
		CodReservation *CodReservation `json:"codReservation"`
		Replayed       bool            `json:"replayed"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, false, fmt.Errorf("decode response: %v", err)
	}

	if response.StatusCode == http.StatusConflict {
		var errEnvelope struct {
			Code    string `json:"code"`
			Message string `json:"message"`
			Error   *struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error,omitempty"`
		}
		if err := json.Unmarshal(body, &errEnvelope); err == nil && errEnvelope.Code != "" {
			return nil, false, fmt.Errorf("WLT reserve error: %s: %s", errEnvelope.Code, errEnvelope.Message)
		}
		if errEnvelope.Error != nil && errEnvelope.Error.Code != "" {
			return nil, false, fmt.Errorf("WLT reserve error: %s: %s", errEnvelope.Error.Code, errEnvelope.Error.Message)
		}
		return nil, false, fmt.Errorf("WLT reserve conflict")
	}

	if envelope.CodReservation == nil {
		return nil, false, fmt.Errorf("missing reservation in response")
	}
	return envelope.CodReservation, envelope.Replayed, nil
}

func (c *Client) FinalizeCodReservation(
	ctx context.Context,
	orderID string,
	checkoutIntentID string,
	correlationID string,
	idempotencyKey string,
) (*CodReservation, bool, error) {
	if !c.Configured() {
		return nil, false, fmt.Errorf("WLT integration is not configured")
	}
	orderID = strings.TrimSpace(orderID)
	checkoutIntentID = strings.TrimSpace(checkoutIntentID)
	if orderID == "" || checkoutIntentID == "" {
		return nil, false, fmt.Errorf("orderId and checkoutIntentId are required")
	}
	body, err := json.Marshal(map[string]string{
		"orderId":          orderID,
		"checkoutIntentId": checkoutIntentID,
	})
	if err != nil {
		return nil, false, fmt.Errorf("encode request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/cod-reservations/finalize", bytes.NewReader(body))
	if err != nil {
		return nil, false, fmt.Errorf("build request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	c.setDelegatedOperatorContextHeader(req, "")
	correlationID = strings.TrimSpace(correlationID)
	if correlationID == "" {
		correlationID = orderID
	}
	if idempotencyKey = strings.TrimSpace(idempotencyKey); idempotencyKey == "" {
		idempotencyKey = deterministicMutationKey("cod-finalize", orderID, checkoutIntentID)
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return nil, false, fmt.Errorf("prepare WLT COD finalization mutation: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return nil, false, fmt.Errorf("call WLT: %w", err)
	}
	defer response.Body.Close()
	bodyBytes, err := io.ReadAll(io.LimitReader(response.Body, 64<<10))
	if err != nil {
		return nil, false, fmt.Errorf("read response: %w", err)
	}
	if response.StatusCode != http.StatusOK {
		return nil, false, fmt.Errorf("WLT COD finalization returned %s: %s", response.Status, string(bodyBytes))
	}
	var envelope struct {
		CodReservation *CodReservation `json:"codReservation"`
		Replayed       bool            `json:"replayed"`
	}
	if err := json.Unmarshal(bodyBytes, &envelope); err != nil {
		return nil, false, fmt.Errorf("decode response: %w", err)
	}
	if envelope.CodReservation == nil {
		return nil, false, fmt.Errorf("missing finalized reservation in response")
	}
	return envelope.CodReservation, envelope.Replayed, nil
}

func (c *Client) ReleaseCodReservation(
	ctx context.Context,
	orderID string,
	reason string,
	correlationID string,
) (*CodReservation, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT integration is not configured")
	}
	orderID = strings.TrimSpace(orderID)
	if orderID == "" {
		return nil, fmt.Errorf("orderId is required")
	}

	payload, err := json.Marshal(map[string]any{
		"orderId": orderID,
		"reason":  reason,
	})
	if err != nil {
		return nil, fmt.Errorf("encode request: %v", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/wlt/cod-reservations/release",
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, fmt.Errorf("build request: %v", err)
	}
	setServiceHeaders(req, c.serviceToken)
	c.setDelegatedOperatorContextHeader(req, "")
	correlationID = strings.TrimSpace(correlationID)
	if correlationID == "" {
		correlationID = orderID
	}
	if err := setRequiredMutationHeaders(req, correlationID, deterministicMutationKey("cod-release", orderID, reason)); err != nil {
		return nil, fmt.Errorf("prepare WLT COD release mutation: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: call WLT COD release: %v", ErrMutationOutcomeUnknown, err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, 64<<10))
	if err != nil {
		return nil, fmt.Errorf("%w: read WLT COD release response: %v", ErrMutationOutcomeUnknown, err)
	}

	if response.StatusCode == http.StatusRequestTimeout || response.StatusCode == http.StatusTooManyRequests || response.StatusCode >= 500 {
		return nil, fmt.Errorf("%w: WLT COD release returned HTTP %d", ErrMutationOutcomeUnknown, response.StatusCode)
	}
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("WLT returned %s: %s", response.Status, string(body))
	}

	var envelope struct {
		CodReservation *CodReservation `json:"codReservation"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("%w: decode WLT COD release response: %v", ErrMutationOutcomeUnknown, err)
	}
	if envelope.CodReservation == nil {
		return nil, fmt.Errorf("%w: missing reservation in WLT COD release response", ErrMutationOutcomeUnknown)
	}
	return envelope.CodReservation, nil
}
