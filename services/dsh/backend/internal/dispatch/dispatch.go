package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/orders"
	"dsh-api/internal/specialrequests"

	"github.com/lib/pq"
)

var (
	ErrNotFound = errors.New("dispatch assignment not found")
	ErrInvalid  = errors.New("invalid dispatch input")
	ErrConflict = errors.New("dispatch state conflict")
)

type AssignmentStatus string
type DeliveryStatus string

const (
	AssignmentOffered   AssignmentStatus = "offered"
	AssignmentAccepted  AssignmentStatus = "accepted"
	AssignmentDeclined  AssignmentStatus = "declined"
	AssignmentCompleted AssignmentStatus = "completed"
	AssignmentCancelled AssignmentStatus = "cancelled"

	DeliveryAssigned           DeliveryStatus = "assigned"
	DeliveryDriverAssigned     DeliveryStatus = "driver_assigned"
	DeliveryArrivedStore       DeliveryStatus = "driver_arrived_store"
	DeliveryPickedUp           DeliveryStatus = "picked_up"
	DeliveryArrivedCustomer    DeliveryStatus = "arrived_customer"
	DeliveryReturningStore     DeliveryStatus = "returning_to_store"
	DeliveryReturnArrivedStore DeliveryStatus = "return_arrived_store"
	DeliveryReturnedStore      DeliveryStatus = "returned_to_store"
	DeliveryDelivered          DeliveryStatus = "delivered"
	DeliveryCancelled          DeliveryStatus = "cancelled"
)

type Assignment struct {
	ID                 string
	OrderID            string
	SpecialRequestID   string
	SpecialRequestType string
	CaptainID          string
	AssignedBy         string
	Status             AssignmentStatus
	ResponseDeadlineAt time.Time
	AcceptedAt         *time.Time
	DeclinedAt         *time.Time
	CompletedAt        *time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
	Version            int
	LastLatitude       *float64
	LastLongitude      *float64
	LocationRecordedAt *time.Time
	Delivery           Delivery
}

