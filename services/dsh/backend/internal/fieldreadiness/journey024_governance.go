package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"dsh-api/internal/fieldcommissionoutbox"
	"dsh-api/internal/store"
)

const maxLocationFutureSkew = 30 * time.Second

var ErrStoreLocationRequired = errors.New("store location is not registered")

var allowedVisitTypes = map[VisitType]struct{}{
	VisitTypeOnboarding:         {},
	VisitTypePeriodic:           {},
	VisitTypeEscalationFollowup: {},
}

var allowedCheckTypes = map[string]struct{}{
	"location_verified":      {},
	"documents_uploaded":     {},
	"product_list_submitted": {},
	"equipment_checked":      {},
	"safety_compliant":       {},
	"hygiene_compliant":      {},
}

var allowedCheckStatuses = map[CheckStatus]struct{}{
	CheckPending: {},
	CheckPassed:  {},
	CheckFailed:  {},
}

var allowedEscalationSeverities = map[EscalationSeverity]struct{}{
	SeverityLow:      {},
	SeverityMedium:   {},
	SeverityHigh:     {},
	SeverityCritical: {},
}

var allowedEscalationCategories = map[EscalationCategory]struct{}{
	CategoryDocumentMissing:   {},
	CategorySafetyViolation:   {},
	CategoryLocationMismatch:  {},
	CategoryProductCompliance: {},
	CategoryEquipmentFailure:  {},
	CategoryOther:             {},
}

// ValidateGovernedLocation applies the canonical server-side policy to device
// location evidence. Mobile validation is UX-only and never the trust boundary.
func ValidateGovernedLocation(loc *LocationEvidence, now time.Time) error {
	if loc == nil {
		return ErrLocationRequired
	}
	if loc.IsMocked {
		return ErrLocationMocked
	}
	if math.IsNaN(loc.Latitude) || math.IsInf(loc.Latitude, 0) || loc.Latitude < -90 || loc.Latitude > 90 {
		return fmt.Errorf("%w: latitude is outside the valid range", ErrInvalid)
	}
	if math.IsNaN(loc.Longitude) || math.IsInf(loc.Longitude, 0) || loc.Longitude < -180 || loc.Longitude > 180 {
		return fmt.Errorf("%w: longitude is outside the valid range", ErrInvalid)
	}
	if loc.Latitude == 0 && loc.Longitude == 0 {
		return ErrLocationRequired
	}
	if math.IsNaN(loc.AccuracyMeters) || math.IsInf(loc.AccuracyMeters, 0) || loc.AccuracyMeters <= 0 || loc.AccuracyMeters > MinStartAccuracyMeters {
		return ErrLocationAccuracy
	}
	if loc.CapturedAt.IsZero() {
		return ErrLocationRequired
	}
	if loc.CapturedAt.After(now.Add(maxLocationFutureSkew)) {
		return fmt.Errorf("%w: GPS capture time is in the future", ErrInvalid)
	}
	if now.Sub(loc.CapturedAt) > MaxLocationAgeSeconds*time.Second {
		return ErrLocationStale
	}
	if strings.TrimSpace(loc.Provider) == "" {
		return fmt.Errorf("%w: location provider is required", ErrInvalid)
	}
	return nil
}

func validateVisitType(value VisitType) error {
	if value == "" {
		return nil
	}
	if _, ok := allowedVisitTypes[value]; !ok {
		return fmt.Errorf("%w: unsupported visit type", ErrInvalid)
	}
	return nil
}

func loadStoreCoordinates(ctx context.Context, db *sql.DB, storeID string) (float64, float64, error) {
	var latitude, longitude sql.NullFloat64
	err := db.QueryRowContext(ctx, `
		SELECT latitude, longitude
		FROM dsh_stores
		WHERE id = $1`, storeID).Scan(&latitude, &longitude)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, 0, ErrNotFound
	}
	if err != nil {
		return 0, 0, err
	}
	if !latitude.Valid || !longitude.Valid {
		return 0, 0, ErrStoreLocationRequired
	}
	return latitude.Float64, longitude.Float64, nil
}

// CreateGovernedVisit starts a visit only from server-owned store coordinates.
// Any coordinates supplied by a caller are overwritten and cannot influence the
// geofence decision.
func CreateGovernedVisit(ctx context.Context, db *sql.DB, actor store.StoreActor, input CreateVisitInput) (Visit, error) {
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
	distance := haversineMeters(input.StartLocation.Latitude, input.StartLocation.Longitude, latitude, longitude)
	if distance > DefaultGeofenceRadiusMeters {
		return Visit{}, ErrGeofenceViolation
	}
	input.StoreLatitude = &latitude
	input.StoreLongitude = &longitude
	return CreateVisit(ctx, db, actor, input)
}

