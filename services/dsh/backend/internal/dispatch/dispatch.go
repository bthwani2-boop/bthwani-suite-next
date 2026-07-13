package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"dsh-api/internal/orders"
	"dsh-api/internal/wltoutbox"
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

	DeliveryAssigned        DeliveryStatus = "assigned"
	DeliveryDriverAssigned  DeliveryStatus = "driver_assigned"
	DeliveryArrivedStore    DeliveryStatus = "driver_arrived_store"
	DeliveryPickedUp        DeliveryStatus = "picked_up"
	DeliveryArrivedCustomer DeliveryStatus = "arrived_customer"
	DeliveryDelivered       DeliveryStatus = "delivered"
)

type Assignment struct {
	ID                 string
	OrderID            string
	CaptainID          string
	AssignedBy         string
	Status             AssignmentStatus
	ResponseDeadlineAt time.Time
	AcceptedAt         *time.Time
	DeclinedAt         *time.Time
	CompletedAt        *time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
	// LastLatitude/LastLongitude/LocationRecordedAt hold only the captain's
	// most recent foreground location sample (no history table, by design —
	// register item 14 privacy decision). They are purged back to NULL the
	// moment the assignment reaches a terminal state.
	LastLatitude       *float64
	LastLongitude      *float64
	LocationRecordedAt *time.Time
	Delivery           Delivery
}

type Delivery struct {
	ID           string
	AssignmentID string
	OrderID      string
	CaptainID    string
	Status       DeliveryStatus
	PoDMethod    string
	PoDReference string
	Note         string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CreateAssignmentInput struct {
	OrderID   string
	CaptainID string
	ActorID   string
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

func ListCaptainAssignments(db *sql.DB, captainID string, limit int) ([]Assignment, error) {
	if captainID == "" {
		return nil, fmt.Errorf("%w: captain actor is required", ErrInvalid)
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := db.Query(assignmentSelectSQL()+`
		WHERE a.captain_id = $1
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

// PushLocation records the captain's current foreground location as the
// assignment's last-known point. It is only accepted while the assignment is
// actively out for delivery (accepted, not yet declined/completed) — offered
// and terminal assignments reject the push with ErrConflict. Only the latest
// point is kept; there is no location history table by design.
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
	if current.Status != AssignmentAccepted {
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
	if current.Delivery.Status != DeliveryArrivedCustomer {
		return nil, fmt.Errorf("%w: proof requires arrived_customer state", ErrConflict)
	}
	if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "captain",
		[]orders.OrderStatus{orders.StatusArrivedCustomer}, orders.StatusDelivered, "proof of delivery submitted"); err != nil {
		return nil, mapOrderError(err)
	}
	_, err = tx.Exec(`
		UPDATE dsh_deliveries
		SET status = $1, pod_method = $2, pod_reference = $3, note = NULLIF($4, ''), updated_at = NOW()
		WHERE assignment_id = $5::uuid AND captain_id = $6`,
		string(DeliveryDelivered), input.Method, input.Reference, input.Note, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	// Assignment is now terminal (completed): purge the retained location —
	// only the latest point was ever kept, and it does not outlive the order.
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

// enqueueWltDeliveryCompletedNotification records a durable outbox event so
// WLT eventually learns a COD order was delivered, even if WLT is unreachable
// right now. It runs inside the same transaction that confirms the PoD, so
// the delivery confirmation and the notification commit or roll back together.
func enqueueWltDeliveryCompletedNotification(tx *sql.Tx, orderID, captainID string) error {
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
	if current.Status != AssignmentOffered {
		return nil, fmt.Errorf("%w: assignment already actioned", ErrConflict)
	}
	allowedOrderStatus := []orders.OrderStatus{orders.StatusDriverAssigned}
	if status == AssignmentDeclined {
		allowedOrderStatus = []orders.OrderStatus{orders.StatusDriverAssigned}
	}
	if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "captain", allowedOrderStatus, orderStatus, note); err != nil {
		return nil, mapOrderError(err)
	}
	if status == AssignmentDeclined {
		// Assignment is now terminal (declined): purge the retained location.
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
	if current.Status != AssignmentAccepted {
		return nil, fmt.Errorf("%w: assignment is not accepted", ErrConflict)
	}
	valid := false
	for _, s := range allowed {
		if current.Delivery.Status == s {
			valid = true
		}
	}
	if !valid {
		return nil, fmt.Errorf("%w: delivery cannot move from %s to %s", ErrConflict, current.Delivery.Status, next)
	}
	if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "captain",
		[]orders.OrderStatus{orders.OrderStatus(current.Delivery.Status)}, orderStatus, "delivery status updated"); err != nil {
		return nil, mapOrderError(err)
	}
	_, err = tx.Exec(`
		UPDATE dsh_deliveries
		SET status = $1, updated_at = NOW()
		WHERE assignment_id = $2::uuid AND captain_id = $3`,
		string(next), assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignment(db, assignmentID, captainID)
}

func lockAssignment(tx *sql.Tx, assignmentID, captainID string) (*Assignment, error) {
	row := tx.QueryRow(assignmentSelectSQL()+`
		WHERE a.id = $1::uuid AND a.captain_id = $2
		FOR UPDATE OF a, d`, assignmentID, captainID)
	assignment, err := scanAssignmentRowWithDelivery(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return assignment, err
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

func assignmentSelectSQL() string {
	return `
		SELECT a.id::text, a.order_id::text, a.captain_id, a.assigned_by, a.status,
		       a.response_deadline_at, a.accepted_at, a.declined_at, a.completed_at, a.created_at, a.updated_at,
		       a.last_latitude, a.last_longitude, a.location_recorded_at,
		       d.id::text, d.assignment_id::text, d.order_id::text, d.captain_id, d.status,
		       COALESCE(d.pod_method, ''), COALESCE(d.pod_reference, ''), COALESCE(d.note, ''),
		       d.created_at, d.updated_at
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id = a.id
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
	var a Assignment
	err := row.Scan(&a.ID, &a.OrderID, &a.CaptainID, &a.AssignedBy, &a.Status,
		&a.ResponseDeadlineAt, &a.AcceptedAt, &a.DeclinedAt, &a.CompletedAt,
		&a.CreatedAt, &a.UpdatedAt)
	return &a, err
}

func scanDeliveryRow(row *sql.Row) (*Delivery, error) {
	var d Delivery
	err := row.Scan(&d.ID, &d.AssignmentID, &d.OrderID, &d.CaptainID, &d.Status,
		&d.PoDMethod, &d.PoDReference, &d.Note, &d.CreatedAt, &d.UpdatedAt)
	return &d, err
}

func scanAssignmentRowWithDelivery(row *sql.Row) (*Assignment, error) {
	return scanAssignmentScanner(row)
}

func scanAssignmentScanner(row scanner) (*Assignment, error) {
	var a Assignment
	var d Delivery
	err := row.Scan(&a.ID, &a.OrderID, &a.CaptainID, &a.AssignedBy, &a.Status,
		&a.ResponseDeadlineAt, &a.AcceptedAt, &a.DeclinedAt, &a.CompletedAt,
		&a.CreatedAt, &a.UpdatedAt,
		&a.LastLatitude, &a.LastLongitude, &a.LocationRecordedAt,
		&d.ID, &d.AssignmentID, &d.OrderID, &d.CaptainID, &d.Status,
		&d.PoDMethod, &d.PoDReference, &d.Note, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	a.Delivery = d
	return &a, nil
}
