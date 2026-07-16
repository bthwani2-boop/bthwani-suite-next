package refund

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/lib/pq"

	"wlt-api/internal/ledger"
	"wlt-api/internal/provider"
	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

// ErrSessionNotRefundable is returned when CreateRefund is called for a
// payment session that has not actually received funds (i.e. its status is
// not captured or cod_collected). The amount/currency for a refund are
// always derived from that session's own row -- never from caller input --
// so a refund can only be requested once the session is in a state where
// those stored values are the true captured amount.
var ErrSessionNotRefundable = errors.New("payment session is not in a refundable state")

// ErrRefundNotInExpectedState is returned by transitionRefund when the
// refund's current status is not one of the caller's allowed source
// statuses -- either it was never eligible for this transition, or a
// concurrent request already moved it first. Approve/Complete/Reject
// previously performed an unconditional UPDATE with no status guard at all,
// so two concurrent CompleteRefund calls (or a Complete before an Approve)
// could both proceed and, for CompleteRefundWithProvider, both call the
// refund provider.
var ErrRefundNotInExpectedState = errors.New("refund is not in the expected state for this transition")

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

// CreateRefundInput intentionally has no AmountMinorUnits/Currency fields --
// those are always derived from the referenced payment session's own row
// (see CreateRefund), never from caller input, so a client cannot tamper
// with the amount actually refunded by supplying a different value.
type CreateRefundInput struct {
	PaymentSessionID string `json:"paymentSessionId"`
	OrderID          string `json:"orderId"`
	ClientID         string `json:"clientId"`
	Reason           string `json:"reason"`
}

type financialProvider interface {
	Post(ctx context.Context, path string, body any, meta provider.RequestMeta) (provider.ProviderResult, error)
}

