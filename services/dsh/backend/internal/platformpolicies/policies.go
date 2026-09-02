package platformpolicies

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var (
	ErrInvalid                = errors.New("invalid platform policy")
	ErrNotFound               = errors.New("platform policy not found")
	ErrVersionConflict        = errors.New("platform policy version conflict")
	ErrIdempotencyConflict    = errors.New("platform policy idempotency conflict")
	ErrPolicyTruthUnavailable = errors.New("operational policy truth unavailable")
)

type MutationContext struct {
	ActorID        string
	ActorSurface   string
	IdempotencyKey string
	CorrelationID  string
	Reason         string
}

type Zone struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	ServiceAreaCode string    `json:"serviceAreaCode"`
	IsActive        bool      `json:"isActive"`
	Description     string    `json:"description"`
	Version         int       `json:"version"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type SlaRule struct {
	ID                         string    `json:"id"`
	ZoneID                     string    `json:"zoneId"`
	Category                   string    `json:"category"`
	MaxPrepMins                int       `json:"maxPrepMins"`
	MaxAssignmentMins          int       `json:"maxAssignmentMins"`
	MaxDeliveryMins            int       `json:"maxDeliveryMins"`
	WarningBeforeMins          int       `json:"warningBeforeMins"`
	PickupNotifyMins           int       `json:"pickupNotifyMins"`
	PickupArrivalMins          int       `json:"pickupArrivalMins"`
	PickupVerifyMins           int       `json:"pickupVerifyMins"`
	DeliveryAssignToPickupMins int       `json:"deliveryAssignToPickupMins"`
	DeliveryPickupToDepartMins int       `json:"deliveryPickupToDepartMins"`
	DeliveryDepartToArriveMins int       `json:"deliveryDepartToArriveMins"`
	DeliveryArriveToProofMins  int       `json:"deliveryArriveToProofMins"`
	Version                    int       `json:"version"`
	UpdatedBy                  string    `json:"updatedBy"`
	UpdatedAt                  time.Time `json:"updatedAt"`
}

type CapacityConfig struct {
	ID                  string    `json:"id"`
	ZoneID              string    `json:"zoneId"`
	MaxConcurrentOrders int       `json:"maxConcurrentOrders"`
	MaxCaptainsOnline   int       `json:"maxCaptainsOnline"`
	ThrottleThreshold   float64   `json:"throttleThreshold"`
	Version             int       `json:"version"`
	UpdatedBy           string    `json:"updatedBy"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type ZoneServiceability struct {
	ZoneID       string `json:"zoneId"`
	IsActive     bool   `json:"isActive"`
	ActiveStores int    `json:"activeStores"`
	SlaAvailable bool   `json:"slaAvailable"`
}

func ListZones(
	ctx context.Context,
	db *sql.DB,
	includeInactive bool,
) ([]Zone, error) {
	query := `
		SELECT id, name, service_area_code, is_active, description, version, created_at, updated_at
		FROM dsh_platform_zones`
	if !includeInactive {
		query += ` WHERE is_active = TRUE`
	}
	query += ` ORDER BY service_area_code, name, id`

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	items := []Zone{}
	for rows.Next() {
		var item Zone
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.ServiceAreaCode,
			&item.IsActive,
			&item.Description,
			&item.Version,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func GetZoneServiceability(
	ctx context.Context,
	db *sql.DB,
	zoneID string,
) (ZoneServiceability, error) {
	result := ZoneServiceability{ZoneID: strings.TrimSpace(zoneID)}
	if result.ZoneID == "" {
		return result, ErrInvalid
	}
	err := db.QueryRowContext(ctx, `
		SELECT
			z.is_active,
			(
				SELECT COUNT(*)::int
				FROM dsh_stores s
				WHERE s.service_area_code = z.service_area_code
				  AND s.status = 'published'
				  AND s.is_visible = TRUE
				  AND s.serviceability_status = 'serviceable'
				  AND s.marketing_visibility = 'visible'
			),
			EXISTS (
				SELECT 1
				FROM dsh_platform_sla_rules r
				WHERE r.zone_id = z.id
			)
		FROM dsh_platform_zones z
		WHERE z.id = $1`, result.ZoneID).Scan(
		&result.IsActive,
		&result.ActiveStores,
		&result.SlaAvailable,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return result, ErrNotFound
	}
	return result, err
}

func validMutation(mutation MutationContext) bool {
	return strings.TrimSpace(mutation.ActorID) != "" &&
		strings.TrimSpace(mutation.ActorSurface) != "" &&
		len(strings.TrimSpace(mutation.IdempotencyKey)) >= 8 &&
		len(strings.TrimSpace(mutation.Reason)) >= 3 &&
		len(strings.TrimSpace(mutation.Reason)) <= 500
}

func withIdempotency[T any](
	ctx context.Context,
	db *sql.DB,
	mutation MutationContext,
	operation string,
	input any,
	work func(*sql.Tx) (T, error),
) (T, error) {
	var zero T
	payload, err := json.Marshal(input)
	if err != nil {
		return zero, err
	}
	sum := sha256.Sum256(payload)
	requestHash := hex.EncodeToString(sum[:])

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return zero, err
	}
	defer func() { _ = tx.Rollback() }()

	lockKey := mutation.ActorID + "|" + operation + "|" + mutation.IdempotencyKey
	if _, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		lockKey,
	); err != nil {
		return zero, err
	}

	var storedHash string
	var storedResponse []byte
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, response_body
		FROM dsh_platform_policy_mutation_results
		WHERE actor_id = $1 AND operation = $2 AND idempotency_key = $3`,
		mutation.ActorID,
		operation,
		mutation.IdempotencyKey,
	).Scan(&storedHash, &storedResponse)
	if err == nil {
		if storedHash != requestHash {
			return zero, ErrIdempotencyConflict
		}
		var replay T
		if err := json.Unmarshal(storedResponse, &replay); err != nil {
			return zero, err
		}
		if err := tx.Commit(); err != nil {
			return zero, err
		}
		return replay, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return zero, err
	}

	result, err := work(tx)
	if err != nil {
		return zero, err
	}
	responseBody, err := json.Marshal(result)
	if err != nil {
		return zero, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_platform_policy_mutation_results
			(actor_id, operation, idempotency_key, request_hash, response_body)
		VALUES ($1, $2, $3, $4, $5::jsonb)`,
		mutation.ActorID,
		operation,
		mutation.IdempotencyKey,
		requestHash,
		string(responseBody),
	); err != nil {
		return zero, err
	}
	if err := tx.Commit(); err != nil {
		return zero, err
	}
	return result, nil
}

func insertEvent(
	ctx context.Context,
	tx *sql.Tx,
	aggregateType string,
	aggregateID string,
	action string,
	mutation MutationContext,
	fromVersion any,
	toVersion int,
	payload any,
) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_platform_policy_events
			(aggregate_type, aggregate_id, action, actor_id, actor_surface,
			 correlation_id, reason, from_version, to_version, payload)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8, $9, $10::jsonb)`,
		aggregateType,
		aggregateID,
		action,
		mutation.ActorID,
		mutation.ActorSurface,
		mutation.CorrelationID,
		mutation.Reason,
		fromVersion,
		toVersion,
		string(body),
	)
	return err
}
