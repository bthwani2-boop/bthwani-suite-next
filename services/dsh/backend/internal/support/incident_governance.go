package support

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

type IncidentEvent struct {
	ID            string         `json:"id"`
	IncidentID    string         `json:"incidentId"`
	ActorID       string         `json:"actorId"`
	EventType     string         `json:"eventType"`
	FromStatus    IncidentStatus `json:"fromStatus,omitempty"`
	ToStatus      IncidentStatus `json:"toStatus"`
	CorrelationID string         `json:"correlationId"`
	CreatedAt     time.Time      `json:"createdAt"`
}

type GovernedIncidentCreateInput struct {
	ActorID        string
	Title          string
	Description    string
	Severity       IncidentSeverity
	AffectedScope  IncidentScope
	IdempotencyKey string
	CorrelationID  string
}

type GovernedIncidentTransitionInput struct {
	ActorID        string
	IncidentID     string
	ExpectedStatus IncidentStatus
	Status         IncidentStatus
	PostmortemURL  string
	IdempotencyKey string
	CorrelationID  string
}

func validIncidentStatus(status IncidentStatus) bool {
	switch status {
	case IncidentOpen, IncidentMonitoring, IncidentResolved:
		return true
	default:
		return false
	}
}

func validIncidentSeverity(severity IncidentSeverity) bool {
	switch severity {
	case SeverityLow, SeverityMedium, SeverityHigh, SeverityCritical:
		return true
	default:
		return false
	}
}

func validIncidentScope(scope IncidentScope) bool {
	switch scope {
	case ScopeDelivery, ScopeStores, ScopePayments, ScopePlatform, ScopeUnknown:
		return true
	default:
		return false
	}
}

func validIncidentTransition(from, to IncidentStatus) bool {
	if from == to {
		return true
	}
	switch from {
	case IncidentOpen:
		return to == IncidentMonitoring || to == IncidentResolved
	case IncidentMonitoring:
		return to == IncidentOpen || to == IncidentResolved
	case IncidentResolved:
		return to == IncidentMonitoring
	default:
		return false
	}
}

func incidentEventType(from, to IncidentStatus) string {
	if from == to {
		return "status_changed"
	}
	if to == IncidentResolved {
		return "resolved"
	}
	if from == IncidentResolved {
		return "reopened"
	}
	if to == IncidentMonitoring {
		return "monitoring_started"
	}
	return "status_changed"
}

func writeIncidentEventTx(
	tx *sql.Tx,
	incidentID string,
	actorID string,
	eventType string,
	fromStatus IncidentStatus,
	toStatus IncidentStatus,
	correlationID string,
) error {
	var from any
	if fromStatus != "" {
		from = string(fromStatus)
	}
	_, err := tx.Exec(`
		INSERT INTO dsh_incident_events (
			incident_id, actor_id, event_type, from_status, to_status, correlation_id
		) VALUES ($1::uuid, $2, $3, $4, $5, $6)
		ON CONFLICT (incident_id, event_type, correlation_id) DO NOTHING`,
		incidentID, actorID, eventType, from, string(toStatus), correlationID,
	)
	return err
}

