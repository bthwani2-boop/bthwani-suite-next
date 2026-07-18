package wlt

import (
	"context"
	"net/http"
)

type BoundSubscriptionPaymentInput struct {
	SubscriptionPurchaseID string
	ProductReference       string
	TenantID               string
	ClientID               string
	PaymentMethod          string
	AmountMinorUnits       int64
	Currency               string
}

func (c *Client) CreateBoundSubscriptionPaymentSession(
	ctx context.Context,
	input BoundSubscriptionPaymentInput,
	idempotencyKey string,
	correlationID string,
) (*SubscriptionPaymentSession, error) {
	var envelope struct {
		PaymentSession SubscriptionPaymentSession `json:"paymentSession"`
	}
	if err := c.commercialMutationRequest(
		ctx,
		http.MethodPost,
		"/wlt/payment-sessions",
		map[string]any{
			"subscriptionPurchaseId":     input.SubscriptionPurchaseID,
			"commercialProductReference": input.ProductReference,
			"tenantId":                   input.TenantID,
			"clientId":                   input.ClientID,
			"storeId":                    "platform-subscriptions",
			"paymentMethod":              input.PaymentMethod,
			"amountMinorUnits":           input.AmountMinorUnits,
			"currency":                   input.Currency,
			"cartSnapshotHash":           "subscription:" + input.ProductReference,
		},
		idempotencyKey,
		correlationID,
		&envelope,
	); err != nil {
		return nil, err
	}
	return &envelope.PaymentSession, nil
}
