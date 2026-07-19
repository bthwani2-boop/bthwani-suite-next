package wlt

import "context"

type BoundSubscriptionPaymentInput struct {
	SubscriptionPurchaseID string
	ProductReference       string
	TenantID               string
	ClientID               string
	PaymentMethod          string
	AmountMinorUnits       int64
	Currency               string
}

// CreateBoundSubscriptionPaymentSession delegates to the single commercial
// payment-session contract. WLT derives and validates the commercial amount;
// DSH must never create subscription sessions through the generic payment path
// or assert independent financial truth from AmountMinorUnits/Currency.
func (c *Client) CreateBoundSubscriptionPaymentSession(
	ctx context.Context,
	input BoundSubscriptionPaymentInput,
	idempotencyKey string,
	correlationID string,
) (*SubscriptionPaymentSession, error) {
	return c.CreateSubscriptionPaymentSession(
		ctx,
		CreateSubscriptionPaymentSessionInput{
			SubscriptionPurchaseID: input.SubscriptionPurchaseID,
			ProductReference:       input.ProductReference,
			TenantID:               input.TenantID,
			ClientID:               input.ClientID,
			PaymentMethod:          input.PaymentMethod,
		},
		idempotencyKey,
		correlationID,
	)
}
