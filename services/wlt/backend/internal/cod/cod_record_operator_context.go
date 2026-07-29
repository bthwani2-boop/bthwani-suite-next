package cod

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

func getCodRecordByOperatorContextOrder(
	ctx context.Context,
	db *sql.DB,
	operatorContextID string,
	orderID string,
) (*CodRecord, error) {
	const query = `SELECT ` + codCols + `
		FROM wlt_cod_records WHERE operator_context_id=$1 AND order_id=$2`
	record, err := scanCodRecord(db.QueryRowContext(ctx, query, operatorContextID, orderID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return record, err
}

// CreateCodRecordForOperatorContext creates the WLT-owned COD custody aggregate from a
// OperatorContext-scoped WLT payment session. The caller never supplies amount,
// currency, or OperatorContext ownership.
func CreateCodRecordForOperatorContext(
	ctx context.Context,
	db *sql.DB,
	input CreateCodRecordInput,
) (*CodRecord, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	if input.OrderID == "" || input.PartnerID == "" || input.CheckoutIntentID == "" {
		return nil, fmt.Errorf("orderId, partnerId, and checkoutIntentId are required")
	}
	collectorType, collectorID, captainID, err := normalizeCodRecordCollector(input)
	if err != nil {
		return nil, err
	}

	session, err := reference.GetPaymentSessionByCheckoutIntentForOperatorContext(
		db,
		operatorContextID,
		input.CheckoutIntentID,
	)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, fmt.Errorf("no WLT payment session found for checkoutIntentId %q in trusted OperatorContext", input.CheckoutIntentID)
	}
	if session.OperatorContextID != operatorContextID {
		return nil, reference.ErrOperatorContextMismatch
	}
	if session.PaymentMethod != "cod" {
		return nil, fmt.Errorf("checkoutIntentId %q is not a COD payment session", input.CheckoutIntentID)
	}
	if session.AmountMinorUnits <= 0 || strings.TrimSpace(session.Currency) == "" {
		return nil, fmt.Errorf("checkoutIntentId %q has invalid COD amount or currency", input.CheckoutIntentID)
	}

	existing, err := getCodRecordByOperatorContextOrder(ctx, db, operatorContextID, input.OrderID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if existing.CollectorType != collectorType ||
			existing.CollectorID != collectorID ||
			existing.PartnerID != input.PartnerID ||
			existing.AmountMinorUnits != session.AmountMinorUnits ||
			existing.Currency != session.Currency {
			return nil, ErrCodStateConflict
		}
		return existing, nil
	}

	const query = `
		INSERT INTO wlt_cod_records
		  (operator_context_id, order_id, captain_id, collector_type, collector_id,
		   partner_id, amount_minor_units, currency)
		VALUES ($1,$2,NULLIF($3,''),$4,$5,$6,$7,$8)
		ON CONFLICT (operator_context_id, order_id) DO NOTHING
		RETURNING ` + codCols
	created, err := scanCodRecord(db.QueryRowContext(
		ctx,
		query,
		operatorContextID,
		input.OrderID,
		captainID,
		collectorType,
		collectorID,
		input.PartnerID,
		session.AmountMinorUnits,
		session.Currency,
	))
	if errors.Is(err, sql.ErrNoRows) {
		existing, getErr := getCodRecordByOperatorContextOrder(ctx, db, operatorContextID, input.OrderID)
		if getErr != nil {
			return nil, getErr
		}
		if existing == nil ||
			existing.CollectorType != collectorType ||
			existing.CollectorID != collectorID ||
			existing.PartnerID != input.PartnerID ||
			existing.AmountMinorUnits != session.AmountMinorUnits ||
			existing.Currency != session.Currency {
			return nil, ErrCodStateConflict
		}
		return existing, nil
	}
	return created, err
}

func HandleCreateCodRecordOperatorContext(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateCodRecordInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		record, err := CreateCodRecordForOperatorContext(r.Context(), db, input)
		switch {
		case errors.Is(err, reference.ErrOperatorContextMismatch):
			shared.SendError(w, http.StatusForbidden, "OperatorContext_MISMATCH", err.Error())
			return
		case errors.Is(err, ErrCodStateConflict):
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"codRecord": record})
	}
}
