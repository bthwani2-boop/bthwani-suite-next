package refund

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

var ErrRefundReferenceConflict = errors.New("refund references do not match the payment session")

// CreateRefundAtomic creates at most one active refund per payment session.
// Concurrent callers either create the row or read the row created by the
// winner; none receives a raw unique-constraint error.
func CreateRefundAtomic(db *sql.DB, input CreateRefundInput) (*Refund, bool, error) {
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	if input.PaymentSessionID == "" || input.OrderID == "" || input.ClientID == "" || input.Reason == "" {
		return nil, false, fmt.Errorf("paymentSessionId, orderId, clientId, and reason are required")
	}

	session, err := reference.GetPaymentSession(db, input.PaymentSessionID)
	if err != nil {
		return nil, false, err
	}
	if session == nil {
		return nil, false, fmt.Errorf("payment session not found")
	}
	if session.ClientID != input.ClientID {
		return nil, false, ErrRefundReferenceConflict
	}
	if session.Status != "captured" && session.Status != "cod_collected" {
		return nil, false, ErrSessionNotRefundable
	}
	currency := session.Currency
	if currency == "" {
		currency = "YER"
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()

	created, scanErr := scanRefund(tx.QueryRow(`
		INSERT INTO wlt_refunds(
			payment_session_id,order_id,client_id,amount_minor_units,currency,reason)
		VALUES($1,$2,$3,$4,$5,$6)
		ON CONFLICT (payment_session_id) WHERE status != 'rejected' DO NOTHING
		RETURNING `+refundCols,
		input.PaymentSessionID,
		input.OrderID,
		input.ClientID,
		session.AmountMinorUnits,
		currency,
		input.Reason,
	))
	if scanErr == nil {
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return created, true, nil
	}
	if !errors.Is(scanErr, sql.ErrNoRows) {
		return nil, false, scanErr
	}

	existing, err := getActiveRefundForSessionTx(tx, input.PaymentSessionID)
	if err != nil {
		return nil, false, err
	}
	if existing == nil {
		return nil, false, fmt.Errorf("active refund disappeared after conflict")
	}
	if existing.OrderID != input.OrderID || existing.ClientID != input.ClientID ||
		existing.AmountMinorUnits != session.AmountMinorUnits || existing.Currency != currency {
		return nil, false, ErrRefundReferenceConflict
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return existing, false, nil
}

// HandleCreateRefundAtomic is the compatibility HTTP surface for
// POST /wlt/refunds. It preserves the established route while enforcing the
// same atomic and reference-safe implementation used by order cancellation.
func HandleCreateRefundAtomic(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateRefundInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		created, wasCreated, err := CreateRefundAtomic(db, input)
		if errors.Is(err, ErrRefundReferenceConflict) {
			shared.SendError(w, http.StatusConflict, "REFUND_REFERENCE_CONFLICT", err.Error())
			return
		}
		if errors.Is(err, ErrSessionNotRefundable) {
			shared.SendError(w, http.StatusConflict, "PAYMENT_SESSION_NOT_REFUNDABLE", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		status := http.StatusOK
		if wasCreated {
			status = http.StatusCreated
		}
		shared.SendJSON(w, status, map[string]any{
			"refund":   created,
			"replayed": !wasCreated,
		})
	}
}
