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

func refundOperatorContextForSession(ctx context.Context, db *sql.DB, paymentSessionID string) (context.Context, string, error) {
	if operatorContextID, ok := shared.OperatorContextIDFromContext(ctx); ok {
		return ctx, operatorContextID, nil
	}
	var operatorContextID string
	if err := db.QueryRowContext(ctx, `
		SELECT operator_context_id FROM wlt_payment_sessions WHERE id=$1`, paymentSessionID).Scan(&operatorContextID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ctx, "", fmt.Errorf("payment session not found")
		}
		return ctx, "", err
	}
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return ctx, "", fmt.Errorf("payment session OperatorContext is missing")
	}
	return shared.WithOperatorContext(ctx, operatorContextID), operatorContextID, nil
}

// CreateRefundAtomicForOperatorContext preserves order-cancellation compatibility while
// using the governed amount reservation, context isolation, audit and idempotency
// engine. OperatorContext ownership comes from the authenticated request context. The
// compatibility path may derive it only from WLT's own payment-session record.
func CreateRefundAtomicForOperatorContext(ctx context.Context, db *sql.DB, input CreateRefundInput) (*Refund, bool, error) {
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	if input.PaymentSessionID == "" || input.OrderID == "" || input.ClientID == "" || input.Reason == "" {
		return nil, false, fmt.Errorf("paymentSessionId, orderId, clientId, and reason are required")
	}
	trustedCtx, operatorContextID, err := refundOperatorContextForSession(ctx, db, input.PaymentSessionID)
	if err != nil {
		return nil, false, err
	}
	key := "order-cancellation:" + input.PaymentSessionID + ":" + input.OrderID
	item, replayed, err := CreateGovernedRefund(trustedCtx, db, GovernedCreateRefundInput{
		OperatorContextID: operatorContextID,
		PaymentSessionID: input.PaymentSessionID,
		OrderID: input.OrderID,
		ClientID: input.ClientID,
		Reason: input.Reason,
		EligibilityReference: "order-cancellation:" + input.OrderID,
		RequestedByOperatorID: "dsh-order-cancellation",
		IdempotencyKey: key,
		CorrelationID: key,
	})
	return legacyRefundView(item), !replayed, err
}

// CreateRefundAtomic is the package-level compatibility adapter. It never
// invents a OperatorContext; it resolves ownership from the referenced WLT session.
func CreateRefundAtomic(db *sql.DB, input CreateRefundInput) (*Refund, bool, error) {
	return CreateRefundAtomicForOperatorContext(context.Background(), db, input)
}
