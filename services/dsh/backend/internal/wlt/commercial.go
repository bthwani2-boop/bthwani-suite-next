package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type CommercialHTTPError struct {
	Status  int
	Code    string
	Message string
}

func (e *CommercialHTTPError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("WLT commercial HTTP %d %s: %s", e.Status, e.Code, e.Message)
	}
	return fmt.Sprintf("WLT commercial HTTP %d: %s", e.Status, e.Message)
}

type CommercialProduct struct {
	Reference         string  `json:"reference"`
	ProductType       string  `json:"productType"`
	DisplayName       string  `json:"displayName"`
	PriceMinorUnits   int64   `json:"priceMinorUnits"`
	Currency          string  `json:"currency"`
	BillingCycle      string  `json:"billingCycle"`
	Status            string  `json:"status"`
	Version           int     `json:"version"`
	CreatedByActorID  string  `json:"createdByActorId"`
	ApprovedByActorID *string `json:"approvedByActorId,omitempty"`
	ApprovedAt        *string `json:"approvedAt,omitempty"`
	CreatedAt         string  `json:"createdAt"`
	UpdatedAt         string  `json:"updatedAt"`
}

type CreateCommercialProductInput struct {
	Reference        string `json:"reference"`
	DisplayName      string `json:"displayName"`
	PriceMinorUnits  int64  `json:"priceMinorUnits"`
	Currency         string `json:"currency"`
	BillingCycle     string `json:"billingCycle"`
	CreatedByActorID string `json:"createdByActorId"`
}

type UpdateCommercialProductInput struct {
	DisplayName     *string `json:"displayName,omitempty"`
	PriceMinorUnits *int64  `json:"priceMinorUnits,omitempty"`
	Currency        *string `json:"currency,omitempty"`
	BillingCycle    *string `json:"billingCycle,omitempty"`
	Status          *string `json:"status,omitempty"`
	ExpectedVersion int     `json:"expectedVersion"`
	ActorID         string  `json:"actorId"`
}

type CommercialLoyaltyAccount struct {
	ClientID       string  `json:"clientId"`
	PointsBalance  int64   `json:"pointsBalance"`
	LifetimePoints int64   `json:"lifetimePoints"`
	TierReference  *string `json:"tierReference,omitempty"`
	UpdatedAt      string  `json:"updatedAt"`
}

type CommercialSubscription struct {
	ID               string  `json:"id"`
	ClientID         string  `json:"clientId"`
	ProductReference string  `json:"productReference"`
	Status           string  `json:"status"`
	PaymentSessionID *string `json:"paymentSessionId,omitempty"`
	StartsAt         string  `json:"startsAt"`
	EndsAt           *string `json:"endsAt,omitempty"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

type ClientCommercialBenefits struct {
	LoyaltyAccount     *CommercialLoyaltyAccount `json:"loyaltyAccount,omitempty"`
	ActiveSubscription *CommercialSubscription   `json:"activeSubscription,omitempty"`
}

type CommercialSummary struct {
	ActiveProducts             int64 `json:"activeProducts"`
	ActiveSubscriptions        int64 `json:"activeSubscriptions"`
	MonthlyRecurringMinorUnits int64 `json:"monthlyRecurringMinorUnits"`
	LoyaltyAccounts            int64 `json:"loyaltyAccounts"`
	PointsIssuedThisMonth      int64 `json:"pointsIssuedThisMonth"`
}

func (c *Client) commercialRequest(
	ctx context.Context,
	method string,
	path string,
	input any,
	output any,
) error {
	if !c.Configured() {
		return fmt.Errorf("WLT commercial service is not configured")
	}
	var body io.Reader
	if input != nil {
		encoded, err := json.Marshal(input)
		if err != nil {
			return fmt.Errorf("encode WLT commercial request: %w", err)
		}
		body = bytes.NewReader(encoded)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return fmt.Errorf("build WLT commercial request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if input != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT commercial service: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var apiError struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		}
		_ = json.NewDecoder(response.Body).Decode(&apiError)
		return &CommercialHTTPError{
			Status:  response.StatusCode,
			Code:    apiError.Code,
			Message: strings.TrimSpace(apiError.Message),
		}
	}
	if output == nil {
		return nil
	}
	if err := json.NewDecoder(response.Body).Decode(output); err != nil {
		return fmt.Errorf("decode WLT commercial response: %w", err)
	}
	return nil
}

func (c *Client) GetCommercialProduct(ctx context.Context, reference string) (*CommercialProduct, error) {
	var envelope struct {
		Product CommercialProduct `json:"product"`
	}
	err := c.commercialRequest(
		ctx,
		http.MethodGet,
		"/wlt/commercial/products/"+url.PathEscape(strings.TrimSpace(reference)),
		nil,
		&envelope,
	)
	if err != nil {
		return nil, err
	}
	return &envelope.Product, nil
}

func (c *Client) CreateCommercialProduct(ctx context.Context, input CreateCommercialProductInput) (*CommercialProduct, error) {
	var envelope struct {
		Product CommercialProduct `json:"product"`
	}
	if err := c.commercialRequest(ctx, http.MethodPost, "/wlt/commercial/products", input, &envelope); err != nil {
		return nil, err
	}
	return &envelope.Product, nil
}

func (c *Client) UpdateCommercialProduct(
	ctx context.Context,
	reference string,
	input UpdateCommercialProductInput,
) (*CommercialProduct, error) {
	var envelope struct {
		Product CommercialProduct `json:"product"`
	}
	err := c.commercialRequest(
		ctx,
		http.MethodPatch,
		"/wlt/commercial/products/"+url.PathEscape(strings.TrimSpace(reference)),
		input,
		&envelope,
	)
	if err != nil {
		return nil, err
	}
	return &envelope.Product, nil
}

func (c *Client) GetClientCommercialBenefits(ctx context.Context, clientID string) (*ClientCommercialBenefits, error) {
	var envelope struct {
		Benefits ClientCommercialBenefits `json:"benefits"`
	}
	err := c.commercialRequest(
		ctx,
		http.MethodGet,
		"/wlt/commercial/clients/"+url.PathEscape(strings.TrimSpace(clientID))+"/benefits",
		nil,
		&envelope,
	)
	if err != nil {
		return nil, err
	}
	return &envelope.Benefits, nil
}

func (c *Client) GetCommercialSummary(ctx context.Context) (*CommercialSummary, error) {
	var envelope struct {
		Summary CommercialSummary `json:"summary"`
	}
	if err := c.commercialRequest(ctx, http.MethodGet, "/wlt/commercial/summary", nil, &envelope); err != nil {
		return nil, err
	}
	return &envelope.Summary, nil
}
