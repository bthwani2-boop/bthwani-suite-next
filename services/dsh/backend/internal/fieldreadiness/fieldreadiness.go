package fieldreadiness

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound = errors.New("field readiness record not found")
	ErrInvalid  = errors.New("invalid field readiness input")
	ErrForbidden = errors.New("field readiness access forbidden")
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

	VisitTypeOnboarding          VisitType = "onboarding"
	VisitTypePeriodic            VisitType = "periodic"
	VisitTypeEscalationFollowup  VisitType = "escalation_followup"
)

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
	StoreID      string
	FieldAgentID string
	VisitType    VisitType
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

func CreateVisit(db *sql.DB, input CreateVisitInput) (Visit, error) {
	if input.StoreID == "" || input.FieldAgentID == "" {
		return Visit{}, ErrInvalid
	}
	vt := input.VisitType
	if vt == "" {
		vt = VisitTypeOnboarding
	}
	row := db.QueryRow(`
		INSERT INTO dsh_field_visits (store_id, field_agent_id, visit_type)
		VALUES ($1, $2, $3)
		RETURNING id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at`,
		input.StoreID, input.FieldAgentID, vt,
	)
	return scanVisit(row)
}

func GetVisit(db *sql.DB, visitID string) (Visit, error) {
	row := db.QueryRow(`
		SELECT id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at
		FROM dsh_field_visits WHERE id = $1`, visitID)
	v, err := scanVisit(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Visit{}, ErrNotFound
	}
	return v, err
}

func ListStoreVisits(db *sql.DB, storeID string, limit int) ([]Visit, error) {
	rows, err := db.Query(`
		SELECT id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at
		FROM dsh_field_visits WHERE store_id = $1
		ORDER BY created_at DESC LIMIT $2`, storeID, limit)
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

func ListAgentVisits(db *sql.DB, agentID string, limit int) ([]Visit, error) {
	rows, err := db.Query(`
		SELECT id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at
		FROM dsh_field_visits WHERE field_agent_id = $1 AND status != 'complete'
		ORDER BY created_at DESC LIMIT $2`, agentID, limit)
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

func CompleteVisit(db *sql.DB, visitID, agentID string) (Visit, error) {
	row := db.QueryRow(`
		UPDATE dsh_field_visits
		SET status = 'complete', completed_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND field_agent_id = $2 AND status = 'in_progress'
		RETURNING id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at`,
		visitID, agentID,
	)
	v, err := scanVisit(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Visit{}, ErrNotFound
	}
	return v, err
}

func UpsertReadinessCheck(db *sql.DB, visitID string, input UpdateCheckInput) (ReadinessCheck, error) {
	row := db.QueryRow(`
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
	err := row.Scan(&c.ID, &c.VisitID, &c.StoreID, &c.CheckType, &c.Status, &c.EvidenceURL, &c.Notes, &c.VerifiedBy, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ReadinessCheck{}, ErrNotFound
	}
	return c, err
}

func ListVisitChecks(db *sql.DB, visitID string) ([]ReadinessCheck, error) {
	rows, err := db.Query(`
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

func CreateEscalation(db *sql.DB, input CreateEscalationInput) (Escalation, error) {
	if input.StoreID == "" || input.RaisedBy == "" || input.Description == "" {
		return Escalation{}, ErrInvalid
	}
	var visitIDSQL sql.NullString
	if input.VisitID != "" {
		visitIDSQL = sql.NullString{String: input.VisitID, Valid: true}
	}
	row := db.QueryRow(`
		INSERT INTO dsh_readiness_escalations (visit_id, store_id, raised_by, severity, category, description)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, COALESCE(visit_id::text,''), store_id, raised_by, severity, category, description,
		          status, COALESCE(resolved_by,''), resolved_at, COALESCE(resolution_note,''), created_at, updated_at`,
		visitIDSQL, input.StoreID, input.RaisedBy, input.Severity, input.Category, input.Description,
	)
	return scanEscalation(row)
}

func ListOperatorEscalations(db *sql.DB, statusFilter string, limit int) ([]Escalation, error) {
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
	rows, err := db.Query(q, args...)
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

func ListAgentEscalations(db *sql.DB, agentID string, limit int) ([]Escalation, error) {
	rows, err := db.Query(`
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

func UpdateEscalation(db *sql.DB, escalationID string, input UpdateEscalationInput) (Escalation, error) {
	row := db.QueryRow(`
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

func GetStoreOnboardingStatus(db *sql.DB, storeID string) (map[string]any, error) {
	var totalVisits, completedVisits, openEscalations int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_field_visits WHERE store_id = $1`, storeID).Scan(&totalVisits); err != nil {
		return nil, err
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_field_visits WHERE store_id = $1 AND status = 'complete'`, storeID).Scan(&completedVisits); err != nil {
		return nil, err
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_readiness_escalations WHERE store_id = $1 AND status = 'open'`, storeID).Scan(&openEscalations); err != nil {
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
	err := s.Scan(&v.ID, &v.StoreID, &v.FieldAgentID, &v.VisitType, &v.Status, &v.Notes, &v.StartedAt, &v.CompletedAt, &v.CreatedAt, &v.UpdatedAt)
	return v, err
}

func scanVisitRow(rows *sql.Rows) (Visit, error) {
	var v Visit
	err := rows.Scan(&v.ID, &v.StoreID, &v.FieldAgentID, &v.VisitType, &v.Status, &v.Notes, &v.StartedAt, &v.CompletedAt, &v.CreatedAt, &v.UpdatedAt)
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
