package wlt

import "context"

type BoundSubscriptionPaymentInput struct {
	SubscriptionPurchaseID string
	ProductReference       string
	OperatorContextID      string
	ClientID               string
	PaymentMethod          string
}

// CreateBoundSubscriptionPaymentSession delegates to the single commercial
// payment-session contract declared by boundSubscriptionPaymentRoute. WLT
// derives and validates the commercial amount; DSH must never create
// subscription sessions through the generic payment path or assert independent
// financial truth.
func (c *Client) CreateBoundSubscriptionPaymentSession(
	ctx context.Context,
	input BoundSubscriptionPaymentInput,
	idempotencyKey string,
	correlationID string,
) (*SubscriptionPaymentSession, error) {
	return c.CreateSubscriptionPaymentSession(
		ctx,
		CreateSubscriptionPaymentSessionInput(input),
		idempotencyKey,
		correlationID,
	)
}
