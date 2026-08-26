package wlt

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

var ErrCanonicalReadbackUnavailable = errors.New("canonical WLT outbox readback unavailable")

func IsCanonicalReadbackUnavailable(err error) bool {
	return errors.Is(err, ErrCanonicalReadbackUnavailable)
}

type OutboxReadbackInput struct {
	EventType         string
	OperatorContextID string
	OrderID           string
	CollectorType     string
	CollectorID       string
	PartnerID         string
	ClientID          string
	CheckoutIntentID  string
	Payload           map[string]any
}

type OutboxReadbackResult struct {
	Present   bool
	Absent    bool
	Reference string
}

// ReadbackOutboxEvent consults WLT-owned read models. It returns Absent only
// when WLT answered successfully and proved the idempotent effect is not there;
// transport, 5xx and malformed responses remain indeterminate.
func (c *Client) ReadbackOutboxEvent(ctx context.Context, input OutboxReadbackInput) (OutboxReadbackResult, error) {
	if !c.Configured() {
		return OutboxReadbackResult{}, ErrCanonicalReadbackUnavailable
	}
	ctx = WithOperatorContext(ctx, strings.TrimSpace(input.OperatorContextID))
	switch input.EventType {
	case "delivery_completed":
		return c.readDeliveryCompletion(ctx, input)
	case "promotion_funding_commit", "promotion_funding_release", "promotion_funding_reverse":
		return c.readPromotionFunding(ctx, input)
	case "loyalty_earned", "loyalty_reversed":
		return c.readLoyaltyEntry(ctx, input)
	case "order_return_approved":
		return c.readRefund(ctx, input)
	default:
		return OutboxReadbackResult{}, fmt.Errorf("%w: unsupported event type %q", ErrCanonicalReadbackUnavailable, input.EventType)
	}
}

func (c *Client) readJSON(ctx context.Context, path string, target any) (int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setDelegatedOperatorContextHeader(req, ""); err != nil {
		return 0, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return 0, fmt.Errorf("%w: %v", ErrCanonicalReadbackUnavailable, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return resp.StatusCode, nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp.StatusCode, fmt.Errorf("%w: WLT readback returned HTTP %d", ErrCanonicalReadbackUnavailable, resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		return resp.StatusCode, fmt.Errorf("%w: decode WLT readback: %v", ErrCanonicalReadbackUnavailable, err)
	}
	return resp.StatusCode, nil
}

func (c *Client) readDeliveryCompletion(ctx context.Context, input OutboxReadbackInput) (OutboxReadbackResult, error) {
	var reservationEnvelope struct {
		CodReservation struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		} `json:"codReservation"`
	}
	status, err := c.readJSON(ctx, "/wlt/cod-reservations/"+url.PathEscape(input.OrderID), &reservationEnvelope)
	if err != nil {
		return OutboxReadbackResult{}, err
	}
	if status == http.StatusNotFound || reservationEnvelope.CodReservation.Status != "finalized" {
		return OutboxReadbackResult{Absent: true}, nil
	}
	query := url.Values{"sourceId": []string{input.OrderID}, "captainId": []string{input.CollectorID}, "limit": []string{"20"}}
	var envelope struct {
		Commissions []struct {
			ID                   string `json:"id"`
			BeneficiaryActorID   string `json:"beneficiaryActorId"`
			BeneficiaryActorType string `json:"beneficiaryActorType"`
			SourceID             string `json:"sourceId"`
		} `json:"commissions"`
	}
	_, err = c.readJSON(ctx, "/wlt/commissions?"+query.Encode(), &envelope)
	if err != nil {
		return OutboxReadbackResult{}, err
	}
	for _, commission := range envelope.Commissions {
		if commission.ID != "" && commission.SourceID == input.OrderID && commission.BeneficiaryActorID == input.CollectorID && commission.BeneficiaryActorType == "captain" {
			return OutboxReadbackResult{Present: true, Reference: reservationEnvelope.CodReservation.ID + ":" + commission.ID}, nil
		}
	}
	return OutboxReadbackResult{Absent: true}, nil
}

func (c *Client) readPromotionFunding(ctx context.Context, input OutboxReadbackInput) (OutboxReadbackResult, error) {
	reservationID, _ := input.Payload["fundingReservationId"].(string)
	if strings.TrimSpace(reservationID) == "" {
		return OutboxReadbackResult{}, fmt.Errorf("%w: reservation id missing", ErrCanonicalReadbackUnavailable)
	}
	var envelope struct {
		Reservation struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		} `json:"reservation"`
	}
	status, err := c.readJSON(ctx, "/wlt/promotion-funding/reservations/"+url.PathEscape(reservationID), &envelope)
	if err != nil {
		return OutboxReadbackResult{}, err
	}
	if status == http.StatusNotFound {
		return OutboxReadbackResult{Absent: true}, nil
	}
	want := map[string]string{"promotion_funding_commit": "committed", "promotion_funding_release": "released", "promotion_funding_reverse": "reversed"}[input.EventType]
	if envelope.Reservation.Status == want {
		return OutboxReadbackResult{Present: true, Reference: envelope.Reservation.ID}, nil
	}
	return OutboxReadbackResult{Absent: true}, nil
}

