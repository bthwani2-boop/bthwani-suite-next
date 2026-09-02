package wlt

import (
	"context"
	"net/http"
	"net/url"
	"strings"
)

type RenewCommercialSubscriptionInput struct {
	ClientID               string `json:"clientId"`
	ProductReference       string `json:"productReference"`
	PaymentSessionID       string `json:"paymentSessionId"`
	SubscriptionPurchaseID string `json:"subscriptionPurchaseId"`
}

type CancelCommercialSubscriptionInput struct {
	ClientID string `json:"clientId"`
	Reason   string `json:"reason"`
}

func (c *Client) GetCommercialSubscriptionLifecycle(
	ctx context.Context,
	subscriptionID string,
) (*CommercialSubscription, error) {
	var envelope struct {
		Subscription CommercialSubscription `json:"subscription"`
	}
	if err := c.commercialRequest(
		ctx,
		http.MethodGet,
		"/wlt/commercial/subscriptions/"+url.PathEscape(strings.TrimSpace(subscriptionID))+"/lifecycle",
		nil,
		&envelope,
	); err != nil {
		return nil, err
	}
	return &envelope.Subscription, nil
}

func (c *Client) RenewCommercialSubscription(
	ctx context.Context,
	subscriptionID string,
	input RenewCommercialSubscriptionInput,
	idempotencyKey string,
	correlationID string,
) (*CommercialSubscription, error) {
	var envelope struct {
		Subscription CommercialSubscription `json:"subscription"`
	}
	if strings.TrimSpace(idempotencyKey) == "" {
		idempotencyKey = deterministicMutationKey(
			"subscription-renew",
			strings.TrimSpace(subscriptionID),
			strings.TrimSpace(input.SubscriptionPurchaseID),
			strings.TrimSpace(input.PaymentSessionID),
		)
	}
	if strings.TrimSpace(correlationID) == "" {
		correlationID = strings.TrimSpace(input.SubscriptionPurchaseID)
	}
	if err := c.commercialMutationRequest(
		ctx,
		http.MethodPost,
		"/wlt/commercial/subscriptions/"+url.PathEscape(strings.TrimSpace(subscriptionID))+"/renew",
		input,
		idempotencyKey,
		correlationID,
		&envelope,
	); err != nil {
		return nil, err
	}
	return &envelope.Subscription, nil
}

func (c *Client) CancelCommercialSubscription(
	ctx context.Context,
	subscriptionID string,
	input CancelCommercialSubscriptionInput,
	idempotencyKey string,
	correlationID string,
) (*CommercialSubscription, *CommercialSubscriptionCompensation, error) {
	var envelope struct {
		Subscription CommercialSubscription              `json:"subscription"`
		Compensation *CommercialSubscriptionCompensation `json:"compensation,omitempty"`
	}
	if strings.TrimSpace(idempotencyKey) == "" {
		idempotencyKey = deterministicMutationKey(
			"subscription-cancel",
			strings.TrimSpace(subscriptionID),
			strings.TrimSpace(input.ClientID),
			strings.TrimSpace(input.Reason),
		)
	}
	if strings.TrimSpace(correlationID) == "" {
		correlationID = strings.TrimSpace(subscriptionID)
	}
	if err := c.commercialMutationRequest(
		ctx,
		http.MethodPost,
		"/wlt/commercial/subscriptions/"+url.PathEscape(strings.TrimSpace(subscriptionID))+"/cancel",
		input,
		idempotencyKey,
		correlationID,
		&envelope,
	); err != nil {
		return nil, nil, err
	}
	return &envelope.Subscription, envelope.Compensation, nil
}
