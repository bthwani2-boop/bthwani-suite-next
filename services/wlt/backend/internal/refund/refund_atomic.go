package refund

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"wlt-api/internal/shared"
)

var ErrRefundReferenceConflict = errors.New("refund references do not match the payment session")

func cancellationRefundView(item *GovernedRefund) *Refund {
	if item == nil {
		return nil
	}
	return &Refund{
		ID: item.ID, PaymentSessionID: item.PaymentSessionID, OrderID: item.OrderID,
		ClientID: item.ClientID, AmountMinorUnits: item.AmountMinorUnits,
		Currency: item.Currency, Reason: item.Reason, Status: item.Status,
		ResolvedAt: item.ResolvedAt, CreatedAt: item.CreatedAt, UpdatedAt: item.UpdatedAt,
	}
}

func requireRefundOperatorContextForSession(ctx context.Context, db *sql.DB, paymentSessionID string) (string, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return "", err
	}
	var storedOperatorContextID string
	if err := db.QueryRowContext(ctx, `
                SELECT operator_context_id FROM wlt_payment_sessions WHERE id=$1`, paymentSessionID).Scan(&storedOperatorContextID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", fmt.Errorf("payment session not found")
		}
		return "", err
	}
	storedOperatorContextID = strings.TrimSpace(storedOperatorContextID)
	if storedOperatorContextID == "" || storedOperatorContextID != operatorContextID {
		return "", ErrRefundReferenceConflict
	}
	return operatorContextID, nil
}

// CreateRefundAtomicForOperatorContext is the sole order-cancellation refund
// adapter. OperatorContext authority must already exist in the authenticated
// request context and is independently checked against WLT's payment-session
// record before the governed refund engine is entered. The boolean return is
// created (true) versus idempotent replay (false); on error the refund is
// nil and the boolean must be ignored.
func CreateRefundAtomicForOperatorContext(ctx context.Context, db *sql.DB, input CreateRefundInput) (*Refund, bool, error) {
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	if input.PaymentSessionID == "" || input.OrderID == "" || input.ClientID == "" || input.Reason == "" {
		return nil, false, fmt.Errorf("paymentSessionId, orderId, clientId, and reason are required")
	}
	operatorContextID, err := requireRefundOperatorContextForSession(ctx, db, input.PaymentSessionID)
	if err != nil {
		return nil, false, err
	}
	key := "order-cancellation:" + input.PaymentSessionID + ":" + input.OrderID
	item, replayed, err := CreateGovernedRefund(ctx, db, GovernedCreateRefundInput{
		OperatorContextID:     operatorContextID,
		PaymentSessionID:      input.PaymentSessionID,
		OrderID:               input.OrderID,
		ClientID:              input.ClientID,
		Reason:                input.Reason,
		EligibilityReference:  "order-cancellation:" + input.OrderID,
		RequestedByOperatorID: "dsh-order-cancellation",
		IdempotencyKey:        key,
		CorrelationID:         key,
	})
	return cancellationRefundView(item), !replayed, err
}
