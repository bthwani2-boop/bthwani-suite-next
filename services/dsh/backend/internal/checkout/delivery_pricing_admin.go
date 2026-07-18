package checkout

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrDeliveryPricingNotFound        = errors.New("delivery pricing policy not found")
	ErrDeliveryPricingVersionConflict = errors.New("delivery pricing policy version conflict")
)

type DeliveryPricingRecord struct {
	StoreID            string  `json:"storeId"`
	FulfillmentMode    string  `json:"fulfillmentMode"`
	FeeMinorUnits      int64   `json:"feeMinorUnits"`
	Currency           string  `json:"currency"`
	Status             string  `json:"status"`
	PricingSource      string  `json:"pricingSource"`
	CreatedByActorID   string  `json:"createdByActorId"`
	ApprovedByActorID  string  `json:"approvedByActorId,omitempty"`
	ApprovedAt         *string `json:"approvedAt,omitempty"`
	Version            int     `json:"version"`
	CreatedAt          string  `json:"createdAt"`
	UpdatedAt          string  `json:"updatedAt"`
}

type UpsertDeliveryPricingInput struct {
	FeeMinorUnits  int64
	Currency       string
	Status         string
	PricingSource  string
	ExpectedVersion int
	ActorID        string
	ActorSurface   string
	Reason         string
	CorrelationID  string
}

const deliveryPricingColumns = `store_id,fulfillment_mode,fee_minor_units,currency,status,
	pricing_source,created_by_actor_id,approved_by_actor_id,approved_at::text,
	version,created_at::text,updated_at::text`

func scanDeliveryPricing(row interface{ Scan(dest ...any) error }) (DeliveryPricingRecord, error) {
	var record DeliveryPricingRecord
	var approvedAt sql.NullString
	err := row.Scan(
		&record.StoreID,
		&record.FulfillmentMode,
		&record.FeeMinorUnits,
		&record.Currency,
		&record.Status,
		&record.PricingSource,
		&record.CreatedByActorID,
		&record.ApprovedByActorID,
		&approvedAt,
		&record.Version,
		&record.CreatedAt,
		&record.UpdatedAt,
	)
	if approvedAt.Valid && strings.TrimSpace(approvedAt.String) != "" {
		value := approvedAt.String
		record.ApprovedAt = &value
	}
	return record, err
}

