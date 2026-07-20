package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"dsh-api/internal/orders"
	"dsh-api/internal/specialrequests"
	"dsh-api/internal/wltoutbox"

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

	DeliveryAssigned        DeliveryStatus = "assigned"
	DeliveryDriverAssigned  DeliveryStatus = "driver_assigned"
	DeliveryArrivedStore    DeliveryStatus = "driver_arrived_store"
	DeliveryPickedUp        DeliveryStatus = "picked_up"
	DeliveryArrivedCustomer DeliveryStatus = "arrived_customer"
	DeliveryDelivered       DeliveryStatus = "delivered"
	DeliveryCancelled       DeliveryStatus = "cancelled"
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
	OrderID          string
	SpecialRequestID string
	TenantID         string
	CaptainID        string
	ActorID          string
}

type PoDInput struct {
	Method    string
	Reference string
	Note      string
}

type PushLocationInput struct {
	Latitude   float64
	Longitude  float64
	RecordedAt *time.Time
}

func CreateAssignment(db *sql.DB, input CreateAssignmentInput) (*Assignment, error) {
	if input.OrderID == "" || input.CaptainID == "" || input.ActorID == "" {
		return nil, fmt.Errorf("%w: orderId, captainId, and actor are required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var fulfillmentMode string
	err = tx.QueryRow(`SELECT fulfillment_mode FROM dsh_orders WHERE id = $1::uuid`, input.OrderID).Scan(&fulfillmentMode)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if fulfillmentMode != "bthwani_delivery" {
		return nil, fmt.Errorf("%w: only bthwani_delivery orders can be assigned to platform captains", ErrConflict)
	}

	if _, err = orders.TransitionDispatchOrder(tx, input.OrderID, "operator",
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
		INSERT INTO dsh_assignments (order_id, captain_id, assigned_by, status, response_deadline_at)
		VALUES ($1::uuid, $2, $3, $4, NOW() + INTERVAL '90 seconds')
		RETURNING id::text, order_id::text, captain_id, assigned_by, status,
		          response_deadline_at, accepted_at, declined_at, completed_at, created_at, updated_at`,
		input.OrderID, input.CaptainID, input.ActorID, string(AssignmentOffered)))
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
	if input.SpecialRequestID == "" || input.CaptainID == "" || input.ActorID == "" {
		return nil, fmt.Errorf("%w: specialRequestId, captainId, and actor are required", ErrInvalid)
	}
	if input.TenantID == "" {
		input.TenantID = specialrequests.DefaultTenantID
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err = specialrequests.CheckSheinDispatchReadiness(tx, input.TenantID, input.SpecialRequestID); err != nil {
		return nil, mapSpecialRequestError(err)
	}
	if err = specialrequests.TransitionDispatchStatusInTenant(tx, input.TenantID, input.SpecialRequestID,
		[]specialrequests.RequestStatus{specialrequests.StatusApproved}, specialrequests.StatusAssigned); err != nil {
		return nil, mapSpecialRequestError(err)
	}

	assignment, err := scanAssignmentRow(tx.QueryRow(`
		INSERT INTO dsh_assignments (special_request_id, captain_id, assigned_by, status, response_deadline_at)
		VALUES ($1::uuid, $2, $3, $4, NOW() + INTERVAL '90 seconds')
		RETURNING id::text, COALESCE(order_id::text, ''), captain_id, assigned_by, status,
		          response_deadline_at, accepted_at, declined_at, completed_at, created_at, updated_at`,
		input.SpecialRequestID, input.CaptainID, input.ActorID, string(AssignmentOffered)))
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

	if _, err = tx.Exec(`
		UPDATE dsh_special_requests
		SET dispatch_assignment_id = $1, version = version + 1
		WHERE id = $2 AND tenant_id = $3`,
		assignment.ID, input.SpecialRequestID, input.TenantID); err != nil {
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
		WHERE a.captain_id = $1
		  AND a.status IN ('offered','accepted')
		  AND d.status NOT IN ('delivered','cancelled')
		ORDER BY a.created_at DESC
		LIMIT $2`, captainID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAssignments(rows)
}

func ListOperatorAssignments(db *sql.DB, limit int) ([]Assignment, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := db.Query(assignmentSelectSQL()+`
		ORDER BY a.created_at DESC
		LIMIT $1`, limit)
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

func AcceptAssignment(db *sql.DB, assignmentID, captainID string) (*Assignment, error) {
	return updateAssignmentStatus(db, assignmentID, captainID, AssignmentAccepted, DeliveryDriverAssigned, orders.StatusDriverAssigned, "")
}

func DeclineAssignment(db *sql.DB, assignmentID, captainID, reason string) (*Assignment, error) {
	if reason == "" {
		reason = "captain declined assignment"
	}
	return updateAssignmentStatus(db, assignmentID, captainID, AssignmentDeclined, DeliveryAssigned, orders.StatusReadyForPickup, reason)
}

func UpdateDeliveryStatus(db *sql.DB, assignmentID, captainID string, status DeliveryStatus) (*Assignment, error) {
	switch status {
	case DeliveryArrivedStore:
		return updateDeliveryProgress(db, assignmentID, captainID, []DeliveryStatus{DeliveryDriverAssigned}, status, orders.StatusArrivedStore)
	case DeliveryPickedUp:
		return updateDeliveryProgress(db, assignmentID, captainID, []DeliveryStatus{DeliveryArrivedStore}, status, orders.StatusPickedUp)
	case DeliveryArrivedCustomer:
		return updateDeliveryProgress(db, assignmentID, captainID, []DeliveryStatus{DeliveryPickedUp}, status, orders.StatusArrivedCustomer)
	default:
		return nil, fmt.Errorf("%w: unsupported delivery status", ErrInvalid)
	}
}

func PushLocation(db *sql.DB, assignmentID, captainID string, input PushLocationInput) (*Assignment, error) {
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

	current, err := lockAssignment(tx, assignmentID, captainID)
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
	return GetCaptainAssignment(db, assignmentID, captainID)
}

func SubmitPoD(db *sql.DB, assignmentID, captainID string, input PoDInput) (*Assignment, error) {
	if input.Method == "" || input.Reference == "" {
		return nil, fmt.Errorf("%w: proof method and reference are required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := lockAssignment(tx, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {
		return nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)
	}
	if current.Delivery.Status != DeliveryArrivedCustomer {
		return nil, fmt.Errorf("%w: proof requires arrived_customer state", ErrConflict)
	}
	if current.OrderID != "" {
		if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "captain",
			[]orders.OrderStatus{orders.StatusArrivedCustomer}, orders.StatusDelivered, "proof of delivery submitted"); err != nil {
			return nil, mapOrderError(err)
		}
	} else if current.SpecialRequestID != "" {
		if err = specialrequests.TransitionDispatchStatus(tx, current.SpecialRequestID,
			[]specialrequests.RequestStatus{specialrequests.StatusInProgress}, specialrequests.StatusCompleted); err != nil {
			return nil, mapSpecialRequestError(err)
		}
	}
	_, err = tx.Exec(`
		UPDATE dsh_deliveries
		SET status = $1, pod_method = $2, pod_reference = $3, note = NULLIF($4, ''), updated_at = NOW()
		WHERE assignment_id = $5::uuid AND captain_id = $6`,
		string(DeliveryDelivered), input.Method, input.Reference, input.Note, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(`
		UPDATE dsh_assignments
		SET status = $1, completed_at = NOW(), updated_at = NOW(),
		    last_latitude = NULL, last_longitude = NULL, location_recorded_at = NULL
		WHERE id = $2::uuid AND captain_id = $3`,
		string(AssignmentCompleted), assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if err = enqueueWltDeliveryCompletedNotification(tx, current.OrderID, captainID); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignment(db, assignmentID, captainID)
}

func enqueueWltDeliveryCompletedNotification(tx *sql.Tx, orderID, captainID string) error {
	if orderID == "" {
		return nil
	}
	deliveryCtx, err := orders.GetOrderDeliveryContext(tx, orderID)
	if err != nil {
		return fmt.Errorf("resolve delivery context for wlt outbox: %w", err)
	}
	if deliveryCtx.PaymentMethod != "cod" || deliveryCtx.PartnerID == "" {
		return nil
	}
	return wltoutbox.Enqueue(tx, wltoutbox.EventTypeDeliveryCompleted, orderID, captainID, deliveryCtx.PartnerID, deliveryCtx.CheckoutIntentID)
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

func updateAssignmentStatus(db *sql.DB, assignmentID, captainID string, status AssignmentStatus, deliveryStatus DeliveryStatus, orderStatus orders.OrderStatus, note string) (*Assignment, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	current, err := lockAssignment(tx, assignmentID, captainID)
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
		if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "captain", allowedOrderStatus, orderStatus, note); err != nil {
			return nil, mapOrderError(err)
		}
	} else if current.SpecialRequestID != "" {
		if status == AssignmentAccepted {
			if err = specialrequests.TransitionDispatchStatus(tx, current.SpecialRequestID,
				[]specialrequests.RequestStatus{specialrequests.StatusAssigned}, specialrequests.StatusInProgress); err != nil {
				return nil, mapSpecialRequestError(err)
			}
		} else if status == AssignmentDeclined {
			if err = specialrequests.TransitionDispatchStatus(tx, current.SpecialRequestID,
				[]specialrequests.RequestStatus{specialrequests.StatusAssigned}, specialrequests.StatusApproved); err != nil {
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
	return GetCaptainAssignment(db, assignmentID, captainID)
}

func updateDeliveryProgress(db *sql.DB, assignmentID, captainID string, allowed []DeliveryStatus, next DeliveryStatus, orderStatus orders.OrderStatus) (*Assignment, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	current, err := lockAssignment(tx, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {
		return nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)
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
		if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "captain",
			[]orders.OrderStatus{orders.OrderStatus(current.Delivery.Status)}, orderStatus, string(next)); err != nil {
			return nil, mapOrderError(err)
		}
	}
	_, err = tx.Exec(`
		UPDATE dsh_deliveries SET status=$1, updated_at=NOW()
		WHERE assignment_id=$2::uuid AND captain_id=$3`, string(next), assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignment(db, assignmentID, captainID)
}
