package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/store"
)

var (
	ErrNotFound             = errors.New("field readiness record not found")
	ErrInvalid              = errors.New("invalid field readiness input")
	ErrForbidden            = errors.New("field readiness access forbidden")
	ErrChecklistIncomplete  = errors.New("required readiness checks are not all passed")
	ErrOpenEscalation       = errors.New("visit has an open blocking escalation")
	ErrVisitAlreadyComplete = errors.New("visit is already complete")
	ErrVisitNotActive       = errors.New("visit is not active")
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
	IsStale                           bool
}

type ReadinessCheck struct {
	ID           string
	VisitID      string
	StoreID      string
	CheckType    string
	Status       CheckStatus
	EvidenceURL  string
	Notes        string
	VerifiedBy   string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	LabelAR      string
	Required     bool
	Critical     bool
	DisplayOrder int
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
	IsStale        bool
}

type CreateVisitInput struct {
	StoreID        string
	FieldAgentID   string
	VisitType      VisitType
	StartLocation  *LocationEvidence // required; validated on creation
	StoreLatitude  *float64
	StoreLongitude *float64
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
	query := `SELECT ` + visitSelectCols + `,
		NOT EXISTS (
			SELECT 1 FROM dsh_store_actor_scopes
			WHERE actor_id = $1 AND store_id = v.store_id AND active = true
		) AS is_stale
	FROM dsh_field_visits v
	WHERE v.field_agent_id = $1 AND v.status != 'complete'
	ORDER BY v.created_at DESC LIMIT $2`

	rows, err := db.QueryContext(ctx, query, agentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Visit
	for rows.Next() {
		v, err := scanAgentVisitRow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, v)
	}
	return list, rows.Err()
}

func scanAgentVisitRow(rows *sql.Rows) (Visit, error) {
	var v Visit
	var gfRadius sql.NullFloat64
	err := rows.Scan(
		&v.ID, &v.StoreID, &v.FieldAgentID, &v.VisitType, &v.Status, &v.Notes, &v.StartedAt, &v.CompletedAt, &v.CreatedAt, &v.UpdatedAt,
		&v.StartLatitude, &v.StartLongitude, &v.StartAccuracyMeters, &v.StartCapturedAt, &v.StartProvider, &v.StartDeviceReference, &v.StartIsMocked,
		&v.CompletionLatitude, &v.CompletionLongitude, &v.CompletionAccuracyMeters, &v.CompletionCapturedAt, &v.CompletionProvider, &v.CompletionIsMocked,
		&v.StoreLatitude, &v.StoreLongitude, &gfRadius,
		&v.StartDistanceFromStoreMeters, &v.CompletionDistanceFromStoreMeters,
		&v.StartGeofenceStatus, &v.CompletionGeofenceStatus,
		&v.IsStale,
	)
	if gfRadius.Valid {
		v.GeofenceRadiusMeters = gfRadius.Float64
	} else {
		v.GeofenceRadiusMeters = DefaultGeofenceRadiusMeters
	}
	return v, err
}

// CompleteVisitInput carries GPS evidence captured at the moment of completion.
type CompleteVisitInput struct {
	CompletionLocation *LocationEvidence // required
}

func ListVisitChecks(ctx context.Context, db *sql.DB, actor store.StoreActor, visitID string) ([]ReadinessCheck, error) {
	if _, err := GetOwnedVisit(ctx, db, actor, visitID); err != nil {
		return nil, err
	}
	rows, err := db.QueryContext(ctx, `
		SELECT requirement.id, requirement.visit_id, visit.store_id, requirement.check_type,
		       COALESCE(checks.status, 'pending'), COALESCE(checks.evidence_url,''),
		       COALESCE(checks.notes,''), COALESCE(checks.verified_by,''),
		       COALESCE(checks.created_at, requirement.created_at),
		       COALESCE(checks.updated_at, requirement.created_at),
		       requirement.label_ar, requirement.required, requirement.critical, requirement.display_order
		FROM dsh_visit_checklist_requirements requirement
		JOIN dsh_field_visits visit ON visit.id = requirement.visit_id
		LEFT JOIN dsh_readiness_checks checks
		  ON checks.visit_id = requirement.visit_id AND checks.check_type = requirement.check_type
		WHERE requirement.visit_id = $1 ORDER BY requirement.display_order`, visitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []ReadinessCheck
	for rows.Next() {
		var c ReadinessCheck
		if err := rows.Scan(&c.ID, &c.VisitID, &c.StoreID, &c.CheckType, &c.Status, &c.EvidenceURL, &c.Notes, &c.VerifiedBy, &c.CreatedAt, &c.UpdatedAt, &c.LabelAR, &c.Required, &c.Critical, &c.DisplayOrder); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func ListOperatorEscalations(ctx context.Context, db *sql.DB, operatorContextID, statusFilter string, limit int) ([]Escalation, error) {
	if strings.TrimSpace(operatorContextID) == "" {
		return nil, ErrForbidden
	}
	q := `SELECT e.id, COALESCE(e.visit_id::text,''), e.store_id, e.raised_by, e.severity, e.category, e.description,
	             e.status, COALESCE(e.resolved_by,''), e.resolved_at, COALESCE(e.resolution_note,''), e.created_at, e.updated_at
	      FROM dsh_readiness_escalations e
	      JOIN dsh_stores s ON s.id = e.store_id
	      WHERE s.operator_context_id = $1`
	args := []any{operatorContextID}
	if statusFilter != "" {
		q += " AND e.status = $2 ORDER BY e.created_at DESC LIMIT $3"
		args = append(args, statusFilter, limit)
	} else {
		q += " ORDER BY e.created_at DESC LIMIT $2"
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
		SELECT e.id, COALESCE(e.visit_id::text,''), e.store_id, e.raised_by, e.severity, e.category, e.description,
		          e.status, COALESCE(e.resolved_by,''), e.resolved_at, COALESCE(e.resolution_note,''), e.created_at, e.updated_at,
		          NOT EXISTS (
		              SELECT 1 FROM dsh_store_actor_scopes
		              WHERE actor_id = $1 AND store_id = e.store_id AND active = true
		          ) AS is_stale
		FROM dsh_readiness_escalations e
		WHERE e.raised_by = $1 AND e.status IN ('open', 'acknowledged')
		ORDER BY e.created_at DESC LIMIT $2`, agentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Escalation
	for rows.Next() {
		e, err := scanAgentEscalationRow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func scanAgentEscalationRow(rows *sql.Rows) (Escalation, error) {
	var e Escalation
	err := rows.Scan(&e.ID, &e.VisitID, &e.StoreID, &e.RaisedBy, &e.Severity, &e.Category, &e.Description,
		&e.Status, &e.ResolvedBy, &e.ResolvedAt, &e.ResolutionNote, &e.CreatedAt, &e.UpdatedAt, &e.IsStale)
	return e, err
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
