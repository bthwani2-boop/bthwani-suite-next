package dispatch

import (
	"database/sql"
	"errors"
	"strings"

	"dsh-api/internal/orders"
	"dsh-api/internal/specialrequests"
)

const assignmentForCaptainAndContextSQL = `
	SELECT a.id::text, COALESCE(a.order_id::text, ''), a.captain_id, a.assigned_by, a.status,
	       a.response_deadline_at, a.accepted_at, a.declined_at, a.completed_at, a.created_at, a.updated_at, a.version,
	       a.last_latitude, a.last_longitude, a.location_recorded_at,
	       COALESCE(a.special_request_id::text, ''),
	       COALESCE(sr.request_type::text, ''),
	       d.id::text, d.assignment_id::text, COALESCE(d.order_id::text, ''), d.captain_id, d.status,
	       COALESCE(d.pod_method, ''), COALESCE(d.pod_reference, ''), COALESCE(d.note, ''),
	       d.created_at, d.updated_at,
	       COALESCE(d.special_request_id::text, '')
	FROM dsh_assignments a
	JOIN dsh_deliveries d ON d.assignment_id = a.id
	LEFT JOIN dsh_special_requests sr ON sr.id = a.special_request_id
	WHERE a.id = $1::uuid AND a.captain_id = $2 AND a.operator_context_id = $3`

const assignmentForCaptainAndContextForUpdateSQL = `
	SELECT a.id::text, COALESCE(a.order_id::text, ''), a.captain_id, a.assigned_by, a.status,
	       a.response_deadline_at, a.accepted_at, a.declined_at, a.completed_at, a.created_at, a.updated_at, a.version,
	       a.last_latitude, a.last_longitude, a.location_recorded_at,
	       COALESCE(a.special_request_id::text, ''),
	       COALESCE(sr.request_type::text, ''),
	       d.id::text, d.assignment_id::text, COALESCE(d.order_id::text, ''), d.captain_id, d.status,
	       COALESCE(d.pod_method, ''), COALESCE(d.pod_reference, ''), COALESCE(d.note, ''),
	       d.created_at, d.updated_at,
	       COALESCE(d.special_request_id::text, '')
	FROM dsh_assignments a
	JOIN dsh_deliveries d ON d.assignment_id = a.id
	LEFT JOIN dsh_special_requests sr ON sr.id = a.special_request_id
	WHERE a.id = $1::uuid AND a.captain_id = $2 AND a.operator_context_id = $3
	FOR UPDATE OF a, d`

const assignmentForOperatorContextForUpdateSQL = `
	SELECT a.id::text, COALESCE(a.order_id::text, ''), a.captain_id, a.assigned_by, a.status,
	       a.response_deadline_at, a.accepted_at, a.declined_at, a.completed_at, a.created_at, a.updated_at, a.version,
	       a.last_latitude, a.last_longitude, a.location_recorded_at,
	       COALESCE(a.special_request_id::text, ''),
	       COALESCE(sr.request_type::text, ''),
	       d.id::text, d.assignment_id::text, COALESCE(d.order_id::text, ''), d.captain_id, d.status,
	       COALESCE(d.pod_method, ''), COALESCE(d.pod_reference, ''), COALESCE(d.note, ''),
	       d.created_at, d.updated_at,
	       COALESCE(d.special_request_id::text, '')
	FROM dsh_assignments a
	JOIN dsh_deliveries d ON d.assignment_id = a.id
	LEFT JOIN dsh_special_requests sr ON sr.id = a.special_request_id
	WHERE a.id = $1::uuid AND a.operator_context_id = $2
	FOR UPDATE OF a, d`