func CreateGovernedIncident(db *sql.DB, input GovernedIncidentCreateInput) (Incident, error) {
	if db == nil {
		return Incident{}, ErrInvalid
	}
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	if input.Severity == "" {
		input.Severity = SeverityMedium
	}
	if input.AffectedScope == "" {
		input.AffectedScope = ScopeUnknown
	}
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || len(input.Title) < 3 || len(input.Title) > 160 ||
		len(input.Description) < 5 || len(input.Description) > 4000 ||
		!validIncidentSeverity(input.Severity) || !validIncidentScope(input.AffectedScope) {
		return Incident{}, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return Incident{}, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.ActorID, idempotencyKey); err != nil {
		return Incident{}, err
	}

	existing, err := scanIncident(tx.QueryRow(`
		SELECT id, title, description, severity, status, affected_scope, raised_by,
		       COALESCE(resolved_by,''), resolved_at, COALESCE(postmortem_url,''), created_at, updated_at
		FROM dsh_incidents
		WHERE raised_by = $1 AND create_idempotency_key = $2`, input.ActorID, idempotencyKey))
	if err == nil {
		if commitErr := tx.Commit(); commitErr != nil {
			return Incident{}, commitErr
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Incident{}, err
	}

	created, err := scanIncident(tx.QueryRow(`
		INSERT INTO dsh_incidents (
			title, description, severity, affected_scope, raised_by,
			create_idempotency_key, correlation_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, title, description, severity, status, affected_scope, raised_by,
		          COALESCE(resolved_by,''), resolved_at, COALESCE(postmortem_url,''), created_at, updated_at`,
		input.Title, input.Description, input.Severity, input.AffectedScope,
		input.ActorID, idempotencyKey, correlationID,
	))
	if err != nil {
		return Incident{}, err
	}
	if err := writeIncidentEventTx(tx, created.ID, input.ActorID, "created", "", IncidentOpen, correlationID); err != nil {
		return Incident{}, err
	}
	if err := tx.Commit(); err != nil {
		return Incident{}, err
	}
	return created, nil
}

func GetGovernedIncident(db *sql.DB, incidentID string) (Incident, error) {
	if db == nil || strings.TrimSpace(incidentID) == "" {
		return Incident{}, ErrInvalid
	}
	incident, err := scanIncident(db.QueryRow(`
		SELECT id, title, description, severity, status, affected_scope, raised_by,
		       COALESCE(resolved_by,''), resolved_at, COALESCE(postmortem_url,''), created_at, updated_at
		FROM dsh_incidents WHERE id = $1::uuid`, strings.TrimSpace(incidentID)))
	if errors.Is(err, sql.ErrNoRows) {
		return Incident{}, ErrNotFound
	}
	return incident, err
}

func ListGovernedIncidents(db *sql.DB, statusFilter string, limit int) ([]Incident, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	statusFilter = strings.TrimSpace(statusFilter)
	if statusFilter != "" && !validIncidentStatus(IncidentStatus(statusFilter)) {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return ListIncidents(db, statusFilter, limit)
}

func UpdateGovernedIncident(db *sql.DB, input GovernedIncidentTransitionInput) (Incident, error) {
	if db == nil {
		return Incident{}, ErrInvalid
	}
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.IncidentID = strings.TrimSpace(input.IncidentID)
	input.PostmortemURL = strings.TrimSpace(input.PostmortemURL)
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || input.IncidentID == "" ||
		!validIncidentStatus(input.Status) || len(input.PostmortemURL) > 1000 {
		return Incident{}, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return Incident{}, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.IncidentID, idempotencyKey); err != nil {
		return Incident{}, err
	}

	var currentStatus IncidentStatus
	var currentPostmortem string
	if err = tx.QueryRow(`
		SELECT status, COALESCE(postmortem_url,'')
		FROM dsh_incidents WHERE id = $1::uuid FOR UPDATE`, input.IncidentID,
	).Scan(&currentStatus, &currentPostmortem); errors.Is(err, sql.ErrNoRows) {
		return Incident{}, ErrNotFound
	} else if err != nil {
		return Incident{}, err
	}
	if input.ExpectedStatus != "" && input.ExpectedStatus != currentStatus {
		return Incident{}, ErrConflict
	}
	if !validIncidentTransition(currentStatus, input.Status) {
		return Incident{}, ErrConflict
	}
	postmortem := input.PostmortemURL
	if postmortem == "" {
		postmortem = currentPostmortem
	}

	if currentStatus != input.Status || currentPostmortem != postmortem {
		_, err = tx.Exec(`
			UPDATE dsh_incidents
			SET status = $2,
			    resolved_by = CASE WHEN $2 = 'resolved' THEN $3 ELSE NULL END,
			    resolved_at = CASE WHEN $2 = 'resolved' THEN COALESCE(resolved_at, NOW()) ELSE NULL END,
			    postmortem_url = NULLIF($4, ''),
			    version = version + 1,
			    updated_at = NOW()
			WHERE id = $1::uuid`, input.IncidentID, input.Status, input.ActorID, postmortem)
		if err != nil {
			return Incident{}, err
		}
		if err := writeIncidentEventTx(
			tx,
			input.IncidentID,
			input.ActorID,
			incidentEventType(currentStatus, input.Status),
			currentStatus,
			input.Status,
			correlationID,
		); err != nil {
			return Incident{}, err
		}
	}

	updated, err := scanIncident(tx.QueryRow(`
		SELECT id, title, description, severity, status, affected_scope, raised_by,
		       COALESCE(resolved_by,''), resolved_at, COALESCE(postmortem_url,''), created_at, updated_at
		FROM dsh_incidents WHERE id = $1::uuid`, input.IncidentID))
	if err != nil {
		return Incident{}, err
	}
	if err := tx.Commit(); err != nil {
		return Incident{}, err
	}
	return updated, nil
}

func ListIncidentEvents(db *sql.DB, incidentID string, limit int) ([]IncidentEvent, error) {
	if db == nil || strings.TrimSpace(incidentID) == "" {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := db.Query(`
		SELECT id::text, incident_id::text, actor_id, event_type,
		       COALESCE(from_status,''), to_status, correlation_id, created_at
		FROM dsh_incident_events
		WHERE incident_id = $1::uuid
		ORDER BY created_at, id
		LIMIT $2`, strings.TrimSpace(incidentID), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]IncidentEvent, 0)
	for rows.Next() {
		var item IncidentEvent
		if err := rows.Scan(
			&item.ID,
			&item.IncidentID,
			&item.ActorID,
			&item.EventType,
			&item.FromStatus,
			&item.ToStatus,
			&item.CorrelationID,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