func hasBlockingEscalation(ctx context.Context, q interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}, visitID string) (bool, error) {
	var count int
	err := q.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_readiness_escalations
		WHERE visit_id = $1
		  AND status IN ('open','acknowledged','escalated_further')`, visitID).Scan(&count)
	return count > 0, err
}

// CompleteGovernedVisit is the canonical completion transaction for JRN-024.
// It validates fresh GPS evidence, exact evidence ownership and store binding,
// all required checks, every blocking escalation state, and the commission
// outbox write before committing the visit state.
func CompleteGovernedVisit(ctx context.Context, db *sql.DB, actor store.StoreActor, visitID string, input CompleteVisitInput) (Visit, error) {
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

	loc := input.CompletionLocation
	radius := visit.GeofenceRadiusMeters
	if radius <= 0 {
		radius = DefaultGeofenceRadiusMeters
	}
	distance := haversineMeters(loc.Latitude, loc.Longitude, *visit.StoreLatitude, *visit.StoreLongitude)
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
		    completion_geofence_status = $9
		WHERE id = $1
		RETURNING `+visitSelectCols,
		visitID, loc.Latitude, loc.Longitude, loc.AccuracyMeters, loc.CapturedAt,
		loc.Provider, loc.IsMocked, distance, geofence,
	)
	updated, err := scanVisit(row)
	if err != nil {
		return Visit{}, err
	}
	if err := fieldcommissionoutbox.Enqueue(tx, fieldcommissionoutbox.EnqueueInput{
		FieldActorID: updated.FieldAgentID,
		VisitID:      updated.ID,
		StoreID:      updated.StoreID,
	}); err != nil {
		return Visit{}, fmt.Errorf("enqueue field commission outbox: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return Visit{}, err
	}
	return updated, nil
}

func validateCheckInput(input UpdateCheckInput) error {
	if _, ok := allowedCheckTypes[input.CheckType]; !ok {
		return fmt.Errorf("%w: unsupported readiness check type", ErrInvalid)
	}
	if _, ok := allowedCheckStatuses[input.Status]; !ok {
		return fmt.Errorf("%w: unsupported readiness check status", ErrInvalid)
	}
	if len(strings.TrimSpace(input.Notes)) > 2000 {
		return fmt.Errorf("%w: readiness check notes are too long", ErrInvalid)
	}
	return nil
}

