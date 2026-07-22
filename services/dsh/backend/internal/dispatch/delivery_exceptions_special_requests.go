package dispatch

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"dsh-api/internal/operationaloutbox"
	"dsh-api/internal/specialrequests"
)

// resolveSpecialRequestExceptionReassignCaptainTx keeps reassignment inside the
// dispatch owner while updating the linked special-request read model in the
// same transaction. It is intentionally limited to the pre-pickup window.
func resolveSpecialRequestExceptionReassignCaptainTx(
	tx *sql.Tx,
	current *DeliveryException,
	expectedVersion int,
	newCaptainID, note, actorID string,
) (*DeliveryException, error) {
	var (
		assignmentStatus AssignmentStatus
		deliveryStatus   DeliveryStatus
		requestType      specialrequests.RequestType
		requestStatus    specialrequests.RequestStatus
		requestVersion   int
		tenantID         string
		correlationID    sql.NullString
	)
	if err := tx.QueryRow(`
		SELECT a.status, d.status, sr.request_type, sr.status, sr.version, sr.tenant_id, sr.correlation_id
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id = a.id
		JOIN dsh_special_requests sr ON sr.id = a.special_request_id
		WHERE a.id = $1::uuid AND a.captain_id = $2 AND sr.id = $3::uuid
		FOR UPDATE OF a, d, sr`, current.AssignmentID, current.CaptainID, current.SpecialRequestID).
		Scan(&assignmentStatus, &deliveryStatus, &requestType, &requestStatus, &requestVersion, &tenantID, &correlationID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if assignmentStatus != AssignmentAccepted || (deliveryStatus != DeliveryDriverAssigned && deliveryStatus != DeliveryArrivedStore) {
		return nil, fmt.Errorf("%w: special-request reassignment is allowed only before pickup", ErrConflict)
	}

	if _, err := tx.Exec(`
		UPDATE dsh_assignments
		SET status = 'cancelled', updated_at = NOW()
		WHERE id = $1::uuid AND status = 'accepted'`, current.AssignmentID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		UPDATE dsh_deliveries
		SET status = 'cancelled', note = COALESCE(NULLIF(note, ''), 'reassigned after special-request exception'), updated_at = NOW()
		WHERE assignment_id = $1::uuid AND status IN ('driver_assigned', 'driver_arrived_store')`, current.AssignmentID); err != nil {
		return nil, err
	}

	var replacementAssignmentID string
	if err := tx.QueryRow(`
		INSERT INTO dsh_assignments (special_request_id, captain_id, assigned_by, status, response_deadline_at)
		VALUES ($1::uuid, $2, $3, 'offered', NOW() + INTERVAL '90 seconds')
		RETURNING id::text`, current.SpecialRequestID, newCaptainID, actorID).Scan(&replacementAssignmentID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_deliveries (assignment_id, special_request_id, captain_id, status, note)
		VALUES ($1::uuid, $2::uuid, $3, 'assigned', 'replacement assignment after governed special-request exception')`,
		replacementAssignmentID, current.SpecialRequestID, newCaptainID); err != nil {
		return nil, err
	}

	stage := "captain_assignment"
	if requestType == specialrequests.TypeAwnakErrand {
		stage = "assigned"
	}
	result, err := tx.Exec(`
		UPDATE dsh_special_requests
		SET status = 'assigned', workflow_stage = $1, dispatch_assignment_id = $2::uuid,
		    captain_assigned_at = NOW(), version = version + 1, updated_at = NOW()
		WHERE id = $3::uuid AND tenant_id = $4 AND version = $5
		  AND status IN ('approved', 'assigned', 'in_progress')`,
		stage, replacementAssignmentID, current.SpecialRequestID, tenantID, requestVersion)
	if err != nil {
		return nil, err
	}
	if rows, _ := result.RowsAffected(); rows != 1 {
		return nil, fmt.Errorf("%w: special request version changed during reassignment", ErrConflict)
	}

	result, err = tx.Exec(`
		UPDATE dsh_delivery_exceptions
		SET status = 'resolved', resolved_at = NOW(), resolved_by_actor_id = $1,
		    resolution_action = 'reassign_captain', resolution_note = $2,
		    replacement_assignment_id = $3::uuid, replacement_captain_id = $4,
		    version = version + 1, updated_at = NOW()
		WHERE id = $5::uuid AND version = $6 AND status IN ('open', 'acknowledged')`,
		actorID, note, replacementAssignmentID, newCaptainID, current.ID, expectedVersion)
	if err != nil {
		return nil, err
	}
	if rows, _ := result.RowsAffected(); rows != 1 {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}

	fromState, _ := json.Marshal(map[string]any{
		"status": requestStatus, "version": requestVersion, "dispatchAssignmentId": current.AssignmentID,
	})
	toState, _ := json.Marshal(map[string]any{
		"status": specialrequests.StatusAssigned, "version": requestVersion + 1, "dispatchAssignmentId": replacementAssignmentID,
	})
	correlation := correlationID.String
	if err := specialrequests.WriteAuditEvent(
		tx, current.SpecialRequestID, actorID, "operator", "reassign_captain", note, correlation, fromState, toState,
	); err != nil {
		return nil, fmt.Errorf("write special-request audit event: %w", err)
	}
	payload, _ := json.Marshal(map[string]any{
		"specialRequestId": current.SpecialRequestID,
		"assignmentId":     replacementAssignmentID,
		"captainId":        newCaptainID,
		"occurredAt":       time.Now().UTC(),
	})
	if err := operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType:     "special_request_reassigned",
		EntityType:    "special_request",
		EntityID:      current.SpecialRequestID,
		Payload:       payload,
		CorrelationID: correlation,
	}); err != nil {
		return nil, err
	}

	return getDeliveryExceptionForUpdate(tx, current.ID)
}
