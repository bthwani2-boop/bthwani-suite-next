package refund

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

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
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
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

func CreateRefund(db *sql.DB, input CreateRefundInput) (*Refund, error) {
	if input.PaymentSessionID == "" || input.OrderID == "" || input.ClientID == "" {
		return nil, fmt.Errorf("paymentSessionId, orderId, and clientId are required")
	}
	currency := input.Currency
	if currency == "" {
		currency = "SAR"
	}
	const q = `
		INSERT INTO wlt_refunds
			(payment_session_id, order_id, client_id, amount_minor_units, currency, reason)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + refundCols
	row := db.QueryRow(q, input.PaymentSessionID, input.OrderID, input.ClientID,
		input.AmountMinorUnits, currency, input.Reason)
	return scanRefund(row)
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
	var arg string
	if orderID != "" {
		q = `SELECT ` + refundCols + ` FROM wlt_refunds WHERE order_id = $1 ORDER BY created_at DESC`
		arg = orderID
	} else if clientID != "" {
		q = `SELECT ` + refundCols + ` FROM wlt_refunds WHERE client_id = $1 ORDER BY created_at DESC`
		arg = clientID
	} else {
		return nil, fmt.Errorf("orderId or clientId query parameter is required")
	}
	rows, err := db.Query(q, arg)
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

func transitionRefund(db *sql.DB, refundID, status string, setResolvedAt bool) (*Refund, error) {
	if refundID == "" {
		return nil, fmt.Errorf("refundId is required")
	}
	var q string
	if setResolvedAt {
		q = `UPDATE wlt_refunds SET status = $2, resolved_at = NOW(), updated_at = NOW()
		     WHERE id = $1
		     RETURNING ` + refundCols
	} else {
		q = `UPDATE wlt_refunds SET status = $2, updated_at = NOW()
		     WHERE id = $1
		     RETURNING ` + refundCols
	}
	row := db.QueryRow(q, refundID, status)
	r, err := scanRefund(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return r, err
}

func ApproveRefund(db *sql.DB, refundID string) (*Refund, error) {
	return transitionRefund(db, refundID, "approved", false)
}

func CompleteRefund(db *sql.DB, refundID string) (*Refund, error) {
	return transitionRefund(db, refundID, "completed", true)
}

func CompleteRefundWithProvider(ctx context.Context, db *sql.DB, client financialProvider, refundID string, meta provider.RequestMeta) (*Refund, error) {
	ref, err := GetRefund(db, refundID)
	if err != nil || ref == nil {
		return ref, err
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
	return transitionRefund(db, refundID, "rejected", true)
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
		client, err := newProviderClient()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		ref, err := CompleteRefundWithProvider(r.Context(), db, client, r.PathValue("refundId"), requestMeta(r, "wlt-refund"))
		if err != nil {
			sendProviderError(w, err)
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": ref})
	}
}

func newProviderClient() (*provider.Client, error) {
	config, err := provider.LoadConfig()
	if err != nil {
		return nil, err
	}
	return provider.NewClient(config), nil
}

func requestMeta(r *http.Request, prefix string) provider.RequestMeta {
	meta := provider.NewRequestMeta(prefix)
	if correlationID := r.Header.Get("X-Correlation-ID"); correlationID != "" {
		meta.CorrelationID = correlationID
	}
	if idempotencyKey := r.Header.Get("Idempotency-Key"); idempotencyKey != "" {
		meta.IdempotencyKey = idempotencyKey
	}
	return meta
}

func sendProviderError(w http.ResponseWriter, err error) {
	if providerErr, ok := err.(provider.Error); ok {
		message := providerErr.Message
		if message == "" {
			message = providerErr.Error()
		}
		shared.SendError(w, http.StatusBadGateway, "PROVIDER_ERROR", message)
		return
	}
	shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
}

func HandleRejectRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ref, err := RejectRefund(db, r.PathValue("refundId"))
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
