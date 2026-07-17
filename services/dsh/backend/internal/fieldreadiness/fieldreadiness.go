package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"

	"dsh-api/internal/fieldcommissionoutbox"
	"dsh-api/internal/store"
)

var (
	ErrNotFound             = errors.New("field readiness record not found")
	ErrInvalid              = errors.New("invalid field readiness input")
	ErrForbidden            = errors.New("field readiness access forbidden")
	ErrChecklistIncomplete  = errors.New("required readiness checks are not all passed")
	ErrOpenEscalation       = errors.New("visit has an open blocking escalation")
	ErrVisitAlreadyComplete = errors.New("visit is already complete")
	ErrConflict             = errors.New("conflicting in-progress visit exists")
	ErrEvidenceRequired     = errors.New("required readiness evidence is missing")
	ErrLocationRequired     = errors.New("visit start requires GPS location evidence")
	ErrLocationStale        = errors.New("GPS location is too old — recapture required")
	ErrLocationAccuracy     = errors.New("GPS accuracy is insufficient")
	ErrLocationMocked       = errors.New("mocked GPS location is not permitted")
	ErrGeofenceViolation    = errors.New("completion location is outside the allowed geofence radius")
)

// ─── Geofence policy (centralised — not a hard-coded screen constant) ────────

const (
	// DefaultGeofenceRadiusMeters is the maximum distance a field agent may be
	// from the store's registered coordinates when starting or completing a visit.
	DefaultGeofenceRadiusMeters = 200.0
	// MinStartAccuracyMeters rejects GPS readings with accuracy worse than this.
	MinStartAccuracyMeters = 50.0
	// MaxLocationAgeSeconds rejects GPS readings captured more than this many
	// seconds before the API call.
	MaxLocationAgeSeconds = 120
)

type VisitStatus string
type CheckStatus string
type EscalationStatus string
type EscalationSeverity string
type EscalationCategory string
type CheckType string
type VisitType string

const (
	VisitInProgress VisitStatus = "in_progress"
	VisitComplete   VisitStatus = "complete"
	VisitEscalated  VisitStatus = "escalated"

	CheckPending CheckStatus = "pending"
	CheckPassed  CheckStatus = "passed"
	CheckFailed  CheckStatus = "failed"

	EscalationOpen             EscalationStatus = "open"
	EscalationAcknowledged     EscalationStatus = "acknowledged"
	EscalationResolved         EscalationStatus = "resolved"
	EscalationEscalatedFurther EscalationStatus = "escalated_further"

	SeverityLow      EscalationSeverity = "low"
	SeverityMedium   EscalationSeverity = "medium"
	SeverityHigh     EscalationSeverity = "high"
	SeverityCritical EscalationSeverity = "critical"

	CategoryDocumentMissing   EscalationCategory = "document_missing"
	CategorySafetyViolation   EscalationCategory = "safety_violation"
	CategoryLocationMismatch  EscalationCategory = "location_mismatch"
	CategoryProductCompliance EscalationCategory = "product_compliance"
	CategoryEquipmentFailure  EscalationCategory = "equipment_failure"
	CategoryOther             EscalationCategory = "other"

	VisitTypeOnboarding         VisitType = "onboarding"
	VisitTypePeriodic           VisitType = "periodic"
	VisitTypeEscalationFollowup VisitType = "escalation_followup"
)

// RequiredCheckTypes are the readiness check types that must all be recorded
// with status=passed before a visit may be completed. Mirrors the check_type
// CHECK constraint on dsh_readiness_checks (migration dsh-008).
var RequiredCheckTypes = []string{
	"location_verified",
	"documents_uploaded",
	"product_list_submitted",
	"equipment_checked",
	"safety_compliant",
	"hygiene_compliant",
}

// LocationEvidence carries GPS evidence captured by the mobile device.
type LocationEvidence struct {
	Latitude        float64   `json:"latitude"`
	Longitude       float64   `json:"longitude"`
	AccuracyMeters  float64   `json:"accuracyMeters"`
	CapturedAt      time.Time `json:"capturedAt"`
	Provider        string    `json:"provider"`
	DeviceReference string    `json:"deviceReference"`
	IsMocked        bool      `json:"isMocked"`
}

