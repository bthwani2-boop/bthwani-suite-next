package wlt

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// GetPromotionFundingReservation reads sovereign WLT state for DSH
// reconciliation. It never accepts a tenant inferred from the reservation ID.
func (c *Client) GetPromotionFundingReservation(
	ctx context.Context,
	reservationID string,
	tenantID string,
) (*PromotionFundingReservation, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT promotion funding is not configured")
	}
	reservationID = strings.TrimSpace(reservationID)
	tenantID = strings.TrimSpace(tenantID)
	if reservationID == "" || tenantID == "" {
		return nil, fmt.Errorf("promotion funding reservation and tenant are required")
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		c.baseURL+"/wlt/promotion-funding/reservations/"+url.PathEscape(reservationID),
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("build WLT promotion funding read: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Tenant-ID", tenantID)

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("read WLT promotion funding: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var apiError struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		}
		_ = json.NewDecoder(response.Body).Decode(&apiError)
		return nil, &CommercialHTTPError{
			Status: response.StatusCode,
			Code: strings.TrimSpace(apiError.Code),
			Message: strings.TrimSpace(apiError.Message),
		}
	}

	var envelope struct {
		Reservation PromotionFundingReservation `json:"reservation"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT promotion funding read: %w", err)
	}
	if envelope.Reservation.ID != reservationID || envelope.Reservation.TenantID != tenantID {
		return nil, fmt.Errorf("WLT promotion funding readback identity mismatch")
	}
	return &envelope.Reservation, nil
}