type Delivery struct {
	ID               string
	AssignmentID     string
	OrderID          string
	SpecialRequestID string
	CaptainID        string
	Status           DeliveryStatus
	PoDMethod        string
	PoDReference     string
	Note             string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type CreateAssignmentInput struct {
	OrderID           string
	SpecialRequestID  string
	OperatorContextID string
	CaptainID         string
	ActorID           string
}

type PushLocationInput struct {
	OperatorContextID string
	Latitude          float64
	Longitude         float64
	RecordedAt        *time.Time
}

func CreateAssignment(db *sql.DB, input CreateAssignmentInput) (*Assignment, error) {
	if input.OrderID == "" || input.CaptainID == "" || input.ActorID == "" {
		return nil, fmt.Errorf("%w: orderId, captainId, and actor are required", ErrInvalid)
	}
	if strings.TrimSpace(input.OperatorContextID) == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var fulfillmentMode string
	err = tx.QueryRow(`SELECT fulfillment_mode FROM dsh_orders WHERE id = $1::uuid AND operator_context_id = $2`, input.OrderID, input.OperatorContextID).Scan(&fulfillmentMode)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if fulfillmentMode != "bthwani_delivery" {
		return nil, fmt.Errorf("%w: only bthwani_delivery orders can be assigned to platform captains", ErrConflict)
	}

	if _, err = orders.TransitionDispatchOrder(tx, input.OperatorContextID, input.OrderID, input.ActorID, "operator",
		[]orders.OrderStatus{orders.StatusReadyForPickup}, orders.StatusDriverAssigned, "captain assigned"); err != nil {
		if errors.Is(err, orders.ErrNotFound) {
			return nil, ErrNotFound
		}
		if errors.Is(err, orders.ErrConflict) {
			return nil, ErrConflict
		}
		return nil, err
	}

	assignment, err := scanAssignmentRow(tx.QueryRow(`
                INSERT INTO dsh_assignments (operator_context_id, order_id, captain_id, assigned_by, status, response_deadline_at)
                VALUES ($1, $2::uuid, $3, $4, $5, NOW() + INTERVAL '90 seconds')
                RETURNING id::text, order_id::text, captain_id, assigned_by, status,
                          response_deadline_at, accepted_at, declined_at, completed_at, created_at, updated_at, version`,
		input.OperatorContextID, input.OrderID, input.CaptainID, input.ActorID, string(AssignmentOffered)))
	if err != nil {
		return nil, err
	}
	delivery, err := scanDeliveryRow(tx.QueryRow(`
                INSERT INTO dsh_deliveries (assignment_id, order_id, captain_id, status)
                VALUES ($1::uuid, $2::uuid, $3, $4)
                RETURNING id::text, assignment_id::text, order_id::text, captain_id, status,
                          COALESCE(pod_method, ''), COALESCE(pod_reference, ''), COALESCE(note, ''),
                          created_at, updated_at`,
		assignment.ID, input.OrderID, input.CaptainID, string(DeliveryAssigned)))
	if err != nil {
		return nil, err
	}
	assignment.Delivery = *delivery

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return assignment, nil
}

func CreateAssignmentForSpecialRequest(db *sql.DB, input CreateAssignmentInput) (*Assignment, error) {
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	if input.SpecialRequestID == "" || input.CaptainID == "" || input.ActorID == "" {
		return nil, fmt.Errorf("%w: specialRequestId, captainId, and actor are required", ErrInvalid)
	}
	if input.OperatorContextID == "" {
		return nil, fmt.Errorf("%w: OperatorContext is required for special-request assignment", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var existingAssignmentID, existingCaptainID string
	err = tx.QueryRow(`
                SELECT id::text, captain_id
                FROM dsh_assignments
                WHERE special_request_id = $1::uuid AND operator_context_id = $2
                  AND status IN ('offered', 'accepted')
                FOR UPDATE`, input.SpecialRequestID, input.OperatorContextID).Scan(&existingAssignmentID, &existingCaptainID)
	if err == nil {
		if existingCaptainID != input.CaptainID {
			return nil, fmt.Errorf("%w: special request already has an active assignment for another captain", ErrConflict)
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return GetCaptainAssignmentForOperatorContext(db, input.OperatorContextID, existingAssignmentID, input.CaptainID)
	}
	if err != sql.ErrNoRows {
		return nil, err
	}
	if err = specialrequests.CheckSheinDispatchReadiness(tx, input.OperatorContextID, input.SpecialRequestID); err != nil {
		return nil, mapSpecialRequestError(err)
	}

	assignment, err := scanAssignmentRow(tx.QueryRow(`
                INSERT INTO dsh_assignments (operator_context_id, special_request_id, captain_id, assigned_by, status, response_deadline_at)
                VALUES ($1, $2::uuid, $3, $4, $5, NOW() + INTERVAL '90 seconds')
                RETURNING id::text, COALESCE(order_id::text, ''), captain_id, assigned_by, status,
                          response_deadline_at, accepted_at, declined_at, completed_at, created_at, updated_at, version`,
		input.OperatorContextID, input.SpecialRequestID, input.CaptainID, input.ActorID, string(AssignmentOffered)))
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, fmt.Errorf("%w: special request already has an active assignment", ErrConflict)
		}
		return nil, err
	}
	assignment.SpecialRequestID = input.SpecialRequestID

	delivery, err := scanDeliveryRow(tx.QueryRow(`
                INSERT INTO dsh_deliveries (assignment_id, special_request_id, captain_id, status)
                VALUES ($1::uuid, $2::uuid, $3, $4)
                RETURNING id::text, assignment_id::text, COALESCE(order_id::text, ''), captain_id, status,
                          COALESCE(pod_method, ''), COALESCE(pod_reference, ''), COALESCE(note, ''),
                          created_at, updated_at`,
		assignment.ID, input.SpecialRequestID, input.CaptainID, string(DeliveryAssigned)))
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, fmt.Errorf("%w: special request already has an active assignment", ErrConflict)
		}
		return nil, err
	}
	delivery.SpecialRequestID = input.SpecialRequestID
	assignment.Delivery = *delivery

	if err = specialrequests.TransitionDispatchStatusInOperatorContextWithMetadata(tx, input.OperatorContextID, input.SpecialRequestID,
		[]specialrequests.RequestStatus{specialrequests.StatusApproved}, specialrequests.StatusAssigned,
		specialrequests.DispatchTransitionMetadata{
			ActorID: input.ActorID, ActorRole: "operator", Action: "assign_captain", Reason: "captain assigned",
		}); err != nil {
		return nil, mapSpecialRequestError(err)
	}

	result, err := tx.Exec(`
                UPDATE dsh_special_requests
                SET dispatch_assignment_id = $1,
                    captain_assigned_at = COALESCE(captain_assigned_at, NOW()),
                    version = version + 1, updated_at = NOW()
                WHERE id = $2 AND operator_context_id = $3`,
		assignment.ID, input.SpecialRequestID, input.OperatorContextID)
	if err != nil {
		return nil, err
	}
	if affected, err := result.RowsAffected(); err != nil || affected != 1 {
		if err != nil {
			return nil, err
		}
		return nil, ErrConflict
	}
	if err = specialrequests.RecordDispatchAssignmentLink(tx, input.OperatorContextID, input.SpecialRequestID, assignment.ID,
		specialrequests.DispatchTransitionMetadata{ActorID: input.ActorID, ActorRole: "operator", Action: "link_dispatch_assignment"}); err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return assignment, nil
}

