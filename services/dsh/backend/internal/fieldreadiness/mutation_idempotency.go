package fieldreadiness

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

var (
	ErrIdempotencyRequired = errors.New("field readiness idempotency context is required")
	ErrIdempotencyConflict = errors.New("idempotency key was already used with different field readiness inputs")
	ErrTenantContext       = errors.New("trusted tenant context is required for field readiness mutation")
)

type MutationOperation string

const (
	MutationCreateVisit   MutationOperation = "create_visit"
	MutationCompleteVisit MutationOperation = "complete_visit"
	MutationUpsertCheck   MutationOperation = "upsert_readiness_check"
	MutationEscalation    MutationOperation = "create_escalation"
)

type MutationContext struct {
	IdempotencyKey string
	CorrelationID  string
	RequestHash    string
}

func BuildMutationContext(idempotencyKey, correlationID string, request any) (MutationContext, error) {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 || correlationID == "" || len(correlationID) > 200 {
		return MutationContext{}, ErrIdempotencyRequired
	}
	canonical, err := json.Marshal(request)
	if err != nil {
		return MutationContext{}, fmt.Errorf("encode field readiness mutation request: %w", err)
	}
	digest := sha256.Sum256(canonical)
	return MutationContext{
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
		RequestHash:    hex.EncodeToString(digest[:]),
	}, nil
}

func validateMutationContext(mutation MutationContext) error {
	if len(strings.TrimSpace(mutation.IdempotencyKey)) < 8 || len(mutation.IdempotencyKey) > 200 {
		return ErrIdempotencyRequired
	}
	if strings.TrimSpace(mutation.CorrelationID) == "" || len(mutation.CorrelationID) > 200 {
		return ErrIdempotencyRequired
	}
	if len(mutation.RequestHash) != sha256.Size*2 {
		return ErrIdempotencyRequired
	}
	return nil
}

func trustedTenantIDTx(ctx context.Context, tx *sql.Tx) (string, error) {
	var tenant sql.NullString
	if err := tx.QueryRowContext(ctx, `SELECT NULLIF(current_setting('bthwani.tenant_id', TRUE), '')`).Scan(&tenant); err != nil {
		return "", err
	}
	if !tenant.Valid || strings.TrimSpace(tenant.String) == "" {
		return "", ErrTenantContext
	}
	return strings.TrimSpace(tenant.String), nil
}

func loadMutationReceiptTx(
	ctx context.Context,
	tx *sql.Tx,
	actorID string,
	operation MutationOperation,
	mutation MutationContext,
	response any,
) (bool, error) {
	if err := validateMutationContext(mutation); err != nil {
		return false, err
	}
	tenantID, err := trustedTenantIDTx(ctx, tx)
	if err != nil {
		return false, err
	}
	lockIdentity := strings.Join([]string{tenantID, actorID, string(operation), mutation.IdempotencyKey}, "|")
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockIdentity); err != nil {
		return false, err
	}

	var storedHash string
	var storedResponse []byte
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, response_json
		FROM dsh_field_readiness_operation_receipts
		WHERE tenant_id = $1 AND actor_id = $2 AND operation = $3 AND idempotency_key = $4`,
		tenantID, actorID, operation, mutation.IdempotencyKey,
	).Scan(&storedHash, &storedResponse)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if storedHash != mutation.RequestHash {
		return false, ErrIdempotencyConflict
	}
	if err := json.Unmarshal(storedResponse, response); err != nil {
		return false, fmt.Errorf("decode field readiness mutation receipt: %w", err)
	}
	return true, nil
}

func storeMutationReceiptTx(
	ctx context.Context,
	tx *sql.Tx,
	actorID string,
	operation MutationOperation,
	resourceID string,
	mutation MutationContext,
	response any,
) error {
	tenantID, err := trustedTenantIDTx(ctx, tx)
	if err != nil {
		return err
	}
	encoded, err := json.Marshal(response)
	if err != nil {
		return fmt.Errorf("encode field readiness mutation receipt response: %w", err)
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_field_readiness_operation_receipts
		  (tenant_id, actor_id, operation, resource_id, idempotency_key, request_hash, correlation_id, response_json)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
		tenantID,
		actorID,
		operation,
		resourceID,
		mutation.IdempotencyKey,
		mutation.RequestHash,
		mutation.CorrelationID,
		string(encoded),
	)
	return err
}

func insertGovernedVisitTx(
	ctx context.Context,
	tx *sql.Tx,
	input CreateVisitInput,
	mutation MutationContext,
) (Visit, error) {
	visitType := input.VisitType
	if visitType == "" {
		visitType = VisitTypeOnboarding
	}
	location := input.StartLocation
	radius := DefaultGeofenceRadiusMeters
	distance := haversineMeters(
		location.Latitude,
		location.Longitude,
		*input.StoreLatitude,
		*input.StoreLongitude,
	)
	geofence := geofenceStatus(distance, radius)

	row := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_field_visits
		  (store_id, field_agent_id, visit_type,
		   start_latitude, start_longitude, start_accuracy_meters, start_captured_at,
		   start_provider, start_device_reference, start_is_mocked,
		   store_latitude, store_longitude, geofence_radius_meters,
		   start_distance_from_store_meters, start_geofence_status,
		   create_idempotency_key, create_request_hash, create_correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING `+visitSelectCols,
		input.StoreID,
		input.FieldAgentID,
		visitType,
		location.Latitude,
		location.Longitude,
		location.AccuracyMeters,
		location.CapturedAt,
		location.Provider,
		location.DeviceReference,
		location.IsMocked,
		input.StoreLatitude,
		input.StoreLongitude,
		radius,
		distance,
		geofence,
		mutation.IdempotencyKey,
		mutation.RequestHash,
		mutation.CorrelationID,
	)
	visit, err := scanVisit(row)
	if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
		return Visit{}, ErrConflict
	}
	return visit, err
}

