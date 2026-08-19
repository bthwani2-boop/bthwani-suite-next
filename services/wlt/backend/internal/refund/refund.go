package refund

import "errors"

var ErrSessionNotRefundable = errors.New("payment session is not in a refundable state")
var ErrRefundNotInExpectedState = errors.New("refund is not in the expected state for this transition")

// Refund is the compact cancellation response projection retained for the
// DSH order-cancellation envelope. WLT financial state itself is represented
// by GovernedRefund and remains authoritative there.
type Refund struct {
	ID               string  `json:"id"`
	PaymentSessionID string  `json:"paymentSessionId"`
	OrderID          string  `json:"orderId"`
	ClientID         string  `json:"clientId"`
	AmountMinorUnits int64   `json:"amountMinorUnits"`
	Currency         string  `json:"currency"`
	Reason           string  `json:"reason"`
	Status           string  `json:"status"`
	ResolvedAt       *string `json:"resolvedAt"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

type CreateRefundInput struct {
	PaymentSessionID string `json:"paymentSessionId"`
	OrderID          string `json:"orderId"`
	ClientID         string `json:"clientId"`
	Reason           string `json:"reason"`
}