func scanRefund(row *sql.Row) (*Refund, error) {
	var r Refund
	err := row.Scan(
		&r.ID,
		&r.PaymentSessionID,
		&r.OrderID,
		&r.ClientID,
		&r.AmountMinorUnits,
		&r.Currency,
		&r.Reason,
		&r.Status,
		&r.ResolvedAt,
		&r.CreatedAt,
		&r.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func scanRefundRow(rows *sql.Rows) (*Refund, error) {
	var r Refund
	err := rows.Scan(
		&r.ID,
		&r.PaymentSessionID,
		&r.OrderID,
		&r.ClientID,
		&r.AmountMinorUnits,
		&r.Currency,
		&r.Reason,
		&r.Status,
		&r.ResolvedAt,
		&r.CreatedAt,
		&r.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

const refundCols = `id, payment_session_id, order_id, client_id, amount_minor_units,
	currency, reason, status, resolved_at, created_at, updated_at`

// CreateRefund creates a refund for input.PaymentSessionID. The refunded
// amount/currency are always read from that session's own row (never from
// caller input -- see CreateRefundInput). The session must already be in a
// funds-received state (captured, from a card capture, or cod_collected,
// from a completed COD collection); anything else returns
// ErrSessionNotRefundable. Calling this twice for the same session (e.g. a
// retried DSH request) is idempotent: any existing non-rejected refund for
// that session is returned instead of inserting a duplicate row, and the
// check-then-insert runs inside a transaction (plus a partial unique index
// as a defense-in-depth backstop -- see migration wlt-014) to avoid a race
// between two concurrent requests both creating a refund for the session.
func CreateRefund(db *sql.DB, input CreateRefundInput) (*Refund, error) {
	if input.PaymentSessionID == "" || input.OrderID == "" || input.ClientID == "" {
		return nil, fmt.Errorf("paymentSessionId, orderId, and clientId are required")
	}
	session, err := reference.GetPaymentSession(db, input.PaymentSessionID)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, fmt.Errorf("payment session not found")
	}
	if session.Status != "captured" && session.Status != "cod_collected" {
		return nil, ErrSessionNotRefundable
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	existing, err := getActiveRefundForSessionTx(tx, input.PaymentSessionID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return existing, nil
	}

	const q = `
		INSERT INTO wlt_refunds
			(payment_session_id, order_id, client_id, amount_minor_units, currency, reason)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + refundCols
	row := tx.QueryRow(q, input.PaymentSessionID, input.OrderID, input.ClientID,
		session.AmountMinorUnits, session.Currency, input.Reason)
	r, err := scanRefund(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r, nil
}

// getActiveRefundForSessionTx looks up a non-rejected refund already
// existing for paymentSessionID within tx, locking the row (if any) so a
// concurrent CreateRefund call for the same session serializes against this
// check instead of racing it.
func getActiveRefundForSessionTx(tx *sql.Tx, paymentSessionID string) (*Refund, error) {
	const q = `SELECT ` + refundCols + ` FROM wlt_refunds WHERE payment_session_id = $1 AND status != 'rejected' FOR UPDATE`
	row := tx.QueryRow(q, paymentSessionID)
	r, err := scanRefund(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return r, err
}

func GetRefund(db *sql.DB, refundID string) (*Refund, error) {
	if refundID == "" {
		return nil, fmt.Errorf("refundId is required")
	}
	const q = `SELECT ` + refundCols + ` FROM wlt_refunds WHERE id = $1`
	row := db.QueryRow(q, refundID)
	r, err := scanRefund(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return r, err
}

func ListRefunds(db *sql.DB, orderID, clientID string) ([]*Refund, error) {
	var q string
	var rows *sql.Rows
	var err error
	if orderID != "" {
		q = `SELECT ` + refundCols + ` FROM wlt_refunds WHERE order_id = $1 ORDER BY created_at DESC`
		rows, err = db.Query(q, orderID)
	} else if clientID != "" {
		q = `SELECT ` + refundCols + ` FROM wlt_refunds WHERE client_id = $1 ORDER BY created_at DESC`
		rows, err = db.Query(q, clientID)
	} else {
		q = `SELECT ` + refundCols + ` FROM wlt_refunds ORDER BY created_at DESC LIMIT 50`
		rows, err = db.Query(q)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var refunds []*Refund
	for rows.Next() {
		r, err := scanRefundRow(rows)
		if err != nil {
			return nil, err
		}
		refunds = append(refunds, r)
	}
	return refunds, rows.Err()
}

// transitionRefund guards the UPDATE on status = ANY(allowedFrom), so a
// concurrent second transition attempt (e.g. two racing CompleteRefund
// calls, or a Complete before an Approve landed) affects zero rows and
// returns ErrRefundNotInExpectedState instead of silently overwriting an
// already-transitioned refund.
func transitionRefund(db *sql.DB, refundID string, allowedFrom []string, status string, setResolvedAt bool) (*Refund, error) {
	if refundID == "" {
		return nil, fmt.Errorf("refundId is required")
	}
	var q string
	if setResolvedAt {
		q = `UPDATE wlt_refunds SET status = $2, resolved_at = NOW(), updated_at = NOW()
		     WHERE id = $1 AND status = ANY($3)
		     RETURNING ` + refundCols
	} else {
		q = `UPDATE wlt_refunds SET status = $2, updated_at = NOW()
		     WHERE id = $1 AND status = ANY($3)
		     RETURNING ` + refundCols
	}
	row := db.QueryRow(q, refundID, status, pq.Array(allowedFrom))
	r, err := scanRefund(row)
	if err == sql.ErrNoRows {
		// Distinguish "refund does not exist" from "refund exists but is not
		// in an allowed source status" so callers can return 409 vs 404.
		existing, getErr := GetRefund(db, refundID)
		if getErr != nil {
			return nil, getErr
		}
		if existing == nil {
			return nil, nil
		}
		return nil, ErrRefundNotInExpectedState
	}
	return r, err
}

func ApproveRefund(db *sql.DB, refundID string) (*Refund, error) {
	return transitionRefund(db, refundID, []string{"requested"}, "approved", false)
}

// CompleteRefund performs the completion transition (requiring the refund to
// currently be 'approved') and, in the same transaction, posts a balanced
// ledger transaction -- debit platform_revenue / credit provider_clearing,
// representing revenue being reversed as money leaves back out through the
// provider to the client -- so refund completion is ledger-honest rather
// than only flipping wlt_refunds.status.
func CompleteRefund(db *sql.DB, refundID string) (*Refund, error) {
	if refundID == "" {
		return nil, fmt.Errorf("refundId is required")
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	row := tx.QueryRow(`
		UPDATE wlt_refunds SET status = 'completed', resolved_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = ANY($2)
		RETURNING `+refundCols, refundID, pq.Array([]string{"approved"}))
	r, err := scanRefund(row)
	if err == sql.ErrNoRows {
		existing, getErr := GetRefund(db, refundID)
		if getErr != nil {
			return nil, getErr
		}
		if existing == nil {
			return nil, nil
		}
		return nil, ErrRefundNotInExpectedState
	}
	if err != nil {
		return nil, err
	}

	if r.AmountMinorUnits > 0 {
		lines := []ledger.LedgerLine{
			{AccountType: "platform_revenue", DebitCredit: "debit", AmountMinorUnits: r.AmountMinorUnits, Currency: r.Currency},
			{AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: r.AmountMinorUnits, Currency: r.Currency},
		}
		if _, err := ledger.PostLedgerTransaction(context.Background(), tx, "refund_completed", "refund", r.ID, lines, ledger.Actor{ID: "system", Type: "system"}); err != nil {
			return nil, fmt.Errorf("post refund ledger transaction: %w", err)
		}
	}

	return r, tx.Commit()
}

func CompleteRefundWithProvider(ctx context.Context, db *sql.DB, client financialProvider, refundID string, meta provider.RequestMeta) (*Refund, error) {
	ref, err := GetRefund(db, refundID)
	if err != nil || ref == nil {
		return ref, err
	}
	if ref.Status != "approved" {
		return nil, ErrRefundNotInExpectedState
	}
	result, err := client.Post(ctx, "/financial/card/refund", map[string]any{
		"refundId":         ref.ID,
		"paymentSessionId": ref.PaymentSessionID,
		"orderId":          ref.OrderID,
		"clientId":         ref.ClientID,
		"amountMinorUnits": ref.AmountMinorUnits,
		"currency":         ref.Currency,
		"reason":           ref.Reason,
	}, meta)
	if err != nil {
		return nil, err
	}
	if result.Status != "refunded" || result.ProviderReference == "" {
		return nil, fmt.Errorf("provider refund returned invalid status or reference")
	}
	return CompleteRefund(db, refundID)
}

func RejectRefund(db *sql.DB, refundID string) (*Refund, error) {
	return transitionRefund(db, refundID, []string{"requested", "approved"}, "rejected", true)
}

// HTTP handlers

func HandleCreateRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateRefundInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		ref, err := CreateRefund(db, input)
		if errors.Is(err, ErrSessionNotRefundable) {
			shared.SendError(w, http.StatusConflict, "SESSION_NOT_REFUNDABLE", "payment session is not in a refundable state (must be captured or cod_collected)")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"refund": ref})
	}
}

func HandleGetRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ref, err := GetRefund(db, r.PathValue("refundId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": ref})
	}
}

func HandleListRefunds(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orderID := r.URL.Query().Get("orderId")
		clientID := r.URL.Query().Get("clientId")
		refunds, err := ListRefunds(db, orderID, clientID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if refunds == nil {
			refunds = []*Refund{}
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refunds": refunds})
	}
}

func HandleApproveRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ref, err := ApproveRefund(db, r.PathValue("refundId"))
		if errors.Is(err, ErrRefundNotInExpectedState) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "refund is not in a state that can be approved")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": ref})
	}
}

func HandleCompleteRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		ref, err := CompleteRefundWithProvider(r.Context(), db, client, r.PathValue("refundId"), provider.RequestMetaFromHTTP(r, "wlt-refund"))
		if errors.Is(err, ErrRefundNotInExpectedState) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "refund must be approved before it can be completed")
			return
		}
		if err != nil {
			shared.SendProviderError(w, err)
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": ref})
	}
}

// sendProviderError is handled by shared.SendProviderError.

func HandleRejectRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ref, err := RejectRefund(db, r.PathValue("refundId"))
		if errors.Is(err, ErrRefundNotInExpectedState) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "refund is not in a state that can be rejected")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": ref})
	}
}
