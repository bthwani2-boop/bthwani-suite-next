package refund

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
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

// CreateRefundAtomic preserves order-cancellation compatibility while using
// the JRN-035 amount reservation, tenant isolation, audit and idempotency
// engine. A missing amount means "refund the full remaining amount".
func CreateRefundAtomic(db *sql.DB, input CreateRefundInput) (*Refund, bool, error) {
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	if input.PaymentSessionID == "" || input.OrderID == "" || input.ClientID == "" || input.Reason == "" {
		return nil, false, fmt.Errorf("paymentSessionId, orderId, clientId, and reason are required")
	}
	key := "order-cancellation:" + input.PaymentSessionID + ":" + input.OrderID
	item, replayed, err := CreateGovernedRefund(context.Background(), db, GovernedCreateRefundInput{
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

func HandleCreateRefundAtomic(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateRefundInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		created, wasCreated, err := CreateRefundAtomic(db, input)
		if errors.Is(err, ErrRefundReferenceConflict) {
			shared.SendError(w, http.StatusConflict, "REFUND_REFERENCE_CONFLICT", err.Error())
			return
		}
		if errors.Is(err, ErrSessionNotRefundable) || errors.Is(err, ErrRefundAmountUnavailable) {
			shared.SendError(w, http.StatusConflict, "PAYMENT_SESSION_NOT_REFUNDABLE", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		status := http.StatusOK
		if wasCreated { status = http.StatusCreated }
		shared.SendJSON(w, status, map[string]any{"refund": created, "replayed": !wasCreated})
	}
}
