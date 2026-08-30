package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"dsh-api/internal/store"
)

const maxLocationFutureSkew = 30 * time.Second

var ErrStoreLocationRequired = errors.New("store location is not registered")

var allowedVisitTypes = map[VisitType]struct{}{
	VisitTypeOnboarding:         {},
	VisitTypePeriodic:           {},
	VisitTypeEscalationFollowup: {},
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

func validateCheckInput(input UpdateCheckInput) error {
	if !checkTypePattern.MatchString(strings.TrimSpace(input.CheckType)) {
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

func UpdateGovernedEscalation(ctx context.Context, db *sql.DB, escalationID, operatorContextID string, input UpdateEscalationInput) (Escalation, error) {
	if strings.TrimSpace(escalationID) == "" || strings.TrimSpace(input.ResolvedBy) == "" {
		return Escalation{}, ErrInvalid
	}
	if strings.TrimSpace(operatorContextID) == "" {
		return Escalation{}, ErrForbidden
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
	if err := tx.QueryRowContext(ctx, `
		SELECT e.status
		FROM dsh_readiness_escalations e
		JOIN dsh_stores s ON s.id = e.store_id
		WHERE e.id = $1 AND s.operator_context_id = $2
		FOR UPDATE OF e`, escalationID, operatorContextID).Scan(&current); errors.Is(err, sql.ErrNoRows) {
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
