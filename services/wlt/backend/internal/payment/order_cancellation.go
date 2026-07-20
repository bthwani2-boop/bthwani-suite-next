package payment

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/refund"
	"wlt-api/internal/shared"
)

type GovernedOrderCancellationInput struct {
	PaymentSessionID string `json:"paymentSessionId"`
	OrderID          string `json:"orderId"`
	ClientID         string `json:"clientId"`
	Reason           string `json:"reason"`
}

func CancelOrderFinancially(db *sql.DB, input GovernedOrderCancellationInput) (*CancelForOrderResult, error) {
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	if input.PaymentSessionID == "" || input.OrderID == "" || input.ClientID == "" || input.Reason == "" {
		return nil, fmt.Errorf("paymentSessionId, orderId, clientId, and reason are required")
	}
	current, err := getSession(db, input.PaymentSessionID)
	if err != nil || current == nil {
		return nil, err
	}
	if current.ClientID != input.ClientID {
		return nil, refund.ErrRefundReferenceConflict
	}

	switch current.Status {
	case "reference_created", "pending_provider", "authorized":
		tx, err := db.Begin()
		if err != nil {
			return nil, err
		}
		defer tx.Rollback()
		session, err := expireSessionTx(tx, input.PaymentSessionID)
		if errors.Is(err, ErrNotExpirable) {
			latest, getErr := getSession(db, input.PaymentSessionID)
			if getErr != nil || latest == nil {
				return nil, getErr
			}
			return &CancelForOrderResult{Action: "none", SessionStatus: latest.Status}, nil
		}
		if err != nil {
			return nil, err
		}
		if session == nil {
			return nil, nil
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &CancelForOrderResult{Action: "expired", PaymentSession: session}, nil
	case "captured", "cod_collected":
		created, _, err := refund.CreateRefundAtomic(db, refund.CreateRefundInput{
			PaymentSessionID: input.PaymentSessionID,
			OrderID:          input.OrderID,
			ClientID:         input.ClientID,
			Reason:           input.Reason,
		})
		if errors.Is(err, refund.ErrSessionNotRefundable) {
			latest, getErr := getSession(db, input.PaymentSessionID)
			if getErr != nil || latest == nil {
				return nil, getErr
			}
			return &CancelForOrderResult{Action: "none", SessionStatus: latest.Status}, nil
		}
		if err != nil {
			return nil, err
		}
		return &CancelForOrderResult{Action: "refund_requested", Refund: created}, nil
	default:
		return &CancelForOrderResult{Action: "none", SessionStatus: current.Status}, nil
	}
}

func HandleGovernedOrderCancellation(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input GovernedOrderCancellationInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		result, err := CancelOrderFinancially(db, input)
		if errors.Is(err, refund.ErrRefundReferenceConflict) {
			shared.SendError(w, http.StatusConflict, "REFUND_REFERENCE_CONFLICT", "cancellation references do not match payment session ownership")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if result == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		switch result.Action {
		case "expired":
			shared.SendJSON(w, http.StatusOK, map[string]any{"action": "expired", "paymentSession": result.PaymentSession})
		case "refund_requested":
			shared.SendJSON(w, http.StatusOK, map[string]any{"action": "refund_requested", "refund": result.Refund})
		default:
			shared.SendJSON(w, http.StatusOK, map[string]any{"action": "none", "sessionStatus": result.SessionStatus})
		}
	}
}