func (c *Client) readLoyaltyEntry(ctx context.Context, input OutboxReadbackInput) (OutboxReadbackResult, error) {
	key := "order:" + input.OrderID + ":loyalty:earn"
	if input.EventType == "loyalty_reversed" {
		key = "order:" + input.OrderID + ":loyalty:reverse"
	}
	var envelope struct {
		LoyaltyEntry struct {
			ID             string `json:"id"`
			IdempotencyKey string `json:"idempotencyKey"`
		} `json:"loyaltyEntry"`
	}
	status, err := c.readJSON(ctx, "/wlt/internal/outbox-readback/loyalty?idempotencyKey="+url.QueryEscape(key), &envelope)
	if err != nil {
		return OutboxReadbackResult{}, err
	}
	if status == http.StatusNotFound || envelope.LoyaltyEntry.ID == "" {
		return OutboxReadbackResult{Absent: true}, nil
	}
	if envelope.LoyaltyEntry.IdempotencyKey != key {
		return OutboxReadbackResult{}, fmt.Errorf("%w: loyalty readback idempotency mismatch", ErrCanonicalReadbackUnavailable)
	}
	return OutboxReadbackResult{Present: true, Reference: envelope.LoyaltyEntry.ID}, nil
}

func (c *Client) readRefund(ctx context.Context, input OutboxReadbackInput) (OutboxReadbackResult, error) {
	var envelope struct {
		Refunds []struct {
			ID             string `json:"id"`
			IdempotencyKey string `json:"idempotencyKey"`
		} `json:"refunds"`
	}
	_, err := c.readJSON(ctx, "/wlt/refunds?orderId="+url.QueryEscape(input.OrderID), &envelope)
	if err != nil {
		return OutboxReadbackResult{}, err
	}
	returnKey := ""
	if returnID, ok := input.Payload["returnId"].(string); ok && strings.TrimSpace(returnID) != "" {
		returnKey = "order:" + input.OrderID + ":return:" + returnID + ":refund"
	}
	for _, refund := range envelope.Refunds {
		if refund.ID != "" && refund.IdempotencyKey == returnKey {
			return OutboxReadbackResult{Present: true, Reference: refund.ID}, nil
		}
	}
	return OutboxReadbackResult{Absent: true}, nil
}

// FindCancellationRefund reads the deterministic refund created by WLT's
// order-cancellation adapter. Matching the idempotency key avoids treating a
// separate manual refund for the same order as proof of this closure.
func (c *Client) FindCancellationRefund(ctx context.Context, orderID, paymentSessionID string) (string, error) {
	orderID = strings.TrimSpace(orderID)
	paymentSessionID = strings.TrimSpace(paymentSessionID)
	if orderID == "" || paymentSessionID == "" {
		return "", fmt.Errorf("%w: order and payment session are required", ErrCanonicalReadbackUnavailable)
	}
	var envelope struct {
		Refunds []struct {
			ID               string `json:"id"`
			PaymentSessionID string `json:"paymentSessionId"`
			IdempotencyKey   string `json:"idempotencyKey"`
		} `json:"refunds"`
	}
	status, err := c.readJSON(ctx, "/wlt/refunds?orderId="+url.QueryEscape(orderID), &envelope)
	if err != nil {
		return "", err
	}
	if status == http.StatusNotFound {
		return "", nil
	}
	wantKey := "order-cancellation:" + paymentSessionID + ":" + orderID
	for _, item := range envelope.Refunds {
		if strings.TrimSpace(item.ID) != "" && item.PaymentSessionID == paymentSessionID && item.IdempotencyKey == wantKey {
			return item.ID, nil
		}
	}
	return "", nil
}

// GetCodReservation reads the WLT-owned reservation state. A nil result is a
// successful not-found readback, which proves that no reservation remains to
// release; transport and malformed responses remain errors.
func (c *Client) GetCodReservation(ctx context.Context, orderID string) (*CodReservation, error) {
	orderID = strings.TrimSpace(orderID)
	if orderID == "" {
		return nil, fmt.Errorf("%w: order id is required", ErrCanonicalReadbackUnavailable)
	}
	var envelope struct {
		CodReservation *CodReservation `json:"codReservation"`
	}
	status, err := c.readJSON(ctx, "/wlt/cod-reservations/"+url.PathEscape(orderID), &envelope)
	if err != nil {
		return nil, err
	}
	if status == http.StatusNotFound {
		return nil, nil
	}
	if envelope.CodReservation == nil {
		return nil, fmt.Errorf("%w: COD reservation readback is incomplete", ErrCanonicalReadbackUnavailable)
	}
	return envelope.CodReservation, nil
}
