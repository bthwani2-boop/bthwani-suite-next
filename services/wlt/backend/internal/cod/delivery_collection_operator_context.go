package cod

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

// CreateDeliveryCollectionForOperatorContext is the canonical COD creation path. The
// OperatorContext comes from authenticated request context, the amount comes from the
// OperatorContext-local WLT payment session, and idempotency is OperatorContext-local.
func CreateDeliveryCollectionForOperatorContext(
	ctx context.Context,
	db *sql.DB,
	input CreateDeliveryCollectionInput,
) (*DeliveryCollectionRecord, bool, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, false, err
	}
	input, err = normalizeCollector(input)
	if err != nil {
		return nil, false, err
	}
	session, err := reference.GetPaymentSessionByCheckoutIntentForOperatorContext(db, operatorContextID, input.CheckoutIntentID)
	if err != nil {
		return nil, false, err
	}
	if session == nil {
		return nil, false, fmt.Errorf("no OperatorContext-local WLT payment session found for checkoutIntentId %q", input.CheckoutIntentID)
	}
	if session.PaymentMethod != "cod" {
		return nil, false, fmt.Errorf("checkoutIntentId %q is not a COD payment session", input.CheckoutIntentID)
	}
	currency := strings.TrimSpace(session.Currency)
	if currency == "" {
		currency = "YER"
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback() //nolint:errcheck

	created, scanErr := scanDeliveryCollection(tx.QueryRowContext(ctx, `
		INSERT INTO wlt_cod_records
			(operator_context_id, order_id, captain_id, collector_type, collector_id, partner_id, amount_minor_units, currency)
		VALUES ($1, $2, NULLIF($3,''), $4, $5, $6, $7, $8)
		ON CONFLICT (operator_context_id, order_id) DO NOTHING
		RETURNING `+deliveryCollectionCols,
		operatorContextID,
		input.OrderID,
		input.CaptainID,
		input.CollectorType,
		input.CollectorID,
		input.PartnerID,
		session.AmountMinorUnits,
		currency,
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

	existing, err := scanDeliveryCollection(tx.QueryRowContext(ctx, `
		SELECT `+deliveryCollectionCols+`
		FROM wlt_cod_records
		WHERE operator_context_id = $1 AND order_id = $2
		FOR UPDATE`, operatorContextID, input.OrderID))
	if err != nil {
		return nil, false, err
	}
	if existing.CollectorType != input.CollectorType ||
		existing.CollectorID != input.CollectorID ||
		existing.PartnerID != input.PartnerID ||
		existing.AmountMinorUnits != session.AmountMinorUnits ||
		existing.Currency != currency {
		return nil, false, ErrCodReferenceConflict
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return existing, false, nil
}

func GetDeliveryCollectionForOperatorContext(ctx context.Context, db *sql.DB, recordID string) (*DeliveryCollectionRecord, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	recordID = strings.TrimSpace(recordID)
	if recordID == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	record, err := scanDeliveryCollection(db.QueryRowContext(ctx, `
		SELECT `+deliveryCollectionCols+`
		FROM wlt_cod_records
		WHERE operator_context_id = $1 AND id = $2`, operatorContextID, recordID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return record, err
}

func ListDeliveryCollectionsForOperatorContext(
	ctx context.Context,
	db *sql.DB,
	collectorType,
	collectorID,
	captainID,
	partnerID string,
) ([]*DeliveryCollectionRecord, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	collectorType = strings.TrimSpace(collectorType)
	collectorID = strings.TrimSpace(collectorID)
	captainID = strings.TrimSpace(captainID)
	partnerID = strings.TrimSpace(partnerID)

	query := `SELECT ` + deliveryCollectionCols + ` FROM wlt_cod_records WHERE operator_context_id=$1`
	args := []any{operatorContextID}
	switch {
	case collectorType != "" && collectorID != "":
		query += ` AND collector_type=$2 AND collector_id=$3 ORDER BY created_at DESC`
		args = append(args, collectorType, collectorID)
	case captainID != "":
		query += ` AND collector_type='captain' AND collector_id=$2 ORDER BY created_at DESC`
		args = append(args, captainID)
	case partnerID != "":
		query += ` AND partner_id=$2 ORDER BY created_at DESC`
		args = append(args, partnerID)
	default:
		return nil, fmt.Errorf("collectorType+collectorId, captainId, or partnerId query is required")
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]*DeliveryCollectionRecord, 0)
	for rows.Next() {
		record, err := scanDeliveryCollection(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, record)
	}
	return result, rows.Err()
}

func HandleGetDeliveryCollectionOperatorContext(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		record, err := GetDeliveryCollectionForOperatorContext(r.Context(), db, r.PathValue("codRecordId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if record == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "COD record not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codRecord": record})
	}
}

func HandleListDeliveryCollectionsOperatorContext(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()
		records, err := ListDeliveryCollectionsForOperatorContext(
			r.Context(),
			db,
			query.Get("collectorType"),
			query.Get("collectorId"),
			query.Get("captainId"),
			query.Get("partnerId"),
		)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codRecords": records})
	}
}