type Visit struct {
	ID           string
	StoreID      string
	FieldAgentID string
	VisitType    VisitType
	Status       VisitStatus
	Notes        string
	StartedAt    time.Time
	CompletedAt  *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time

	// GPS evidence
	StartLatitude                     *float64
	StartLongitude                    *float64
	StartAccuracyMeters               *float64
	StartCapturedAt                   *time.Time
	StartProvider                     *string
	StartDeviceReference              *string
	StartIsMocked                     bool
	CompletionLatitude                *float64
	CompletionLongitude               *float64
	CompletionAccuracyMeters          *float64
	CompletionCapturedAt              *time.Time
	CompletionProvider                *string
	CompletionIsMocked                *bool
	StoreLatitude                     *float64
	StoreLongitude                    *float64
	GeofenceRadiusMeters              float64
	StartDistanceFromStoreMeters      *float64
	CompletionDistanceFromStoreMeters *float64
	StartGeofenceStatus               *string
	CompletionGeofenceStatus          *string
}

type ReadinessCheck struct {
	ID          string
	VisitID     string
	StoreID     string
	CheckType   string
	Status      CheckStatus
	EvidenceURL string
	Notes       string
	VerifiedBy  string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Escalation struct {
	ID             string
	VisitID        string
	StoreID        string
	RaisedBy       string
	Severity       EscalationSeverity
	Category       EscalationCategory
	Description    string
	Status         EscalationStatus
	ResolvedBy     string
	ResolvedAt     *time.Time
	ResolutionNote string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type CreateVisitInput struct {
	StoreID        string
	FieldAgentID   string
	VisitType      VisitType
	StartLocation  *LocationEvidence // required; validated on creation
	StoreLatitude  *float64
	StoreLongitude *float64
}

// validateStartLocation checks GPS evidence before a visit can be started.
func validateStartLocation(loc *LocationEvidence) error {
	if loc == nil {
		return ErrLocationRequired
	}
	if loc.IsMocked {
		return ErrLocationMocked
	}
	if loc.AccuracyMeters > MinStartAccuracyMeters {
		return ErrLocationAccuracy
	}
	if time.Since(loc.CapturedAt) > MaxLocationAgeSeconds*time.Second {
		return ErrLocationStale
	}
	if loc.Latitude == 0 && loc.Longitude == 0 {
		return ErrLocationRequired
	}
	return nil
}

// haversineMeters returns the distance in meters between two lat/lon points.
func haversineMeters(lat1, lon1, lat2, lon2 float64) float64 {
	const earthR = 6371000.0
	φ1 := lat1 * math.Pi / 180
	φ2 := lat2 * math.Pi / 180
	Δφ := (lat2 - lat1) * math.Pi / 180
	Δλ := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(Δφ/2)*math.Sin(Δφ/2) + math.Cos(φ1)*math.Cos(φ2)*math.Sin(Δλ/2)*math.Sin(Δλ/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthR * c
}

func geofenceStatus(distM, radiusM float64) string {
	if distM <= radiusM {
		return "inside"
	}
	return "outside"
}

type UpdateCheckInput struct {
	CheckType   string
	Status      CheckStatus
	EvidenceURL string
	Notes       string
}

type CreateEscalationInput struct {
	VisitID     string
	StoreID     string
	RaisedBy    string
	Severity    EscalationSeverity
	Category    EscalationCategory
	Description string
}

type UpdateEscalationInput struct {
	Status         EscalationStatus
	ResolvedBy     string
	ResolutionNote string
}

func CreateVisit(ctx context.Context, db *sql.DB, actor store.StoreActor, input CreateVisitInput) (Visit, error) {
	if input.StoreID == "" || input.FieldAgentID == "" {
		return Visit{}, ErrInvalid
	}
	if err := validateStartLocation(input.StartLocation); err != nil {
		return Visit{}, err
	}
	if err := AuthorizeStore(ctx, db, actor, input.StoreID); err != nil {
		return Visit{}, err
	}
	vt := input.VisitType
	if vt == "" {
		vt = VisitTypeOnboarding
	}

	loc := input.StartLocation
	radius := DefaultGeofenceRadiusMeters

	// Compute geofence status if store coordinates are known.
	var distM *float64
	var geoStatus *string
	if input.StoreLatitude != nil && input.StoreLongitude != nil {
		d := haversineMeters(loc.Latitude, loc.Longitude, *input.StoreLatitude, *input.StoreLongitude)
		distM = &d
		s := geofenceStatus(d, radius)
		geoStatus = &s
	}

	row := db.QueryRowContext(ctx, `
		INSERT INTO dsh_field_visits
			(store_id, field_agent_id, visit_type,
			 start_latitude, start_longitude, start_accuracy_meters, start_captured_at,
			 start_provider, start_device_reference, start_is_mocked,
			 store_latitude, store_longitude, geofence_radius_meters,
			 start_distance_from_store_meters, start_geofence_status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		RETURNING `+visitSelectCols,
		input.StoreID, input.FieldAgentID, vt,
		loc.Latitude, loc.Longitude, loc.AccuracyMeters, loc.CapturedAt,
		loc.Provider, loc.DeviceReference, loc.IsMocked,
		input.StoreLatitude, input.StoreLongitude, radius,
		distM, geoStatus,
	)
	v, err := scanVisit(row)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return Visit{}, ErrConflict
		}
		return Visit{}, err
	}
	return v, nil
}

// visitSelectCols is the canonical SELECT column list for dsh_field_visits.
// All queries must use this constant so scan order stays in sync.
const visitSelectCols = `id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at,
	start_latitude, start_longitude, start_accuracy_meters, start_captured_at, start_provider, start_device_reference, start_is_mocked,
	completion_latitude, completion_longitude, completion_accuracy_meters, completion_captured_at, completion_provider, completion_is_mocked,
	store_latitude, store_longitude, geofence_radius_meters,
	start_distance_from_store_meters, completion_distance_from_store_meters,
	start_geofence_status, completion_geofence_status`

func GetVisit(ctx context.Context, db *sql.DB, visitID string) (Visit, error) {
	row := db.QueryRowContext(ctx, `SELECT `+visitSelectCols+` FROM dsh_field_visits WHERE id = $1`, visitID)
	v, err := scanVisit(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Visit{}, ErrNotFound
	}
	return v, err
}

func ListStoreVisits(ctx context.Context, db *sql.DB, actor store.StoreActor, storeID string, limit int) ([]Visit, error) {
	if err := AuthorizeStore(ctx, db, actor, storeID); err != nil {
		return nil, err
	}
	query := `SELECT ` + visitSelectCols + ` FROM dsh_field_visits WHERE store_id = $1`
	args := []any{storeID}
	if actor.Role == "field" {
		query += " AND field_agent_id = $2"
		args = append(args, actor.ID)
	}
	query += " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(len(args)+1)
	args = append(args, limit)
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Visit
	for rows.Next() {
		v, err := scanVisitRow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, v)
	}
	return list, rows.Err()
}