func lockAssignmentForOperatorContext(tx *sql.Tx, operatorContextID, assignmentID, captainID string) (*Assignment, error) {
	if strings.TrimSpace(operatorContextID) == "" {
		return nil, ErrInvalid
	}
	row := tx.QueryRow(assignmentForCaptainAndContextForUpdateSQL, assignmentID, captainID, operatorContextID)
	assignment, err := scanAssignmentRowWithDelivery(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return assignment, err
}

func specialRequestOperatorContextID(tx *sql.Tx, requestID string) (string, error) {
	var operatorContextID string
	err := tx.QueryRow(`
		SELECT operator_context_id
		FROM dsh_special_requests
		WHERE id = $1::uuid
		FOR UPDATE`, requestID).Scan(&operatorContextID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	return operatorContextID, nil
}

func mapOrderError(err error) error {
	if errors.Is(err, orders.ErrNotFound) {
		return ErrNotFound
	}
	if errors.Is(err, orders.ErrConflict) {
		return ErrConflict
	}
	return err
}

func mapSpecialRequestError(err error) error {
	if errors.Is(err, specialrequests.ErrNotFound) {
		return ErrNotFound
	}
	if errors.Is(err, specialrequests.ErrConflict) {
		return ErrConflict
	}
	return err
}

func assignmentSelectSQL() string {
	return `
		SELECT a.id::text, COALESCE(a.order_id::text, ''), a.captain_id, a.assigned_by, a.status,
		       a.response_deadline_at, a.accepted_at, a.declined_at, a.completed_at, a.created_at, a.updated_at, a.version,
		       a.last_latitude, a.last_longitude, a.location_recorded_at,
		       COALESCE(a.special_request_id::text, ''),
		       COALESCE(sr.request_type::text, ''),
		       d.id::text, d.assignment_id::text, COALESCE(d.order_id::text, ''), d.captain_id, d.status,
		       COALESCE(d.pod_method, ''), COALESCE(d.pod_reference, ''), COALESCE(d.note, ''),
		       d.created_at, d.updated_at,
		       COALESCE(d.special_request_id::text, '')
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id = a.id
		LEFT JOIN dsh_special_requests sr ON sr.id = a.special_request_id
	`
}

func scanAssignments(rows *sql.Rows) ([]Assignment, error) {
	var result []Assignment
	for rows.Next() {
		item, err := scanAssignmentScanner(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *item)
	}
	if result == nil {
		result = []Assignment{}
	}
	return result, rows.Err()
}

type scanner interface {
	Scan(dest ...any) error
}

func scanAssignmentRow(row *sql.Row) (*Assignment, error) {
	var assignment Assignment
	err := row.Scan(
		&assignment.ID,
		&assignment.OrderID,
		&assignment.CaptainID,
		&assignment.AssignedBy,
		&assignment.Status,
		&assignment.ResponseDeadlineAt,
		&assignment.AcceptedAt,
		&assignment.DeclinedAt,
		&assignment.CompletedAt,
		&assignment.CreatedAt,
		&assignment.UpdatedAt,
		&assignment.Version,
	)
	return &assignment, err
}

func scanDeliveryRow(row *sql.Row) (*Delivery, error) {
	var delivery Delivery
	err := row.Scan(
		&delivery.ID,
		&delivery.AssignmentID,
		&delivery.OrderID,
		&delivery.CaptainID,
		&delivery.Status,
		&delivery.PoDMethod,
		&delivery.PoDReference,
		&delivery.Note,
		&delivery.CreatedAt,
		&delivery.UpdatedAt,
	)
	return &delivery, err
}

func scanAssignmentRowWithDelivery(row *sql.Row) (*Assignment, error) {
	return scanAssignmentScanner(row)
}

func scanAssignmentScanner(row scanner) (*Assignment, error) {
	var assignment Assignment
	var delivery Delivery
	err := row.Scan(
		&assignment.ID,
		&assignment.OrderID,
		&assignment.CaptainID,
		&assignment.AssignedBy,
		&assignment.Status,
		&assignment.ResponseDeadlineAt,
		&assignment.AcceptedAt,
		&assignment.DeclinedAt,
		&assignment.CompletedAt,
		&assignment.CreatedAt,
		&assignment.UpdatedAt,
		&assignment.Version,
		&assignment.LastLatitude,
		&assignment.LastLongitude,
		&assignment.LocationRecordedAt,
		&assignment.SpecialRequestID,
		&assignment.SpecialRequestType,
		&delivery.ID,
		&delivery.AssignmentID,
		&delivery.OrderID,
		&delivery.CaptainID,
		&delivery.Status,
		&delivery.PoDMethod,
		&delivery.PoDReference,
		&delivery.Note,
		&delivery.CreatedAt,
		&delivery.UpdatedAt,
		&delivery.SpecialRequestID,
	)
	if err != nil {
		return nil, err
	}
	assignment.Delivery = delivery
	return &assignment, nil
}