func upsertGovernedCheckTx(
	ctx context.Context,
	tx *sql.Tx,
	visit Visit,
	actorID string,
	input UpdateCheckInput,
	mutation MutationContext,
) (ReadinessCheck, error) {
	row := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_readiness_checks
		  (visit_id, store_id, check_type, status, evidence_url, notes, verified_by,
		   mutation_idempotency_key, mutation_request_hash, mutation_correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT (visit_id, check_type) DO UPDATE
		  SET status = EXCLUDED.status,
		      evidence_url = EXCLUDED.evidence_url,
		      notes = EXCLUDED.notes,
		      verified_by = EXCLUDED.verified_by,
		      mutation_idempotency_key = EXCLUDED.mutation_idempotency_key,
		      mutation_request_hash = EXCLUDED.mutation_request_hash,
		      mutation_correlation_id = EXCLUDED.mutation_correlation_id,
		      updated_at = NOW()
		RETURNING id, visit_id, store_id, check_type, status, COALESCE(evidence_url,''),
		          COALESCE(notes,''), verified_by, created_at, updated_at`,
		visit.ID,
		visit.StoreID,
		input.CheckType,
		input.Status,
		strings.TrimSpace(input.EvidenceURL),
		strings.TrimSpace(input.Notes),
		actorID,
		mutation.IdempotencyKey,
		mutation.RequestHash,
		mutation.CorrelationID,
	)
	var check ReadinessCheck
	err := row.Scan(
		&check.ID,
		&check.VisitID,
		&check.StoreID,
		&check.CheckType,
		&check.Status,
		&check.EvidenceURL,
		&check.Notes,
		&check.VerifiedBy,
		&check.CreatedAt,
		&check.UpdatedAt,
	)
	return check, err
}

func insertGovernedEscalationTx(
	ctx context.Context,
	tx *sql.Tx,
	input CreateEscalationInput,
	mutation MutationContext,
) (Escalation, error) {
	var visitID sql.NullString
	if strings.TrimSpace(input.VisitID) != "" {
		visitID = sql.NullString{String: strings.TrimSpace(input.VisitID), Valid: true}
	}
	row := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_readiness_escalations
		  (visit_id, store_id, raised_by, severity, category, description,
		   create_idempotency_key, create_request_hash, create_correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, COALESCE(visit_id::text,''), store_id, raised_by, severity, category,
		          description, status, COALESCE(resolved_by,''), resolved_at,
		          COALESCE(resolution_note,''), created_at, updated_at`,
		visitID,
		input.StoreID,
		input.RaisedBy,
		input.Severity,
		input.Category,
		strings.TrimSpace(input.Description),
		mutation.IdempotencyKey,
		mutation.RequestHash,
		mutation.CorrelationID,
	)
	return scanEscalation(row)
}
