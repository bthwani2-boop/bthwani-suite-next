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

type SubscriptionPaymentSession struct {
	ID                         string  `json:"id"`
	SubscriptionPurchaseID     *string `json:"subscriptionPurchaseId,omitempty"`
	CommercialProductReference *string `json:"commercialProductReference,omitempty"`
	TenantID                   string  `json:"tenantId"`
	ClientID                   string  `json:"clientId"`
	StoreID                    string  `json:"storeId"`
	PaymentMethod              string  `json:"paymentMethod"`
	Status                     string  `json:"status"`
	ProviderReference          string  `json:"providerReference"`
	AmountMinorUnits           int64   `json:"amountMinorUnits"`
	Currency                   string  `json:"currency"`
	CapturedAt                 *string `json:"capturedAt,omitempty"`
	CreatedAt                  string  `json:"createdAt"`
	UpdatedAt                  string  `json:"updatedAt"`
}

type CreateSubscriptionPaymentSessionInput struct {
	SubscriptionPurchaseID string `json:"subscriptionPurchaseId"`
	ProductReference       string `json:"productReference"`
	TenantID               string `json:"tenantId"`
	ClientID               string `json:"clientId"`
	PaymentMethod          string `json:"paymentMethod"`
}

type ActivateCommercialSubscriptionInput struct {
	ClientID               string `json:"clientId"`
	ProductReference       string `json:"productReference"`
	PaymentSessionID       string `json:"paymentSessionId"`
	SubscriptionPurchaseID string `json:"subscriptionPurchaseId"`
}

func (c *Client) commercialMutationRequest(
	ctx context.Context,
	method string,
	path string,
	input any,
	idempotencyKey string,
	correlationID string,
	output any,
) error {
	if !c.Configured() {
		return fmt.Errorf("WLT commercial service is not configured")
	}
	var body io.Reader
	if input != nil {
		encoded, err := json.Marshal(input)
		if err != nil {
			return fmt.Errorf("encode WLT commercial mutation: %w", err)
		}
		body = bytes.NewReader(encoded)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return fmt.Errorf("build WLT commercial mutation: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if input != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if strings.TrimSpace(idempotencyKey) != "" {
		req.Header.Set("Idempotency-Key", strings.TrimSpace(idempotencyKey))
	}
	if strings.TrimSpace(correlationID) != "" {
		req.Header.Set("X-Correlation-ID", strings.TrimSpace(correlationID))
	}
	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT commercial mutation: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var apiError struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		}
		_ = json.NewDecoder(response.Body).Decode(&apiError)
		return &CommercialHTTPError{Status: response.StatusCode, Code: apiError.Code, Message: strings.TrimSpace(apiError.Message)}
	}
	if output == nil {
		return nil
	}
	if err := json.NewDecoder(response.Body).Decode(output); err != nil {
		return fmt.Errorf("decode WLT commercial mutation: %w", err)
	}
	return nil
}

func (c *Client) CreateSubscriptionPaymentSession(
	ctx context.Context,
	input CreateSubscriptionPaymentSessionInput,
	idempotencyKey string,
	correlationID string,
) (*SubscriptionPaymentSession, error) {
	var envelope struct {
		PaymentSession SubscriptionPaymentSession `json:"paymentSession"`
	}
	if err := c.commercialMutationRequest(
		ctx,
		http.MethodPost,
		"/wlt/commercial/payment-sessions",
		input,
		idempotencyKey,
		correlationID,
		&envelope,
	); err != nil {
		return nil, err
	}
	return &envelope.PaymentSession, nil
}

func (c *Client) GetSubscriptionPaymentSession(
	ctx context.Context,
	paymentSessionID string,
) (*SubscriptionPaymentSession, error) {
	var envelope struct {
		PaymentSession SubscriptionPaymentSession `json:"paymentSession"`
	}
	if err := c.commercialRequest(
		ctx,
		http.MethodGet,
		"/wlt/payment-sessions/"+url.PathEscape(strings.TrimSpace(paymentSessionID)),
		nil,
		&envelope,
	); err != nil {
		return nil, err
	}
	return &envelope.PaymentSession, nil
}

func (c *Client) ActivateCommercialSubscription(
	ctx context.Context,
	input ActivateCommercialSubscriptionInput,
	correlationID string,
) (*CommercialSubscription, error) {
	var envelope struct {
		Subscription CommercialSubscription `json:"subscription"`
	}
	if err := c.commercialMutationRequest(
		ctx,
		http.MethodPost,
		"/wlt/commercial/subscriptions",
		input,
		"subscription-activate:"+strings.TrimSpace(input.SubscriptionPurchaseID),
		correlationID,
		&envelope,
	); err != nil {
		return nil, err
	}
	return &envelope.Subscription, nil
}