func ListDeliveryPricing(db *sql.DB, storeID string) ([]DeliveryPricingRecord, error) {
	if strings.TrimSpace(storeID) == "" {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`SELECT `+deliveryPricingColumns+`
		FROM dsh_store_delivery_pricing
		WHERE store_id=$1
		ORDER BY CASE fulfillment_mode
			WHEN 'bthwani_delivery' THEN 1
			WHEN 'partner_delivery' THEN 2
			WHEN 'pickup' THEN 3
			ELSE 4 END`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []DeliveryPricingRecord{}
	for rows.Next() {
		record, scanErr := scanDeliveryPricing(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		result = append(result, record)
	}
	return result, rows.Err()
}

func GetDeliveryPricing(db *sql.DB, storeID, fulfillmentMode string) (DeliveryPricingRecord, error) {
	record, err := scanDeliveryPricing(db.QueryRow(`SELECT `+deliveryPricingColumns+`
		FROM dsh_store_delivery_pricing
		WHERE store_id=$1 AND fulfillment_mode=$2`, storeID, fulfillmentMode))
	if errors.Is(err, sql.ErrNoRows) {
		return DeliveryPricingRecord{}, ErrDeliveryPricingNotFound
	}
	return record, err
}

func validateDeliveryPricingInput(fulfillmentMode string, input UpsertDeliveryPricingInput) error {
	if fulfillmentMode != "bthwani_delivery" && fulfillmentMode != "partner_delivery" && fulfillmentMode != "pickup" {
		return ErrInvalid
	}
	if input.FeeMinorUnits < 0 || (fulfillmentMode == "pickup" && input.FeeMinorUnits != 0) {
		return ErrInvalid
	}
	if input.Currency == "" {
		input.Currency = "YER"
	}
	if input.Currency != "YER" {
		return ErrInvalid
	}
	if input.Status != "active" && input.Status != "paused" && input.Status != "archived" {
		return ErrInvalid
	}
	if input.PricingSource != "control_panel" && input.PricingSource != "partner_store" && input.PricingSource != "platform_default" {
		return ErrInvalid
	}
	if strings.TrimSpace(input.ActorID) == "" ||
		(input.ActorSurface != "control-panel" && input.ActorSurface != "app-partner" && input.ActorSurface != "system") {
		return ErrInvalid
	}
	return nil
}

func UpsertDeliveryPricing(
	ctx context.Context,
	db *sql.DB,
	storeID, fulfillmentMode string,
	input UpsertDeliveryPricingInput,
) (DeliveryPricingRecord, error) {
	if input.Currency == "" {
		input.Currency = "YER"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if err := validateDeliveryPricingInput(fulfillmentMode, input); err != nil {
		return DeliveryPricingRecord{}, err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return DeliveryPricingRecord{}, err
	}
	defer tx.Rollback()

	var before DeliveryPricingRecord
	var beforeApprovedAt sql.NullString
	err = tx.QueryRowContext(ctx, `SELECT `+deliveryPricingColumns+`
		FROM dsh_store_delivery_pricing
		WHERE store_id=$1 AND fulfillment_mode=$2
		FOR UPDATE`, storeID, fulfillmentMode).Scan(
		&before.StoreID,
		&before.FulfillmentMode,
		&before.FeeMinorUnits,
		&before.Currency,
		&before.Status,
		&before.PricingSource,
		&before.CreatedByActorID,
		&before.ApprovedByActorID,
		&beforeApprovedAt,
		&before.Version,
		&before.CreatedAt,
		&before.UpdatedAt,
	)
	create := errors.Is(err, sql.ErrNoRows)
	if err != nil && !create {
		return DeliveryPricingRecord{}, err
	}
	if create && input.ExpectedVersion != 0 {
		return DeliveryPricingRecord{}, ErrDeliveryPricingVersionConflict
	}
	if !create && (input.ExpectedVersion <= 0 || input.ExpectedVersion != before.Version) {
		return DeliveryPricingRecord{}, ErrDeliveryPricingVersionConflict
	}

	approvedBy := ""
	var approvedAt any
	if input.Status == "active" {
		approvedBy = input.ActorID
		approvedAt = time.Now().UTC()
	}

	var record DeliveryPricingRecord
	var recordApprovedAt sql.NullString
	if create {
		err = tx.QueryRowContext(ctx, `
			INSERT INTO dsh_store_delivery_pricing
				(store_id,fulfillment_mode,fee_minor_units,currency,status,pricing_source,
				 created_by_actor_id,approved_by_actor_id,approved_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			RETURNING `+deliveryPricingColumns,
			storeID, fulfillmentMode, input.FeeMinorUnits, input.Currency, input.Status,
			input.PricingSource, input.ActorID, approvedBy, approvedAt,
		).Scan(
			&record.StoreID,
			&record.FulfillmentMode,
			&record.FeeMinorUnits,
			&record.Currency,
			&record.Status,
			&record.PricingSource,
			&record.CreatedByActorID,
			&record.ApprovedByActorID,
			&recordApprovedAt,
			&record.Version,
			&record.CreatedAt,
			&record.UpdatedAt,
		)
	} else {
		err = tx.QueryRowContext(ctx, `
			UPDATE dsh_store_delivery_pricing SET
				fee_minor_units=$3,currency=$4,status=$5,pricing_source=$6,
				approved_by_actor_id=$7,approved_at=$8,
				version=version+1,updated_at=NOW()
			WHERE store_id=$1 AND fulfillment_mode=$2 AND version=$9
			RETURNING `+deliveryPricingColumns,
			storeID, fulfillmentMode, input.FeeMinorUnits, input.Currency, input.Status,
			input.PricingSource, approvedBy, approvedAt, input.ExpectedVersion,
		).Scan(
			&record.StoreID,
			&record.FulfillmentMode,
			&record.FeeMinorUnits,
			&record.Currency,
			&record.Status,
			&record.PricingSource,
			&record.CreatedByActorID,
			&record.ApprovedByActorID,
			&recordApprovedAt,
			&record.Version,
			&record.CreatedAt,
			&record.UpdatedAt,
		)
	}
	if errors.Is(err, sql.ErrNoRows) {
		return DeliveryPricingRecord{}, ErrDeliveryPricingVersionConflict
	}
	if err != nil {
		return DeliveryPricingRecord{}, err
	}
	if recordApprovedAt.Valid {
		value := recordApprovedAt.String
		record.ApprovedAt = &value
	}
	action := "create"
	var fromFee any
	var fromStatus any
	if !create {
		action = "update"
		fromFee = before.FeeMinorUnits
		fromStatus = before.Status
		if before.Status != input.Status {
			action = map[string]string{"active": "activate", "paused": "pause", "archived": "archive"}[input.Status]
		}
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_delivery_pricing_audit
			(store_id,fulfillment_mode,actor_id,actor_surface,action,
			 from_fee_minor_units,to_fee_minor_units,from_status,to_status,
			 reason,correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		storeID,
		fulfillmentMode,
		input.ActorID,
		input.ActorSurface,
		action,
		fromFee,
		input.FeeMinorUnits,
		fromStatus,
		input.Status,
		strings.TrimSpace(input.Reason),
		strings.TrimSpace(input.CorrelationID),
	); err != nil {
		return DeliveryPricingRecord{}, fmt.Errorf("write delivery pricing audit: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return DeliveryPricingRecord{}, err
	}
	return record, nil
}
