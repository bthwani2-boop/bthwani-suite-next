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
	ID                string    `json:"id"`
	OperatorContextID string    `json:"operatorContextId"`
	OrderID           string    `json:"orderId"`
	CaptainID         string    `json:"captainId"`
	AmountMinorUnits  int64     `json:"amountMinorUnits"`
	Currency          string    `json:"currency"`
	Status            string    `json:"status"`
	IdempotencyKey    string    `json:"idempotencyKey"`
	ReleaseReason     string    `json:"releaseReason,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
	ResolvedAt        *time.Time `json:"resolvedAt,omitempty"`
}

func (c *Client) ReserveCodCapacity(
	ctx context.Context,
	orderID string,
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
	if orderID == "" {
		return nil, false, fmt.Errorf("orderId is required")
	}

	payload, err := json.Marshal(map[string]any{
		"orderId":          orderID,
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
	c.setTrustedOperatorContextHeader(req, "")
	req.Header.Set("X-Correlation-Id", correlationID)
	req.Header.Set("Idempotency-Key", idempotencyKey)

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
		// Return error but with the response details if possible?
		// But in typical WLT client, conflict implies error.
		var errEnvelope struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.Unmarshal(body, &errEnvelope); err == nil && errEnvelope.Error.Code != "" {
			return nil, false, fmt.Errorf("WLT reserve error: %s: %s", errEnvelope.Error.Code, errEnvelope.Error.Message)
		}
		return nil, false, fmt.Errorf("WLT reserve conflict")
	}

	if envelope.CodReservation == nil {
		return nil, false, fmt.Errorf("missing reservation in response")
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
	c.setTrustedOperatorContextHeader(req, "")
	req.Header.Set("X-Correlation-Id", correlationID)
	// no idempotency key for release, it's idempotent by definition

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT: %v", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, 64<<10))
	if err != nil {
		return nil, fmt.Errorf("read response: %v", err)
	}

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("WLT returned %s: %s", response.Status, string(body))
	}

	var envelope struct {
		CodReservation *CodReservation `json:"codReservation"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("decode response: %v", err)
	}
	if envelope.CodReservation == nil {
		return nil, fmt.Errorf("missing reservation in response")
	}
	return envelope.CodReservation, nil
}

func (c *Client) FinalizeCodReservation(
	ctx context.Context,
	orderID string,
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
	})
	if err != nil {
		return nil, fmt.Errorf("encode request: %v", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/wlt/cod-reservations/finalize",
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, fmt.Errorf("build request: %v", err)
	}
	setServiceHeaders(req, c.serviceToken)
	c.setTrustedOperatorContextHeader(req, "")
	req.Header.Set("X-Correlation-Id", correlationID)

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT: %v", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, 64<<10))
	if err != nil {
		return nil, fmt.Errorf("read response: %v", err)
	}

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("WLT returned %s: %s", response.Status, string(body))
	}

	var envelope struct {
		CodReservation *CodReservation `json:"codReservation"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("decode response: %v", err)
	}
	if envelope.CodReservation == nil {
		return nil, fmt.Errorf("missing reservation in response")
	}
	return envelope.CodReservation, nil
}
