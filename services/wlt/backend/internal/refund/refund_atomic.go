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

func legacyRefundView(item *GovernedRefund) *Refund {
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

// CreateRefundAtomicForOperatorContext preserves the order-cancellation response
// shape while using the governed amount reservation, context isolation, audit
// and idempotency engine. OperatorContext authority must already exist in the
// authenticated request context and is independently checked against WLT's
// payment-session record.
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
	return legacyRefundView(item), !replayed, err
}

// CreateRefundAtomic is retained as a compile-compatible fail-closed seam for
// contextless legacy callers. Financial ownership must never be inferred from
// paymentSessionID alone; callers must use CreateRefundAtomicForOperatorContext.
func CreateRefundAtomic(db *sql.DB, input CreateRefundInput) (*Refund, bool, error) {
	return nil, false, fmt.Errorf("authenticated OperatorContext context is required; use CreateRefundAtomicForOperatorContext")
}
