package wlt

import (
	"context"
	"net/http"
)

// CreateSubscriptionPaymentSessionViaGeneric uses the existing governed WLT
// payment-session route with the explicit subscription source fields added by
// WLT-029. The generic route remains service-authenticated and mutation-gated.
func (c *Client) CreateSubscriptionPaymentSessionViaGeneric(
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
		"/wlt/payment-sessions",
		map[string]any{
			"subscriptionPurchaseId":     input.SubscriptionPurchaseID,
			"commercialProductReference": input.CommercialProductReference,
			"tenantId":                   input.TenantID,
			"clientId":                   input.ClientID,
			"storeId":                    "platform-subscriptions",
			"paymentMethod":              input.PaymentMethod,
			"amountMinorUnits":           input.AmountMinorUnits,
			"currency":                   input.Currency,
			"cartSnapshotHash":           "subscription:" + input.CommercialProductReference,
		},
		idempotencyKey,
		correlationID,
		&envelope,
	); err != nil {
		return nil, err
	}
	return &envelope.PaymentSession, nil
}
