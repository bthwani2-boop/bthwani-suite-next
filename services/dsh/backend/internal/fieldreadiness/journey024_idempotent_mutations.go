package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/fieldcommissionoutbox"
	"dsh-api/internal/store"
)

func CreateGovernedVisitIdempotent(
	ctx context.Context,
	db *sql.DB,
	actor store.StoreActor,
	input CreateVisitInput,
	mutation MutationContext,
) (Visit, error) {
	if err := validateMutationContext(mutation); err != nil {
		return Visit{}, err
	}
	if strings.TrimSpace(input.StoreID) == "" || strings.TrimSpace(input.FieldAgentID) == "" {
		return Visit{}, ErrInvalid
	}
	if actor.Role != "operator" && input.FieldAgentID != actor.ID {
		return Visit{}, ErrForbidden
	}
	if err := validateVisitType(input.VisitType); err != nil {
		return Visit{}, err
	}
	if err := ValidateGovernedLocation(input.StartLocation, time.Now()); err != nil {
		return Visit{}, err
	}
	if err := AuthorizeStore(ctx, db, actor, input.StoreID); err != nil {
		return Visit{}, err
	}
	latitude, longitude, err := loadStoreCoordinates(ctx, db, input.StoreID)
	if err != nil {
		return Visit{}, err
	}
	distance := haversineMeters(
		input.StartLocation.Latitude,
		input.StartLocation.Longitude,
		latitude,
		longitude,
	)
	if distance > DefaultGeofenceRadiusMeters {
		return Visit{}, ErrGeofenceViolation
	}
	input.StoreLatitude = &latitude
	input.StoreLongitude = &longitude

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Visit{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var replay Visit
	found, err := loadMutationReceiptTx(ctx, tx, actor.ID, MutationCreateVisit, mutation, &replay)
	if err != nil {
		return Visit{}, err
	}
	if found {
		return replay, nil
	}

	created, err := insertGovernedVisitTx(ctx, tx, input, mutation)
	if err != nil {
		return Visit{}, err
	}
	if err := storeMutationReceiptTx(
		ctx,
		tx,
		actor.ID,
		MutationCreateVisit,
		created.ID,
		mutation,
		created,
	); err != nil {
		return Visit{}, err
	}
	if err := tx.Commit(); err != nil {
		return Visit{}, err
	}
	return created, nil
}

func CompleteGovernedVisitIdempotent(
	ctx context.Context,
	db *sql.DB,
	actor store.StoreActor,
	visitID string,
	input CompleteVisitInput,
	mutation MutationContext,
) (Visit, error) {
	if err := validateMutationContext(mutation); err != nil {
		return Visit{}, err
	}
	if strings.TrimSpace(visitID) == "" {
		return Visit{}, ErrInvalid
	}
	if err := ValidateGovernedLocation(input.CompletionLocation, time.Now()); err != nil {
		return Visit{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Visit{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var replay Visit
	found, err := loadMutationReceiptTx(ctx, tx, actor.ID, MutationCompleteVisit, mutation, &replay)
	if err != nil {
		return Visit{}, err
	}
	if found {
		return replay, nil
	}

	row := tx.QueryRowContext(ctx, `SELECT `+visitSelectCols+` FROM dsh_field_visits WHERE id = $1 FOR UPDATE`, visitID)
	visit, err := scanVisit(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Visit{}, ErrNotFound
	}
	if err != nil {
		return Visit{}, err
	}
	if actor.Role != "operator" && visit.FieldAgentID != actor.ID {
		return Visit{}, ErrForbidden
	}
	allowed, err := store.ActorCanAccessStore(ctx, db, actor, visit.StoreID)
	if err != nil {
		return Visit{}, err
	}
	if !allowed {
		return Visit{}, ErrForbidden
	}
	if visit.Status == VisitComplete {
		return Visit{}, ErrVisitAlreadyComplete
	}
	if visit.Status != VisitInProgress {
		return Visit{}, ErrInvalid
	}
	if visit.StoreLatitude == nil || visit.StoreLongitude == nil {
		return Visit{}, ErrStoreLocationRequired
	}

	location := input.CompletionLocation
	radius := visit.GeofenceRadiusMeters
	if radius <= 0 {
		radius = DefaultGeofenceRadiusMeters
	}
	distance := haversineMeters(
		location.Latitude,
		location.Longitude,
		*visit.StoreLatitude,
		*visit.StoreLongitude,
	)
	if distance > radius {
		return Visit{}, ErrGeofenceViolation
	}
	geofence := geofenceStatus(distance, radius)

	rows, err := tx.QueryContext(ctx, `
		SELECT checks.check_type, checks.status,
		       EXISTS (
		         SELECT 1
		         FROM dsh_media_refs refs
		         WHERE refs.media_ref = checks.evidence_url
		           AND refs.store_id = checks.store_id
		           AND refs.purpose = 'field_readiness_evidence'
		           AND ($2 = 'operator' OR (refs.owner_actor_id = $3 AND refs.owner_actor_role = $2))
		       )
		FROM dsh_readiness_checks checks
		WHERE checks.visit_id = $1`, visitID, actor.Role, actor.ID)
	if err != nil {
		return Visit{}, err
	}
	passed := make(map[string]bool, len(RequiredCheckTypes))
	evidenceValid := make(map[string]bool, len(RequiredCheckTypes))
	for rows.Next() {
		var checkType, status string
		var validEvidence bool
		if err := rows.Scan(&checkType, &status, &validEvidence); err != nil {
			rows.Close()
			return Visit{}, err
		}
		if status == string(CheckPassed) {
			passed[checkType] = true
			evidenceValid[checkType] = validEvidence
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return Visit{}, err
	}
	rows.Close()
	for _, required := range RequiredCheckTypes {
		if !passed[required] {
			return Visit{}, ErrChecklistIncomplete
		}
		if !evidenceValid[required] {
			return Visit{}, ErrEvidenceRequired
		}
	}

	blocking, err := hasBlockingEscalation(ctx, tx, visitID)
	if err != nil {
		return Visit{}, err
	}
	if blocking {
		return Visit{}, ErrOpenEscalation
	}

	row = tx.QueryRowContext(ctx, `
		UPDATE dsh_field_visits
		SET status = 'complete', completed_at = NOW(), updated_at = NOW(),
		    completion_latitude = $2, completion_longitude = $3,
		    completion_accuracy_meters = $4, completion_captured_at = $5,
		    completion_provider = $6, completion_is_mocked = $7,
		    completion_distance_from_store_meters = $8,
		    completion_geofence_status = $9,
		    completion_idempotency_key = $10,
		    completion_request_hash = $11,
		    completion_correlation_id = $12
		WHERE id = $1
		RETURNING `+visitSelectCols,
		visitID,
		location.Latitude,
		location.Longitude,
		location.AccuracyMeters,
		location.CapturedAt,
		location.Provider,
		location.IsMocked,
		distance,
		geofence,
		mutation.IdempotencyKey,
		mutation.RequestHash,
		mutation.CorrelationID,
	)
	completed, err := scanVisit(row)
	if err != nil {
		return Visit{}, err
	}
	if err := fieldcommissionoutbox.Enqueue(tx, fieldcommissionoutbox.EnqueueInput{
		FieldActorID: completed.FieldAgentID,
		VisitID:      completed.ID,
		StoreID:      completed.StoreID,
	}); err != nil {
		return Visit{}, fmt.Errorf("enqueue field commission outbox: %w", err)
	}
	if err := storeMutationReceiptTx(
		ctx,
		tx,
		actor.ID,
		MutationCompleteVisit,
		completed.ID,
		mutation,
		completed,
	); err != nil {
		return Visit{}, err
	}
	if err := tx.Commit(); err != nil {
		return Visit{}, err
	}
	return completed, nil
}

func UpsertGovernedReadinessCheckIdempotent(
	ctx context.Context,
	db *sql.DB,
	actor store.StoreActor,
	visitID string,
	input UpdateCheckInput,
	mutation MutationContext,
) (ReadinessCheck, error) {
	if err := validateMutationContext(mutation); err != nil {
		return ReadinessCheck{}, err
	}
	if err := validateCheckInput(input); err != nil {
		return ReadinessCheck{}, err
	}
	visit, err := GetOwnedVisit(ctx, db, actor, visitID)
	if err != nil {
		return ReadinessCheck{}, err
	}
	if visit.Status == VisitComplete {
		return ReadinessCheck{}, ErrVisitAlreadyComplete
	}
	if input.Status == CheckPassed {
		if err := validateGovernedCheckEvidence(ctx, db, actor, visit.StoreID, input.EvidenceURL); err != nil {
			return ReadinessCheck{}, err
		}
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ReadinessCheck{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var replay ReadinessCheck
	found, err := loadMutationReceiptTx(ctx, tx, actor.ID, MutationUpsertCheck, mutation, &replay)
	if err != nil {
		return ReadinessCheck{}, err
	}
	if found {
		return replay, nil
	}

	var currentStatus VisitStatus
	if err := tx.QueryRowContext(
		ctx,
		`SELECT status FROM dsh_field_visits WHERE id = $1 FOR UPDATE`,
		visitID,
	).Scan(&currentStatus); errors.Is(err, sql.ErrNoRows) {
		return ReadinessCheck{}, ErrNotFound
	} else if err != nil {
		return ReadinessCheck{}, err
	}
	if currentStatus == VisitComplete {
		return ReadinessCheck{}, ErrVisitAlreadyComplete
	}

	updated, err := upsertGovernedCheckTx(ctx, tx, visit, actor.ID, input, mutation)
	if err != nil {
		return ReadinessCheck{}, err
	}
	if err := storeMutationReceiptTx(
		ctx,
		tx,
		actor.ID,
		MutationUpsertCheck,
		updated.ID,
		mutation,
		updated,
	); err != nil {
		return ReadinessCheck{}, err
	}
	if err := tx.Commit(); err != nil {
		return ReadinessCheck{}, err
	}
	return updated, nil
}

func CreateGovernedEscalationIdempotent(
	ctx context.Context,
	db *sql.DB,
	actor store.StoreActor,
	input CreateEscalationInput,
	mutation MutationContext,
) (Escalation, error) {
	if err := validateMutationContext(mutation); err != nil {
		return Escalation{}, err
	}
	if err := validateEscalationInput(input); err != nil {
		return Escalation{}, err
	}
	input.Description = strings.TrimSpace(input.Description)
	if err := AuthorizeStore(ctx, db, actor, input.StoreID); err != nil {
		return Escalation{}, err
	}
	if strings.TrimSpace(input.VisitID) != "" {
		visit, err := GetVisit(ctx, db, input.VisitID)
		if err != nil {
			return Escalation{}, err
		}
		if visit.StoreID != input.StoreID {
			return Escalation{}, ErrInvalid
		}
		if actor.Role != "operator" && visit.FieldAgentID != actor.ID {
			return Escalation{}, ErrForbidden
		}
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Escalation{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var replay Escalation
	found, err := loadMutationReceiptTx(ctx, tx, actor.ID, MutationEscalation, mutation, &replay)
	if err != nil {
		return Escalation{}, err
	}
	if found {
		return replay, nil
	}

	created, err := insertGovernedEscalationTx(ctx, tx, input, mutation)
	if err != nil {
		return Escalation{}, err
	}
	if err := storeMutationReceiptTx(
		ctx,
		tx,
		actor.ID,
		MutationEscalation,
		created.ID,
		mutation,
		created,
	); err != nil {
		return Escalation{}, err
	}
	if err := tx.Commit(); err != nil {
		return Escalation{}, err
	}
	return created, nil
}