func ListAgentVisits(ctx context.Context, db *sql.DB, agentID string, limit int) ([]Visit, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+visitSelectCols+` FROM dsh_field_visits WHERE field_agent_id = $1 AND status != 'complete' ORDER BY created_at DESC LIMIT $2`, agentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Visit
	for rows.Next() {
		v, err := scanVisitRow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, v)
	}
	return list, rows.Err()
}

// CompleteVisitInput carries GPS evidence captured at the moment of completion.
type CompleteVisitInput struct {
	CompletionLocation *LocationEvidence // required
}

// CompleteVisit marks a visit complete inside a transaction after verifying
// ownership, that every required readiness check has passed, no blocking
// escalation is open, and that the completion GPS location is valid.
func CompleteVisit(ctx context.Context, db *sql.DB, actor store.StoreActor, visitID string, input CompleteVisitInput) (Visit, error) {
	if err := validateStartLocation(input.CompletionLocation); err != nil {
		return Visit{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Visit{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	row := tx.QueryRowContext(ctx, `SELECT `+visitSelectCols+` FROM dsh_field_visits WHERE id = $1 FOR UPDATE`, visitID)
	v, err := scanVisit(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Visit{}, ErrNotFound
	}
	if err != nil {
		return Visit{}, err
	}

	if v.FieldAgentID != actor.ID && actor.Role != "operator" {
		return Visit{}, ErrForbidden
	}
	allowed, err := store.ActorCanAccessStore(ctx, db, actor, v.StoreID)
	if err != nil {
		return Visit{}, err
	}
	if !allowed {
		return Visit{}, ErrForbidden
	}

	if v.Status != VisitInProgress {
		if v.Status == VisitComplete {
			return Visit{}, ErrVisitAlreadyComplete
		}
		return Visit{}, ErrInvalid
	}

	// Validate geofence at completion.
	loc := input.CompletionLocation
	radius := v.GeofenceRadiusMeters
	if radius <= 0 {
		radius = DefaultGeofenceRadiusMeters
	}
	var completionDist *float64
	var completionGeo *string
	if v.StoreLatitude != nil && v.StoreLongitude != nil {
		d := haversineMeters(loc.Latitude, loc.Longitude, *v.StoreLatitude, *v.StoreLongitude)
		completionDist = &d
		s := geofenceStatus(d, radius)
		completionGeo = &s
		if s == "outside" {
			return Visit{}, ErrGeofenceViolation
		}
	}

	checkRows, err := tx.QueryContext(ctx, `
		SELECT check_type, status, COALESCE(evidence_url,''),
		       EXISTS (SELECT 1 FROM dsh_media_refs refs WHERE refs.media_ref = dsh_readiness_checks.evidence_url)
		FROM dsh_readiness_checks
		WHERE visit_id = $1`, visitID)
	if err != nil {
		return Visit{}, err
	}
	passed := map[string]bool{}
	evidence := map[string]bool{}
	for checkRows.Next() {
		var ct, st, ev string
		var evidenceExists bool
		if err := checkRows.Scan(&ct, &st, &ev, &evidenceExists); err != nil {
			checkRows.Close()
			return Visit{}, err
		}
		if st == string(CheckPassed) {
			passed[ct] = true
			evidence[ct] = strings.TrimSpace(ev) != "" && evidenceExists
		}
	}
	if err := checkRows.Err(); err != nil {
		checkRows.Close()
		return Visit{}, err
	}
	checkRows.Close()
	for _, required := range RequiredCheckTypes {
		if !passed[required] {
			return Visit{}, ErrChecklistIncomplete
		}
		if !evidence[required] {
			return Visit{}, ErrEvidenceRequired
		}
	}

	var openCount int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM dsh_readiness_escalations
		WHERE visit_id = $1 AND status IN ('open','acknowledged')`, visitID).Scan(&openCount); err != nil {
		return Visit{}, err
	}
	if openCount > 0 {
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
		visitID,
		loc.Latitude, loc.Longitude, loc.AccuracyMeters, loc.CapturedAt,
		loc.Provider, loc.IsMocked,
		completionDist, completionGeo,
	)
	updated, err := scanVisit(row)
	if err != nil {
		return Visit{}, err
	}

	// Enqueue commission eligibility event in the same transaction.
	// This guarantees the event is durable even if WLT is unreachable.
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

func UpsertReadinessCheck(ctx context.Context, db *sql.DB, actor store.StoreActor, visitID string, input UpdateCheckInput) (ReadinessCheck, error) {
	v, err := GetOwnedVisit(ctx, db, actor, visitID)
	if err != nil {
		return ReadinessCheck{}, err
	}
	if v.Status == VisitComplete {
		return ReadinessCheck{}, ErrVisitAlreadyComplete
	}
	if input.Status == CheckPassed {
		if err := validateCheckEvidence(ctx, db, actor, input.EvidenceURL); err != nil {
			return ReadinessCheck{}, err
		}
	}
	row := db.QueryRowContext(ctx, `
		INSERT INTO dsh_readiness_checks (visit_id, store_id, check_type, status, evidence_url, notes, verified_by)
		SELECT $1, store_id, $2, $3, $4, $5, field_agent_id
		FROM dsh_field_visits WHERE id = $1
		ON CONFLICT (visit_id, check_type) DO UPDATE
		  SET status = EXCLUDED.status, evidence_url = EXCLUDED.evidence_url,
		      notes = EXCLUDED.notes, updated_at = NOW()
		RETURNING id, visit_id, store_id, check_type, status, COALESCE(evidence_url,''), COALESCE(notes,''), verified_by, created_at, updated_at`,
		visitID, input.CheckType, input.Status, input.EvidenceURL, input.Notes,
	)
	var c ReadinessCheck
	err = row.Scan(&c.ID, &c.VisitID, &c.StoreID, &c.CheckType, &c.Status, &c.EvidenceURL, &c.Notes, &c.VerifiedBy, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ReadinessCheck{}, ErrNotFound
	}
	return c, err
}

func ListVisitChecks(ctx context.Context, db *sql.DB, actor store.StoreActor, visitID string) ([]ReadinessCheck, error) {
	if _, err := GetOwnedVisit(ctx, db, actor, visitID); err != nil {
		return nil, err
	}
	rows, err := db.QueryContext(ctx, `
		SELECT id, visit_id, store_id, check_type, status, COALESCE(evidence_url,''), COALESCE(notes,''), verified_by, created_at, updated_at
		FROM dsh_readiness_checks WHERE visit_id = $1 ORDER BY created_at ASC`, visitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []ReadinessCheck
	for rows.Next() {
		var c ReadinessCheck
		if err := rows.Scan(&c.ID, &c.VisitID, &c.StoreID, &c.CheckType, &c.Status, &c.EvidenceURL, &c.Notes, &c.VerifiedBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func CreateEscalation(ctx context.Context, db *sql.DB, actor store.StoreActor, input CreateEscalationInput) (Escalation, error) {
	if input.StoreID == "" || input.RaisedBy == "" || input.Description == "" {
		return Escalation{}, ErrInvalid
	}
	if err := AuthorizeStore(ctx, db, actor, input.StoreID); err != nil {
		return Escalation{}, err
	}
	var visitIDSQL sql.NullString
	if input.VisitID != "" {
		visit, err := GetVisit(ctx, db, input.VisitID)
		if err != nil {
			return Escalation{}, err
		}
		if visit.StoreID != input.StoreID {
			return Escalation{}, ErrInvalid
		}
		if visit.FieldAgentID != input.RaisedBy && actor.Role != "operator" {
			return Escalation{}, ErrForbidden
		}
		visitIDSQL = sql.NullString{String: input.VisitID, Valid: true}
	}
	row := db.QueryRowContext(ctx, `
		INSERT INTO dsh_readiness_escalations (visit_id, store_id, raised_by, severity, category, description)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, COALESCE(visit_id::text,''), store_id, raised_by, severity, category, description,
		          status, COALESCE(resolved_by,''), resolved_at, COALESCE(resolution_note,''), created_at, updated_at`,
		visitIDSQL, input.StoreID, input.RaisedBy, input.Severity, input.Category, input.Description,
	)
	return scanEscalation(row)
}

func ListOperatorEscalations(ctx context.Context, db *sql.DB, statusFilter string, limit int) ([]Escalation, error) {
	q := `SELECT id, COALESCE(visit_id::text,''), store_id, raised_by, severity, category, description,
	             status, COALESCE(resolved_by,''), resolved_at, COALESCE(resolution_note,''), created_at, updated_at
	      FROM dsh_readiness_escalations`
	args := []any{}
	if statusFilter != "" {
		q += " WHERE status = $1 ORDER BY created_at DESC LIMIT $2"
		args = append(args, statusFilter, limit)
	} else {
		q += " ORDER BY created_at DESC LIMIT $1"
		args = append(args, limit)
	}
	rows, err := db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Escalation
	for rows.Next() {
		e, err := scanEscalationRow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func ListAgentEscalations(ctx context.Context, db *sql.DB, agentID string, limit int) ([]Escalation, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, COALESCE(visit_id::text,''), store_id, raised_by, severity, category, description,
		          status, COALESCE(resolved_by,''), resolved_at, COALESCE(resolution_note,''), created_at, updated_at
		FROM dsh_readiness_escalations
		WHERE raised_by = $1 AND status IN ('open', 'acknowledged')
		ORDER BY created_at DESC LIMIT $2`, agentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Escalation
	for rows.Next() {
		e, err := scanEscalationRow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func UpdateEscalation(ctx context.Context, db *sql.DB, escalationID string, input UpdateEscalationInput) (Escalation, error) {
	row := db.QueryRowContext(ctx, `
		UPDATE dsh_readiness_escalations
		SET status = $2, resolved_by = $3, resolution_note = $4,
		    resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE resolved_at END,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, COALESCE(visit_id::text,''), store_id, raised_by, severity, category, description,
		          status, COALESCE(resolved_by,''), resolved_at, COALESCE(resolution_note,''), created_at, updated_at`,
		escalationID, input.Status, input.ResolvedBy, input.ResolutionNote,
	)
	e, err := scanEscalation(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Escalation{}, ErrNotFound
	}
	return e, err
}

func GetStoreOnboardingStatus(ctx context.Context, db *sql.DB, storeID string) (map[string]any, error) {
	var totalVisits, completedVisits, openEscalations int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_field_visits WHERE store_id = $1`, storeID).Scan(&totalVisits); err != nil {
		return nil, err
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_field_visits WHERE store_id = $1 AND status = 'complete'`, storeID).Scan(&completedVisits); err != nil {
		return nil, err
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_readiness_escalations WHERE store_id = $1 AND status IN ('open','acknowledged')`, storeID).Scan(&openEscalations); err != nil {
		return nil, err
	}
	onboardingComplete := completedVisits > 0 && openEscalations == 0
	return map[string]any{
		"storeId":            storeID,
		"totalVisits":        totalVisits,
		"completedVisits":    completedVisits,
		"openEscalations":    openEscalations,
		"onboardingComplete": onboardingComplete,
		"status":             resolveOnboardingStatus(completedVisits, openEscalations),
	}, nil
}

func validateCheckEvidence(ctx context.Context, db *sql.DB, actor store.StoreActor, mediaRef string) error {
	ref := strings.TrimSpace(mediaRef)
	if ref == "" {
		return ErrEvidenceRequired
	}
	if actor.Role == "operator" {
		var exists bool
		if err := db.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM dsh_media_refs WHERE media_ref = $1)`, ref).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return ErrEvidenceRequired
		}
		return nil
	}
	var exists bool
	if err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM dsh_media_refs
			WHERE media_ref = $1
			  AND owner_actor_id = $2
			  AND owner_actor_role = $3
		)`, ref, actor.ID, actor.Role).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrEvidenceRequired
	}
	return nil
}

func resolveOnboardingStatus(completed, openEscalations int) string {
	if completed == 0 {
		return "pending"
	}
	if openEscalations > 0 {
		return "escalation_required"
	}
	return "complete"
}

type visitScanner interface {
	Scan(dest ...any) error
}

func scanVisit(s visitScanner) (Visit, error) {
	var v Visit
	var gfRadius sql.NullFloat64
	err := s.Scan(
		&v.ID, &v.StoreID, &v.FieldAgentID, &v.VisitType, &v.Status, &v.Notes, &v.StartedAt, &v.CompletedAt, &v.CreatedAt, &v.UpdatedAt,
		&v.StartLatitude, &v.StartLongitude, &v.StartAccuracyMeters, &v.StartCapturedAt, &v.StartProvider, &v.StartDeviceReference, &v.StartIsMocked,
		&v.CompletionLatitude, &v.CompletionLongitude, &v.CompletionAccuracyMeters, &v.CompletionCapturedAt, &v.CompletionProvider, &v.CompletionIsMocked,
		&v.StoreLatitude, &v.StoreLongitude, &gfRadius,
		&v.StartDistanceFromStoreMeters, &v.CompletionDistanceFromStoreMeters,
		&v.StartGeofenceStatus, &v.CompletionGeofenceStatus,
	)
	if gfRadius.Valid {
		v.GeofenceRadiusMeters = gfRadius.Float64
	} else {
		v.GeofenceRadiusMeters = DefaultGeofenceRadiusMeters
	}
	return v, err
}

func scanVisitRow(rows *sql.Rows) (Visit, error) {
	var v Visit
	var gfRadius sql.NullFloat64
	err := rows.Scan(
		&v.ID, &v.StoreID, &v.FieldAgentID, &v.VisitType, &v.Status, &v.Notes, &v.StartedAt, &v.CompletedAt, &v.CreatedAt, &v.UpdatedAt,
		&v.StartLatitude, &v.StartLongitude, &v.StartAccuracyMeters, &v.StartCapturedAt, &v.StartProvider, &v.StartDeviceReference, &v.StartIsMocked,
		&v.CompletionLatitude, &v.CompletionLongitude, &v.CompletionAccuracyMeters, &v.CompletionCapturedAt, &v.CompletionProvider, &v.CompletionIsMocked,
		&v.StoreLatitude, &v.StoreLongitude, &gfRadius,
		&v.StartDistanceFromStoreMeters, &v.CompletionDistanceFromStoreMeters,
		&v.StartGeofenceStatus, &v.CompletionGeofenceStatus,
	)
	if gfRadius.Valid {
		v.GeofenceRadiusMeters = gfRadius.Float64
	} else {
		v.GeofenceRadiusMeters = DefaultGeofenceRadiusMeters
	}
	return v, err
}

func scanEscalation(s visitScanner) (Escalation, error) {
	var e Escalation
	err := s.Scan(&e.ID, &e.VisitID, &e.StoreID, &e.RaisedBy, &e.Severity, &e.Category, &e.Description,
		&e.Status, &e.ResolvedBy, &e.ResolvedAt, &e.ResolutionNote, &e.CreatedAt, &e.UpdatedAt)
	return e, err
}

func scanEscalationRow(rows *sql.Rows) (Escalation, error) {
	var e Escalation
	err := rows.Scan(&e.ID, &e.VisitID, &e.StoreID, &e.RaisedBy, &e.Severity, &e.Category, &e.Description,
		&e.Status, &e.ResolvedBy, &e.ResolvedAt, &e.ResolutionNote, &e.CreatedAt, &e.UpdatedAt)
	return e, err
}
