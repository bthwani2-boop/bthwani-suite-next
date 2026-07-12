package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"

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

func CreateVisit(ctx context.Context, db *sql.DB, actor store.StoreActor, input CreateVisitInput) (Visit, error) {
	if input.StoreID == "" || input.FieldAgentID == "" {
		return Visit{}, ErrInvalid
	}
	if err := AuthorizeStore(ctx, db, actor, input.StoreID); err != nil {
		return Visit{}, err
	}
	vt := input.VisitType
	if vt == "" {
		vt = VisitTypeOnboarding
	}
	row := db.QueryRowContext(ctx, `
		INSERT INTO dsh_field_visits (store_id, field_agent_id, visit_type)
		VALUES ($1, $2, $3)
		RETURNING id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at`,
		input.StoreID, input.FieldAgentID, vt,
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

func GetVisit(ctx context.Context, db *sql.DB, visitID string) (Visit, error) {
	row := db.QueryRowContext(ctx, `
		SELECT id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at
		FROM dsh_field_visits WHERE id = $1`, visitID)
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
	query := `
		SELECT id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at
		FROM dsh_field_visits WHERE store_id = $1
	`
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
	rows, err := db.QueryContext(ctx, `
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

// CompleteVisit marks a visit complete inside a transaction after verifying
// ownership, that every required readiness check has passed, and that no
// blocking escalation is still open against the visit.
func CompleteVisit(ctx context.Context, db *sql.DB, actor store.StoreActor, visitID string) (Visit, error) {
	// Pre-check store scope before opening the transaction; the actor's
	// concrete store isn't known until the visit row is read below, but this
	// call revalidates once the row is locked.
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Visit{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	row := tx.QueryRowContext(ctx, `
		SELECT id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at
		FROM dsh_field_visits WHERE id = $1 FOR UPDATE`, visitID)
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
		SET status = 'complete', completed_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING id, store_id, field_agent_id, visit_type, status, COALESCE(notes,''), started_at, completed_at, created_at, updated_at`,
		visitID,
	)
	updated, err := scanVisit(row)
	if err != nil {
		return Visit{}, err
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
