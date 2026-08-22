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
	ActorID         string
	IncidentID      string
	ExpectedStatus  IncidentStatus
	ExpectedVersion int64
	Status          IncidentStatus
	PostmortemURL   string
	IdempotencyKey  string
	CorrelationID   string
}

func validIncidentStatus(status IncidentStatus) bool {
	switch status {
	case IncidentOpen, IncidentTriaged, IncidentContaining, IncidentMitigating, IncidentMonitoring, IncidentResolved, IncidentClosed:
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
		return to == IncidentTriaged || to == IncidentResolved || to == IncidentClosed
	case IncidentTriaged:
		return to == IncidentContaining || to == IncidentMitigating || to == IncidentMonitoring || to == IncidentResolved
	case IncidentContaining:
		return to == IncidentMitigating || to == IncidentMonitoring || to == IncidentResolved
	case IncidentMitigating:
		return to == IncidentMonitoring || to == IncidentResolved
	case IncidentMonitoring:
		return to == IncidentResolved || to == IncidentOpen || to == IncidentTriaged
	case IncidentResolved:
		return to == IncidentClosed || to == IncidentMonitoring || to == IncidentOpen
	case IncidentClosed:
		return to == IncidentOpen // reopened
	default:
		return false
	}
}

func incidentEventType(from, to IncidentStatus) string {
	if from == to {
		return "status_changed"
	}
	if from == IncidentClosed && to != IncidentClosed {
		return "reopened"
	}
	switch to {
	case IncidentTriaged:
		return "triaged"
	case IncidentContaining:
		return "containing_started"
	case IncidentMitigating:
		return "mitigating_started"
	case IncidentMonitoring:
		return "monitoring_started"
	case IncidentResolved:
		return "resolved"
	case IncidentClosed:
		return "closed"
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
		SELECT `+incidentColumns+`
		FROM dsh_incidents
		WHERE raised_by = $1 AND create_idempotency_key = $2`, input.ActorID, idempotencyKey))
	if err == nil {
		if existing.Title != input.Title || existing.Description != input.Description || existing.Severity != input.Severity || existing.AffectedScope != input.AffectedScope {
			return Incident{}, ErrConflict
		}
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
		RETURNING `+incidentColumns,
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
		SELECT `+incidentColumns+`
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
	var currentVersion int64
	if err = tx.QueryRow(`
		SELECT status, COALESCE(postmortem_url,''), version
		FROM dsh_incidents WHERE id = $1::uuid FOR UPDATE`, input.IncidentID,
	).Scan(&currentStatus, &currentPostmortem, &currentVersion); errors.Is(err, sql.ErrNoRows) {
		return Incident{}, ErrNotFound
	} else if err != nil {
		return Incident{}, err
	}
	var replayActor, replayToStatus, replayFromStatus string
	replayErr := tx.QueryRow(`
		SELECT actor_id, to_status, COALESCE(from_status,'')
		FROM dsh_incident_events
		WHERE incident_id = $1::uuid AND correlation_id = $2 AND event_type <> 'created'
		ORDER BY created_at DESC LIMIT 1`, input.IncidentID, correlationID).
		Scan(&replayActor, &replayToStatus, &replayFromStatus)
	if replayErr == nil {
		if replayActor != input.ActorID || replayToStatus != string(input.Status) ||
			(input.ExpectedStatus != "" && replayFromStatus != string(input.ExpectedStatus)) ||
			(input.PostmortemURL != "" && currentPostmortem != input.PostmortemURL) {
			return Incident{}, ErrConflict
		}
		updated, err := scanIncident(tx.QueryRow(incidentSelect+` WHERE id = $1::uuid`, input.IncidentID))
		if err != nil {
			return Incident{}, err
		}
		if err := tx.Commit(); err != nil {
			return Incident{}, err
		}
		return updated, nil
	}
	if !errors.Is(replayErr, sql.ErrNoRows) {
		return Incident{}, replayErr
	}
	if input.ExpectedVersion < 1 || input.ExpectedVersion != currentVersion {
		return Incident{}, ErrConflict
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

	if input.Status == IncidentClosed {
		if postmortem == "" {
			return Incident{}, errors.New("incident cannot be closed without a postmortem URL")
		}
		var openTasks int
		err = tx.QueryRow(`
			SELECT COUNT(*) FROM dsh_incident_tasks
			WHERE incident_id = $1::uuid AND status IN ('pending', 'in_progress')
		`, input.IncidentID).Scan(&openTasks)
		if err != nil {
			return Incident{}, err
		}
		if openTasks > 0 {
			return Incident{}, errors.New("incident cannot be closed with unresolved tasks")
		}
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
			WHERE id = $1::uuid AND version = $5`, input.IncidentID, input.Status, input.ActorID, postmortem, input.ExpectedVersion)
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

	updated, err := scanIncident(tx.QueryRow(incidentSelect+` WHERE id = $1::uuid`, input.IncidentID))
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

func AddIncidentTask(db *sql.DB, incidentID string, input CreateIncidentTaskInput) (IncidentTask, error) {
	if db == nil || strings.TrimSpace(incidentID) == "" {
		return IncidentTask{}, ErrInvalid
	}
	input.AssigneeID = strings.TrimSpace(input.AssigneeID)
	input.Description = strings.TrimSpace(input.Description)
	if input.AssigneeID == "" || input.Description == "" || input.AssigneeRole == "" {
		return IncidentTask{}, ErrInvalid
	}

	row := db.QueryRow(`
		INSERT INTO dsh_incident_tasks (incident_id, assignee_id, assignee_role, description)
		VALUES ($1::uuid, $2, $3, $4)
		RETURNING id, incident_id, assignee_id, assignee_role, description, status, COALESCE(evidence_url,''), created_at, updated_at`,
		incidentID, input.AssigneeID, input.AssigneeRole, input.Description,
	)
	var t IncidentTask
	err := row.Scan(&t.ID, &t.IncidentID, &t.AssigneeID, &t.AssigneeRole, &t.Description, &t.Status, &t.EvidenceURL, &t.CreatedAt, &t.UpdatedAt)
	return t, err
}

func UpdateIncidentTaskStatus(db *sql.DB, taskID string, input UpdateIncidentTaskInput) (IncidentTask, error) {
	if db == nil || strings.TrimSpace(taskID) == "" {
		return IncidentTask{}, ErrInvalid
	}
	input.EvidenceURL = strings.TrimSpace(input.EvidenceURL)
	if input.Status == "" {
		return IncidentTask{}, ErrInvalid
	}
	if input.Status == TaskCompleted && input.EvidenceURL == "" {
		return IncidentTask{}, errors.New("completed task requires evidence URL")
	}

	row := db.QueryRow(`
		UPDATE dsh_incident_tasks
		SET status = $2, evidence_url = NULLIF($3, ''), updated_at = NOW()
		WHERE id = $1::uuid
		RETURNING id, incident_id, assignee_id, assignee_role, description, status, COALESCE(evidence_url,''), created_at, updated_at`,
		taskID, input.Status, input.EvidenceURL,
	)
	var t IncidentTask
	err := row.Scan(&t.ID, &t.IncidentID, &t.AssigneeID, &t.AssigneeRole, &t.Description, &t.Status, &t.EvidenceURL, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return IncidentTask{}, ErrNotFound
	}
	return t, err
}

func AddIncidentCommunication(db *sql.DB, incidentID string, input CreateIncidentCommunicationInput) (IncidentCommunication, error) {
	if db == nil || strings.TrimSpace(incidentID) == "" {
		return IncidentCommunication{}, ErrInvalid
	}
	input.AuthorID = strings.TrimSpace(input.AuthorID)
	input.Body = strings.TrimSpace(input.Body)
	if input.AuthorID == "" || input.Body == "" {
		return IncidentCommunication{}, ErrInvalid
	}

	row := db.QueryRow(`
		INSERT INTO dsh_incident_communications (incident_id, author_id, body, is_public_safe)
		VALUES ($1::uuid, $2, $3, $4)
		RETURNING id, incident_id, author_id, body, is_public_safe, created_at`,
		incidentID, input.AuthorID, input.Body, input.IsPublicSafe,
	)
	var c IncidentCommunication
	err := row.Scan(&c.ID, &c.IncidentID, &c.AuthorID, &c.Body, &c.IsPublicSafe, &c.CreatedAt)
	return c, err
}

func AddIncidentEntity(db *sql.DB, incidentID string, entityType string, entityID string) (IncidentEntity, error) {
	if db == nil || strings.TrimSpace(incidentID) == "" {
		return IncidentEntity{}, ErrInvalid
	}
	entityType = strings.TrimSpace(entityType)
	entityID = strings.TrimSpace(entityID)
	if entityType == "" || entityID == "" {
		return IncidentEntity{}, ErrInvalid
	}

	_, err := db.Exec(`
		INSERT INTO dsh_incident_entities (incident_id, entity_type, entity_id)
		VALUES ($1::uuid, $2, $3)
		ON CONFLICT (incident_id, entity_type, entity_id) DO NOTHING`,
		incidentID, entityType, entityID,
	)
	if err != nil {
		return IncidentEntity{}, err
	}
	return IncidentEntity{IncidentID: incidentID, EntityType: entityType, EntityID: entityID}, nil
}