func validateGovernedCheckEvidence(ctx context.Context, db *sql.DB, actor store.StoreActor, storeID, mediaRef string) error {
	ref := strings.TrimSpace(mediaRef)
	if ref == "" {
		return ErrEvidenceRequired
	}
	var exists bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM dsh_media_refs
			WHERE media_ref = $1
			  AND store_id = $2
			  AND purpose = 'field_readiness_evidence'
			  AND ($3 = 'operator' OR (owner_actor_id = $4 AND owner_actor_role = $3))
		)`, ref, storeID, actor.Role, actor.ID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return ErrEvidenceRequired
	}
	return nil
}

func UpsertGovernedReadinessCheck(ctx context.Context, db *sql.DB, actor store.StoreActor, visitID string, input UpdateCheckInput) (ReadinessCheck, error) {
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
	row := db.QueryRowContext(ctx, `
		INSERT INTO dsh_readiness_checks (visit_id, store_id, check_type, status, evidence_url, notes, verified_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (visit_id, check_type) DO UPDATE
		  SET status = EXCLUDED.status,
		      evidence_url = EXCLUDED.evidence_url,
		      notes = EXCLUDED.notes,
		      verified_by = EXCLUDED.verified_by,
		      updated_at = NOW()
		RETURNING id, visit_id, store_id, check_type, status, COALESCE(evidence_url,''),
		          COALESCE(notes,''), verified_by, created_at, updated_at`,
		visit.ID, visit.StoreID, input.CheckType, input.Status,
		strings.TrimSpace(input.EvidenceURL), strings.TrimSpace(input.Notes), actor.ID,
	)
	var check ReadinessCheck
	err = row.Scan(&check.ID, &check.VisitID, &check.StoreID, &check.CheckType, &check.Status,
		&check.EvidenceURL, &check.Notes, &check.VerifiedBy, &check.CreatedAt, &check.UpdatedAt)
	return check, err
}

func validateEscalationInput(input CreateEscalationInput) error {
	if strings.TrimSpace(input.StoreID) == "" || strings.TrimSpace(input.RaisedBy) == "" {
		return ErrInvalid
	}
	if _, ok := allowedEscalationSeverities[input.Severity]; !ok {
		return fmt.Errorf("%w: unsupported escalation severity", ErrInvalid)
	}
	if _, ok := allowedEscalationCategories[input.Category]; !ok {
		return fmt.Errorf("%w: unsupported escalation category", ErrInvalid)
	}
	description := strings.TrimSpace(input.Description)
	if len(description) < 3 || len(description) > 2000 {
		return fmt.Errorf("%w: escalation description must be between 3 and 2000 characters", ErrInvalid)
	}
	return nil
}

func CreateGovernedEscalation(ctx context.Context, db *sql.DB, actor store.StoreActor, input CreateEscalationInput) (Escalation, error) {
	if err := validateEscalationInput(input); err != nil {
		return Escalation{}, err
	}
	input.Description = strings.TrimSpace(input.Description)
	return CreateEscalation(ctx, db, actor, input)
}

func allowedEscalationTransition(from, to EscalationStatus) bool {
	if from == to {
		return from == EscalationAcknowledged || from == EscalationResolved || from == EscalationEscalatedFurther
	}
	switch from {
	case EscalationOpen:
		return to == EscalationAcknowledged || to == EscalationResolved || to == EscalationEscalatedFurther
	case EscalationAcknowledged:
		return to == EscalationResolved || to == EscalationEscalatedFurther
	case EscalationEscalatedFurther:
		return to == EscalationAcknowledged || to == EscalationResolved
	default:
		return false
	}
}

func UpdateGovernedEscalation(ctx context.Context, db *sql.DB, escalationID string, input UpdateEscalationInput) (Escalation, error) {
	if strings.TrimSpace(escalationID) == "" || strings.TrimSpace(input.ResolvedBy) == "" {
		return Escalation{}, ErrInvalid
	}
	if input.Status != EscalationAcknowledged && input.Status != EscalationResolved && input.Status != EscalationEscalatedFurther {
		return Escalation{}, fmt.Errorf("%w: unsupported escalation transition target", ErrInvalid)
	}
	note := strings.TrimSpace(input.ResolutionNote)
	if (input.Status == EscalationResolved || input.Status == EscalationEscalatedFurther) && len(note) < 3 {
		return Escalation{}, fmt.Errorf("%w: a resolution or escalation note is required", ErrInvalid)
	}
	if len(note) > 2000 {
		return Escalation{}, fmt.Errorf("%w: escalation note is too long", ErrInvalid)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Escalation{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var current EscalationStatus
	if err := tx.QueryRowContext(ctx, `SELECT status FROM dsh_readiness_escalations WHERE id = $1 FOR UPDATE`, escalationID).Scan(&current); errors.Is(err, sql.ErrNoRows) {
		return Escalation{}, ErrNotFound
	} else if err != nil {
		return Escalation{}, err
	}
	if !allowedEscalationTransition(current, input.Status) {
		return Escalation{}, fmt.Errorf("%w: escalation transition is not allowed", ErrInvalid)
	}

	row := tx.QueryRowContext(ctx, `
		UPDATE dsh_readiness_escalations
		SET status = $2,
		    resolved_by = $3,
		    resolution_note = $4,
		    resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE NULL END,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, COALESCE(visit_id::text,''), store_id, raised_by, severity, category,
		          description, status, COALESCE(resolved_by,''), resolved_at,
		          COALESCE(resolution_note,''), created_at, updated_at`,
		escalationID, input.Status, input.ResolvedBy, note,
	)
	updated, err := scanEscalation(row)
	if err != nil {
		return Escalation{}, err
	}
	if err := tx.Commit(); err != nil {
		return Escalation{}, err
	}
	return updated, nil
}

func GetGovernedStoreOnboardingStatus(ctx context.Context, db *sql.DB, storeID string) (map[string]any, error) {
	var totalVisits, completedVisits, blockingEscalations int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_field_visits WHERE store_id = $1`, storeID).Scan(&totalVisits); err != nil {
		return nil, err
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_field_visits WHERE store_id = $1 AND status = 'complete'`, storeID).Scan(&completedVisits); err != nil {
		return nil, err
	}
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_readiness_escalations
		WHERE store_id = $1
		  AND status IN ('open','acknowledged','escalated_further')`, storeID).Scan(&blockingEscalations); err != nil {
		return nil, err
	}
	onboardingComplete := completedVisits > 0 && blockingEscalations == 0
	return map[string]any{
		"storeId":            storeID,
		"totalVisits":        totalVisits,
		"completedVisits":    completedVisits,
		"openEscalations":    blockingEscalations,
		"onboardingComplete": onboardingComplete,
		"status":             resolveOnboardingStatus(completedVisits, blockingEscalations),
	}, nil
}