func ListCaptainAssignments(db *sql.DB, captainID string, limit int) ([]Assignment, error) {
	if captainID == "" {
		return nil, fmt.Errorf("%w: captain actor is required", ErrInvalid)
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := db.Query(assignmentSelectSQL()+`
                LEFT JOIN dsh_orders o ON o.id = a.order_id
                WHERE a.captain_id = $1
                  AND a.status IN ('offered','accepted')
                  AND d.status NOT IN ('delivered','cancelled')
                  AND (a.order_id IS NULL OR o.status NOT IN (
                    'cancelled_by_client', 'cancelled_by_store', 'cancelled_by_operator',
                    'cancelled_no_driver', 'failed_payment', 'failed_dispatch',
                    'delivered', 'returned_to_store'
                  ))
                ORDER BY a.created_at DESC
                LIMIT $2`, captainID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAssignments(rows)
}

func GetClientTracking(db *sql.DB, orderID, clientID string) (*Assignment, error) {
	if orderID == "" || clientID == "" {
		return nil, fmt.Errorf("%w: orderId and client actor are required", ErrInvalid)
	}
	row := db.QueryRow(assignmentSelectSQL()+`
                JOIN dsh_orders o ON o.id = a.order_id
                WHERE a.order_id = $1::uuid AND o.client_id = $2
                ORDER BY a.created_at DESC
                LIMIT 1`, orderID, clientID)
	assignment, err := scanAssignmentRowWithDelivery(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return assignment, err
}

// GetPartnerTracking returns the store's reference view of the captain
// assignment for a bthwani_delivery order it owns. The client boundary restricts the
// partner to reference status only — the HTTP layer must not marshal the
// captain's live coordinates from this read the way it does for the client.
func GetPartnerTracking(db *sql.DB, orderID, storeID string) (*Assignment, error) {
	if orderID == "" || storeID == "" {
		return nil, fmt.Errorf("%w: orderId and store actor are required", ErrInvalid)
	}
	row := db.QueryRow(assignmentSelectSQL()+`
                JOIN dsh_orders o ON o.id = a.order_id
                WHERE a.order_id = $1::uuid AND o.store_id = $2
                ORDER BY a.created_at DESC
                LIMIT 1`, orderID, storeID)
	assignment, err := scanAssignmentRowWithDelivery(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return assignment, err
}

func AcceptAssignment(db *sql.DB, operatorContextID, assignmentID, captainID string) (*Assignment, error) {
	return updateAssignmentStatus(db, operatorContextID, assignmentID, captainID, AssignmentAccepted, DeliveryDriverAssigned, orders.StatusDriverAssigned, "")
}

func DeclineAssignment(db *sql.DB, operatorContextID, assignmentID, captainID, reason string) (*Assignment, error) {
	if reason == "" {
		reason = "captain declined assignment"
	}
	return updateAssignmentStatus(db, operatorContextID, assignmentID, captainID, AssignmentDeclined, DeliveryAssigned, orders.StatusReadyForPickup, reason)
}

func PushLocationForOperatorContext(db *sql.DB, operatorContextID, assignmentID, captainID string, input PushLocationInput) (*Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	input.OperatorContextID = operatorContextID
	return pushLocation(db, operatorContextID, assignmentID, captainID, input)
}

func pushLocation(db *sql.DB, operatorContextID, assignmentID, captainID string, input PushLocationInput) (*Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	if input.Latitude < -90 || input.Latitude > 90 {
		return nil, fmt.Errorf("%w: latitude must be between -90 and 90", ErrInvalid)
	}
	if input.Longitude < -180 || input.Longitude > 180 {
		return nil, fmt.Errorf("%w: longitude must be between -180 and 180", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := lockAssignmentForOperatorContext(tx, operatorContextID, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if current.Status != AssignmentAccepted || current.Delivery.Status == DeliveryCancelled {
		return nil, fmt.Errorf("%w: location push requires an active accepted assignment", ErrConflict)
	}

	recordedAt := time.Now().UTC()
	if input.RecordedAt != nil {
		recordedAt = input.RecordedAt.UTC()
	}
	_, err = tx.Exec(`
                UPDATE dsh_assignments
                SET last_latitude = $1, last_longitude = $2, location_recorded_at = $3, updated_at = NOW()
                WHERE id = $4::uuid AND captain_id = $5`,
		input.Latitude, input.Longitude, recordedAt, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignmentForOperatorContext(db, operatorContextID, assignmentID, captainID)
}

func GetCaptainAssignment(db *sql.DB, assignmentID, captainID string) (*Assignment, error) {
	row := db.QueryRow(assignmentSelectSQL()+`
                WHERE a.id = $1::uuid AND a.captain_id = $2`, assignmentID, captainID)
	assignment, err := scanAssignmentRowWithDelivery(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return assignment, err
}

func GetCaptainAssignmentForOperatorContext(db *sql.DB, operatorContextID, assignmentID, captainID string) (*Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" || strings.TrimSpace(assignmentID) == "" || strings.TrimSpace(captainID) == "" {
		return nil, fmt.Errorf("%w: operator context, assignment, and captain are required", ErrInvalid)
	}
	row := db.QueryRow(assignmentForCaptainAndContextSQL, assignmentID, captainID, operatorContextID)
	assignment, err := scanAssignmentRowWithDelivery(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return assignment, err
}

func updateAssignmentStatus(db *sql.DB, operatorContextID, assignmentID, captainID string, status AssignmentStatus, deliveryStatus DeliveryStatus, orderStatus orders.OrderStatus, note string) (*Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	current, err := lockAssignmentForOperatorContext(tx, operatorContextID, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {
		return nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)
	}
	if current.Status != AssignmentOffered {
		return nil, fmt.Errorf("%w: assignment already actioned", ErrConflict)
	}
	if current.OrderID != "" {
		allowedOrderStatus := []orders.OrderStatus{orders.StatusDriverAssigned}
		if _, err = orders.TransitionDispatchOrder(tx, operatorContextID, current.OrderID, captainID, "captain", allowedOrderStatus, orderStatus, note); err != nil {
			return nil, mapOrderError(err)
		}
	} else if current.SpecialRequestID != "" {
		operatorContextID, contextErr := specialRequestOperatorContextID(tx, current.SpecialRequestID)
		if contextErr != nil {
			return nil, mapSpecialRequestError(contextErr)
		}
		if status == AssignmentAccepted {
			if err = specialrequests.TransitionDispatchStatusInOperatorContextWithMetadata(tx, operatorContextID, current.SpecialRequestID,
				[]specialrequests.RequestStatus{specialrequests.StatusAssigned}, specialrequests.StatusInProgress,
				specialrequests.DispatchTransitionMetadata{ActorID: captainID, ActorRole: "captain", Action: "captain_accept", Reason: "captain accepted assignment"}); err != nil {
				return nil, mapSpecialRequestError(err)
			}
		} else if status == AssignmentDeclined {
			if err = specialrequests.TransitionDispatchStatusInOperatorContextWithMetadata(tx, operatorContextID, current.SpecialRequestID,
				[]specialrequests.RequestStatus{specialrequests.StatusAssigned}, specialrequests.StatusApproved,
				specialrequests.DispatchTransitionMetadata{ActorID: captainID, ActorRole: "captain", Action: "captain_decline", Reason: note}); err != nil {
				return nil, mapSpecialRequestError(err)
			}
		}
	}
	if status == AssignmentDeclined {
		_, err = tx.Exec(`
                        UPDATE dsh_assignments
                        SET status = $1, declined_at = NOW(), updated_at = NOW(),
                            last_latitude = NULL, last_longitude = NULL, location_recorded_at = NULL
                        WHERE id = $2::uuid AND captain_id = $3`, string(status), assignmentID, captainID)
	} else {
		_, err = tx.Exec(`
                        UPDATE dsh_assignments
                        SET status = $1, accepted_at = NOW(), updated_at = NOW()
                        WHERE id = $2::uuid AND captain_id = $3`, string(status), assignmentID, captainID)
	}
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(`
                UPDATE dsh_deliveries
                SET status = $1, updated_at = NOW()
                WHERE assignment_id = $2::uuid AND captain_id = $3`,
		string(deliveryStatus), assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignmentForOperatorContext(db, operatorContextID, assignmentID, captainID)
}

func updateDeliveryProgressVersionedForContext(
	db *sql.DB,
	operatorContextID string,
	assignmentID string,
	captainID string,
	allowed []DeliveryStatus,
	next DeliveryStatus,
	orderStatus orders.OrderStatus,
	expectedVersion int,
	command captainDeliveryStatusCommand,
) (*Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	replayed, err := beginCaptainDeliveryStatusCommand(tx, command)
	if err != nil {
		return nil, err
	}
	if replayed {
		if err = tx.Commit(); err != nil {
			return nil, err
		}
		return GetCaptainAssignmentForOperatorContext(db, operatorContextID, assignmentID, captainID)
	}
	current, err := lockAssignmentForOperatorContext(tx, operatorContextID, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {
		return nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)
	}
	if expectedVersion > 0 && current.Version != expectedVersion {
		return nil, fmt.Errorf("%w: assignment version changed", ErrConflict)
	}
	if err = ensureNoOpenDeliveryException(tx, assignmentID); err != nil {
		return nil, err
	}
	if current.Status != AssignmentAccepted {
		return nil, fmt.Errorf("%w: assignment is not accepted", ErrConflict)
	}
	valid := false
	for _, candidate := range allowed {
		if current.Delivery.Status == candidate {
			valid = true
			break
		}
	}
	if !valid {
		return nil, fmt.Errorf("%w: delivery cannot move from %s to %s", ErrConflict, current.Delivery.Status, next)
	}
	if current.OrderID != "" {
		if _, err = orders.TransitionDispatchOrder(tx, operatorContextID, current.OrderID, captainID, "captain",
			[]orders.OrderStatus{orders.OrderStatus(current.Delivery.Status)}, orderStatus, string(next)); err != nil {
			return nil, mapOrderError(err)
		}
	}
	_, err = tx.Exec(`
                UPDATE dsh_assignments SET version=version+1, updated_at=NOW()
                WHERE id=$1::uuid AND captain_id=$2`, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(`
                UPDATE dsh_deliveries SET status=$1, updated_at=NOW()
                WHERE assignment_id=$2::uuid AND captain_id=$3`, string(next), assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if err = recordCaptainDeliveryStatusCommand(tx, command); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignmentForOperatorContext(db, operatorContextID, assignmentID, captainID)
}
