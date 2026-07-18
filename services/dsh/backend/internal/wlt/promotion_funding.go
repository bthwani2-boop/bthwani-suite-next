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

type PromotionFundingReservation struct {
	ID                        string  `json:"id"`
	TenantID                  string  `json:"tenantId"`
	ExternalReference         string  `json:"externalReference"`
	CheckoutIntentID          string  `json:"checkoutIntentId"`
	CouponRedemptionID        string  `json:"couponRedemptionId"`
	CouponID                  string  `json:"couponId"`
	ClientID                  string  `json:"clientId"`
	PartnerID                 *string `json:"partnerId,omitempty"`
	PlatformFundedMinorUnits  int64   `json:"platformFundedMinorUnits"`
	PartnerFundedMinorUnits   int64   `json:"partnerFundedMinorUnits"`
	TotalDiscountMinorUnits   int64   `json:"totalDiscountMinorUnits"`
	Currency                  string  `json:"currency"`
	Status                    string  `json:"status"`
	OrderID                   *string `json:"orderId,omitempty"`
	CreatedAt                 string  `json:"createdAt"`
	UpdatedAt                 string  `json:"updatedAt"`
}

type ReservePromotionFundingInput struct {
	TenantID                 string `json:"tenantId"`
	ExternalReference        string `json:"externalReference"`
	CheckoutIntentID         string `json:"checkoutIntentId"`
	CouponRedemptionID       string `json:"couponRedemptionId"`
	CouponID                 string `json:"couponId"`
	ClientID                 string `json:"clientId"`
	PartnerID                string `json:"partnerId,omitempty"`
	PlatformFundedMinorUnits int64  `json:"platformFundedMinorUnits"`
	PartnerFundedMinorUnits  int64  `json:"partnerFundedMinorUnits"`
	TotalDiscountMinorUnits  int64  `json:"totalDiscountMinorUnits"`
	Currency                 string `json:"currency"`
}

type PromotionFundingTransitionInput struct {
	TenantID string `json:"tenantId"`
	OrderID  string `json:"orderId,omitempty"`
	Reason   string `json:"reason,omitempty"`
}

func (c *Client) promotionFundingRequest(
	ctx context.Context,
	method string,
	path string,
	tenantID string,
	idempotencyKey string,
	correlationID string,
	input any,
) (*PromotionFundingReservation, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT promotion funding is not configured")
	}
	encoded, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("encode WLT promotion funding request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(encoded))
	if err != nil {
		return nil, fmt.Errorf("build WLT promotion funding request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Tenant-ID", strings.TrimSpace(tenantID))
	req.Header.Set("Idempotency-Key", strings.TrimSpace(idempotencyKey))
	req.Header.Set("X-Correlation-ID", strings.TrimSpace(correlationID))

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT promotion funding: %w", err)
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
			Code:    strings.TrimSpace(apiError.Code),
			Message: strings.TrimSpace(apiError.Message),
		}
	}
	var envelope struct {
		Reservation PromotionFundingReservation `json:"reservation"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT promotion funding response: %w", err)
	}
	if envelope.Reservation.ID == "" {
		return nil, fmt.Errorf("WLT promotion funding response is missing reservation id")
	}
	return &envelope.Reservation, nil
}

func (c *Client) ReservePromotionFunding(
	ctx context.Context,
	input ReservePromotionFundingInput,
	idempotencyKey string,
	correlationID string,
) (*PromotionFundingReservation, error) {
	return c.promotionFundingRequest(
		ctx,
		http.MethodPost,
		"/wlt/promotion-funding/reservations",
		input.TenantID,
		idempotencyKey,
		correlationID,
		input,
	)
}

func (c *Client) transitionPromotionFunding(
	ctx context.Context,
	reservationID string,
	action string,
	input PromotionFundingTransitionInput,
	idempotencyKey string,
	correlationID string,
) (*PromotionFundingReservation, error) {
	return c.promotionFundingRequest(
		ctx,
		http.MethodPost,
		"/wlt/promotion-funding/reservations/"+url.PathEscape(strings.TrimSpace(reservationID))+"/"+action,
		input.TenantID,
		idempotencyKey,
		correlationID,
		input,
	)
}

func (c *Client) CommitPromotionFunding(
	ctx context.Context,
	reservationID string,
	input PromotionFundingTransitionInput,
	idempotencyKey string,
	correlationID string,
) (*PromotionFundingReservation, error) {
	return c.transitionPromotionFunding(ctx, reservationID, "commit", input, idempotencyKey, correlationID)
}

func (c *Client) ReleasePromotionFunding(
	ctx context.Context,
	reservationID string,
	input PromotionFundingTransitionInput,
	idempotencyKey string,
	correlationID string,
) (*PromotionFundingReservation, error) {
	return c.transitionPromotionFunding(ctx, reservationID, "release", input, idempotencyKey, correlationID)
}

func (c *Client) ReversePromotionFunding(
	ctx context.Context,
	reservationID string,
	input PromotionFundingTransitionInput,
	idempotencyKey string,
	correlationID string,
) (*PromotionFundingReservation, error) {
	return c.transitionPromotionFunding(ctx, reservationID, "reverse", input, idempotencyKey, correlationID)
}
