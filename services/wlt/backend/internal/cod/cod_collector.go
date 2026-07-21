package cod

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

type DeliveryCollectionRecord struct {
	ID               string  `json:"id"`
	OrderID          string  `json:"orderId"`
	CaptainID        string  `json:"captainId,omitempty"`
	CollectorType    string  `json:"collectorType"`
	CollectorID      string  `json:"collectorId"`
	PartnerID        string  `json:"partnerId"`
	AmountMinorUnits int64   `json:"amountMinorUnits"`
	Currency         string  `json:"currency"`
	Status           string  `json:"status"`
	CollectedAt      *string `json:"collectedAt"`
	RemittedAt       *string `json:"remittedAt"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

type CreateDeliveryCollectionInput struct {
	OrderID          string `json:"orderId"`
	CollectorType    string `json:"collectorType"`
	CollectorID      string `json:"collectorId"`
	CaptainID        string `json:"captainId,omitempty"`
	PartnerID        string `json:"partnerId"`
	CheckoutIntentID string `json:"checkoutIntentId"`
}

const deliveryCollectionCols = `id, order_id, COALESCE(captain_id,''), collector_type, collector_id,
	partner_id, amount_minor_units, currency, status, collected_at, remitted_at, created_at, updated_at`

func scanDeliveryCollection(row interface{ Scan(...any) error }) (*DeliveryCollectionRecord, error) {
	var record DeliveryCollectionRecord
	if err := row.Scan(
		&record.ID,
		&record.OrderID,
		&record.CaptainID,
		&record.CollectorType,
		&record.CollectorID,
		&record.PartnerID,
		&record.AmountMinorUnits,
		&record.Currency,
		&record.Status,
		&record.CollectedAt,
		&record.RemittedAt,
		&record.CreatedAt,
		&record.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &record, nil
}

func normalizeCollector(input CreateDeliveryCollectionInput) (CreateDeliveryCollectionInput, error) {
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.CollectorType = strings.TrimSpace(input.CollectorType)
	input.CollectorID = strings.TrimSpace(input.CollectorID)
	input.CaptainID = strings.TrimSpace(input.CaptainID)
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	if input.CollectorType == "" && input.CaptainID != "" {
		input.CollectorType = "captain"
		input.CollectorID = input.CaptainID
	}
	if input.CollectorType == "captain" && input.CaptainID == "" {
		input.CaptainID = input.CollectorID
	}
	if input.OrderID == "" || input.CollectorID == "" || input.PartnerID == "" || input.CheckoutIntentID == "" {
		return input, fmt.Errorf("orderId, collectorId, partnerId, and checkoutIntentId are required")
	}
	switch input.CollectorType {
	case "captain", "store_courier", "partner_store":
	default:
		return input, fmt.Errorf("collectorType must be captain, store_courier, or partner_store")
	}
	if input.CollectorType != "captain" {
		input.CaptainID = ""
	}
	return input, nil
}

func CreateDeliveryCollection(
	db *sql.DB,
	input CreateDeliveryCollectionInput,
) (*DeliveryCollectionRecord, bool, error) {
	input, err := normalizeCollector(input)
	if err != nil {
		return nil, false, err
	}
	session, err := reference.GetPaymentSessionByCheckoutIntent(db, input.CheckoutIntentID)
	if err != nil {
		return nil, false, err
	}
	if session == nil {
		return nil, false, fmt.Errorf("no WLT payment session found for checkoutIntentId %q", input.CheckoutIntentID)
	}
	if session.PaymentMethod != "cod" {
		return nil, false, fmt.Errorf("checkoutIntentId %q is not a COD payment session", input.CheckoutIntentID)
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

	created, scanErr := scanDeliveryCollection(tx.QueryRow(`
		INSERT INTO wlt_cod_records
			(order_id, captain_id, collector_type, collector_id, partner_id, amount_minor_units, currency)
		VALUES ($1, NULLIF($2,''), $3, $4, $5, $6, $7)
		ON CONFLICT (order_id) DO NOTHING
		RETURNING `+deliveryCollectionCols,
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

	existing, err := scanDeliveryCollection(tx.QueryRow(`
		SELECT `+deliveryCollectionCols+`
		FROM wlt_cod_records
		WHERE order_id = $1
		FOR UPDATE`, input.OrderID))
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

func GetDeliveryCollection(db *sql.DB, recordID string) (*DeliveryCollectionRecord, error) {
	if strings.TrimSpace(recordID) == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	record, err := scanDeliveryCollection(db.QueryRow(`SELECT `+deliveryCollectionCols+` FROM wlt_cod_records WHERE id=$1`, recordID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return record, err
}

func ListDeliveryCollections(
	db *sql.DB,
	collectorType,
	collectorID,
	captainID,
	partnerID string,
) ([]*DeliveryCollectionRecord, error) {
	collectorType = strings.TrimSpace(collectorType)
	collectorID = strings.TrimSpace(collectorID)
	captainID = strings.TrimSpace(captainID)
	partnerID = strings.TrimSpace(partnerID)
	var query string
	var args []any
	switch {
	case collectorType != "" && collectorID != "":
		query = `SELECT ` + deliveryCollectionCols + ` FROM wlt_cod_records WHERE collector_type=$1 AND collector_id=$2 ORDER BY created_at DESC`
		args = []any{collectorType, collectorID}
	case captainID != "":
		query = `SELECT ` + deliveryCollectionCols + ` FROM wlt_cod_records WHERE collector_type='captain' AND collector_id=$1 ORDER BY created_at DESC`
		args = []any{captainID}
	case partnerID != "":
		query = `SELECT ` + deliveryCollectionCols + ` FROM wlt_cod_records WHERE partner_id=$1 ORDER BY created_at DESC`
		args = []any{partnerID}
	default:
		return nil, fmt.Errorf("collectorType+collectorId, captainId, or partnerId query is required")
	}
	rows, err := db.Query(query, args...)
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

func transitionDeliveryCollection(db *sql.DB, recordID, fromStatus, toStatus, timeColumn string) (*DeliveryCollectionRecord, error) {
	if strings.TrimSpace(recordID) == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	query := `UPDATE wlt_cod_records SET status=$2, ` + timeColumn + `=NOW(), updated_at=NOW()
		WHERE id=$1 AND status=$3 RETURNING ` + deliveryCollectionCols
	record, err := scanDeliveryCollection(db.QueryRow(query, recordID, toStatus, fromStatus))
	if errors.Is(err, sql.ErrNoRows) {
		existing, getErr := GetDeliveryCollection(db, recordID)
		if getErr != nil {
			return nil, getErr
		}
		if existing == nil {
			return nil, nil
		}
		return nil, ErrCodStateConflict
	}
	return record, err
}

func HandleCreateDeliveryCollection(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !requireDshServiceCaller(w, r) {
			return
		}
		var input CreateDeliveryCollectionInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		record, created, err := CreateDeliveryCollection(db, input)
		if errors.Is(err, ErrCodReferenceConflict) {
			shared.SendError(w, http.StatusConflict, "COD_REFERENCE_CONFLICT", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		status := http.StatusOK
		if created {
			status = http.StatusCreated
		}
		shared.SendJSON(w, status, map[string]any{"codRecord": record, "replayed": !created})
	}
}

func HandleGetDeliveryCollection(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		record, err := GetDeliveryCollection(db, r.PathValue("codRecordId"))
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

func HandleListDeliveryCollections(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()
		records, err := ListDeliveryCollections(
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

func HandleCollectDeliveryCollection(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		record, err := transitionDeliveryCollection(db, r.PathValue("codRecordId"), "pending_collection", "collected", "collected_at")
		if errors.Is(err, ErrCodStateConflict) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "COD record is not pending collection")
			return
		}
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

func HandleRemitDeliveryCollection(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		record, err := transitionDeliveryCollection(db, r.PathValue("codRecordId"), "collected", "remitted", "remitted_at")
		if errors.Is(err, ErrCodStateConflict) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "COD record is not collected")
			return
		}
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
