// Package incident implements dsh_operational_incidents: the record of a
// sovereign platform intervention (cancel, suspend, raise_exception)
// against a partner-owned execution surface. An incident is written before
// its consequence is applied, so "why an override happened" survives as a
// queryable fact independent of the target entity's own audit trail.
package incident

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrNotFound = errors.New("operational incident not found")
	ErrInvalid  = errors.New("invalid operational incident input")
)

type TargetEntityType string

const (
	TargetPartnerDeliveryTask TargetEntityType = "partner_delivery_task"
	TargetPickupSession       TargetEntityType = "pickup_session"
	TargetOrder               TargetEntityType = "order"
)

type IncidentType string

const (
	TypeRaiseException IncidentType = "raise_exception"
	TypeCancel         IncidentType = "cancel"
	TypeSuspend        IncidentType = "suspend"
)

type Status string

const (
	StatusOpen    Status = "open"
	StatusApplied Status = "applied"
	StatusFailed  Status = "failed"
)

// Incident mirrors dsh_operational_incidents' columns.
type Incident struct {
	ID                string
	OrderID           string
	TargetEntityType  TargetEntityType
	TargetEntityID    string
	IncidentType      IncidentType
	Status            Status
	Reason            string
	TicketReference   string
	ActorID           string
	ActorRole         string
	BeforeState       json.RawMessage
	AfterState        json.RawMessage
	FailureReason     *string
	PartnerNotified   bool
	PartnerNotifiedAt *time.Time
	CorrelationID     *string
	AppliedAt         *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

const incidentColumns = `
	id, order_id::text, target_entity_type, target_entity_id, incident_type, status,
	reason, ticket_reference, actor_id, actor_role,
	before_state, after_state, failure_reason,
	partner_notified, partner_notified_at, correlation_id, applied_at,
	created_at, updated_at
`

func scanIncident(scan func(...any) error) (*Incident, error) {
	var inc Incident
	err := scan(
		&inc.ID, &inc.OrderID, &inc.TargetEntityType, &inc.TargetEntityID, &inc.IncidentType, &inc.Status,
		&inc.Reason, &inc.TicketReference, &inc.ActorID, &inc.ActorRole,
		&inc.BeforeState, &inc.AfterState, &inc.FailureReason,
		&inc.PartnerNotified, &inc.PartnerNotifiedAt, &inc.CorrelationID, &inc.AppliedAt,
		&inc.CreatedAt, &inc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &inc, nil
}

// Get returns the incident row by id.
func Get(db *sql.DB, id string) (*Incident, error) {
	query := `SELECT ` + incidentColumns + ` FROM dsh_operational_incidents WHERE id = $1`
	inc, err := scanIncident(db.QueryRow(query, id).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return inc, err
}

// ListFilter narrows List by order.
type ListFilter struct {
	OrderID string
	Limit   int
	Offset  int
}

func clampLimit(limit int) int {
	if limit <= 0 || limit > 200 {
		return 50
	}
	return limit
}

// List returns incidents matching filter, newest first.
func List(db *sql.DB, filter ListFilter) ([]Incident, error) {
	limit := clampLimit(filter.Limit)
	where := "WHERE 1=1"
	var args []any
	idx := 1
	if filter.OrderID != "" {
		where += " AND order_id = $" + itoa(idx) + "::uuid"
		args = append(args, filter.OrderID)
		idx++
	}
	query := `SELECT ` + incidentColumns + ` FROM dsh_operational_incidents ` + where +
		` ORDER BY created_at DESC LIMIT $` + itoa(idx) + ` OFFSET $` + itoa(idx+1)
	args = append(args, limit, filter.Offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var incidents []Incident
	for rows.Next() {
		inc, err := scanIncident(rows.Scan)
		if err != nil {
			return nil, err
		}
		incidents = append(incidents, *inc)
	}
	if incidents == nil {
		incidents = []Incident{}
	}
	return incidents, rows.Err()
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var buf [20]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
