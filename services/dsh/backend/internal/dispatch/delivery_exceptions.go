package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/orders"
)

type DeliveryExceptionReasonCode string
type DeliveryExceptionStatus string
type DeliveryExceptionSeverity string

const (
	ExceptionCustomerUnreachable DeliveryExceptionReasonCode = "customer_unreachable"
	ExceptionRecipientRefused    DeliveryExceptionReasonCode = "recipient_refused"
	ExceptionWrongAddress        DeliveryExceptionReasonCode = "wrong_address"
	ExceptionUnsafeLocation      DeliveryExceptionReasonCode = "unsafe_location"
	ExceptionVehicleBreakdown    DeliveryExceptionReasonCode = "vehicle_breakdown"
	ExceptionAccident            DeliveryExceptionReasonCode = "accident"
	ExceptionDamagedOrder        DeliveryExceptionReasonCode = "damaged_order"
	ExceptionCashCollection      DeliveryExceptionReasonCode = "cash_collection_issue"
	ExceptionWeatherRoadBlock    DeliveryExceptionReasonCode = "weather_or_road_block"
	ExceptionProofUnavailable    DeliveryExceptionReasonCode = "proof_unavailable"
	ExceptionOther               DeliveryExceptionReasonCode = "other"

	DeliveryExceptionOpen         DeliveryExceptionStatus = "open"
	DeliveryExceptionAcknowledged DeliveryExceptionStatus = "acknowledged"
	DeliveryExceptionResolved     DeliveryExceptionStatus = "resolved"

	DeliveryExceptionMedium   DeliveryExceptionSeverity = "medium"
	DeliveryExceptionHigh     DeliveryExceptionSeverity = "high"
	DeliveryExceptionCritical DeliveryExceptionSeverity = "critical"
)

type DeliveryException struct {
	ID                      string
	TenantID                string
	AssignmentID            string
	OrderID                 string
	CaptainID               string
	ReasonCode              DeliveryExceptionReasonCode
	Note                    string
	DeliveryStatusAtReport  DeliveryStatus
	Severity                DeliveryExceptionSeverity
	Status                  DeliveryExceptionStatus
	CorrelationID           string
	ReportedLatitude        *float64
	ReportedLongitude       *float64
	ReportedAt              time.Time
	AcknowledgedAt          *time.Time
	AcknowledgedByActorID   *string
	ResolvedAt              *time.Time
	ResolvedByActorID       *string
	ResolutionAction        *string
	ResolutionNote          *string
	ReplacementAssignmentID *string
	ReplacementCaptainID    *string
	ReturnStartedAt         *time.Time
	ReturnArrivedAt         *time.Time
	ReturnedAt              *time.Time
	ReturnAcceptedByActorID *string
	Version                 int
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

type ReportDeliveryExceptionInput struct {
	ReasonCode    DeliveryExceptionReasonCode
	Note          string
	CorrelationID string
	Latitude      *float64
	Longitude     *float64
}

var validDeliveryExceptionReasons = map[DeliveryExceptionReasonCode]bool{
	ExceptionCustomerUnreachable: true,
	ExceptionRecipientRefused:    true,
	ExceptionWrongAddress:        true,
	ExceptionUnsafeLocation:      true,
	ExceptionVehicleBreakdown:    true,
	ExceptionAccident:            true,
	ExceptionDamagedOrder:        true,
	ExceptionCashCollection:      true,
	ExceptionWeatherRoadBlock:    true,
	ExceptionProofUnavailable:    true,
	ExceptionOther:               true,
}

var reportableDeliveryStatuses = map[DeliveryStatus]bool{
	DeliveryDriverAssigned:  true,
	DeliveryArrivedStore:    true,
	DeliveryPickedUp:        true,
	DeliveryArrivedCustomer: true,
}

func severityForDeliveryException(reason DeliveryExceptionReasonCode) DeliveryExceptionSeverity {
	switch reason {
	case ExceptionAccident, ExceptionUnsafeLocation:
		return DeliveryExceptionCritical
	case ExceptionVehicleBreakdown, ExceptionDamagedOrder, ExceptionCashCollection, ExceptionWeatherRoadBlock:
		return DeliveryExceptionHigh
	default:
		return DeliveryExceptionMedium
	}
}

func validateDeliveryExceptionInput(input ReportDeliveryExceptionInput) error {
	input.Note = strings.TrimSpace(input.Note)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if !validDeliveryExceptionReasons[input.ReasonCode] {
		return fmt.Errorf("%w: unsupported delivery exception reason", ErrInvalid)
	}
	if input.CorrelationID == "" || len(input.CorrelationID) > 200 {
		return fmt.Errorf("%w: correlationId is required and must not exceed 200 characters", ErrInvalid)
	}
	if len(input.Note) > 1000 {
		return fmt.Errorf("%w: note must not exceed 1000 characters", ErrInvalid)
	}
	if input.ReasonCode == ExceptionOther && len(input.Note) < 5 {
		return fmt.Errorf("%w: note is required for other reason", ErrInvalid)
	}
	if (input.Latitude == nil) != (input.Longitude == nil) {
		return fmt.Errorf("%w: latitude and longitude must be supplied together", ErrInvalid)
	}
	if input.Latitude != nil && (*input.Latitude < -90 || *input.Latitude > 90) {
		return fmt.Errorf("%w: latitude must be between -90 and 90", ErrInvalid)
	}
	if input.Longitude != nil && (*input.Longitude < -180 || *input.Longitude > 180) {
		return fmt.Errorf("%w: longitude must be between -180 and 180", ErrInvalid)
	}
	return nil
}

func ReportDeliveryException(db *sql.DB, assignmentID, captainID string, input ReportDeliveryExceptionInput) (*DeliveryException, error) {
	if strings.TrimSpace(assignmentID) == "" || strings.TrimSpace(captainID) == "" {
		return nil, fmt.Errorf("%w: assignment and captain are required", ErrInvalid)
	}
	input.Note = strings.TrimSpace(input.Note)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if err := validateDeliveryExceptionInput(input); err != nil {
		return nil, err
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
	if current.OrderID == "" {
		return nil, fmt.Errorf("%w: delivery exceptions require an order-backed assignment", ErrConflict)
	}

	var tenantID string
	if err := tx.QueryRow(`SELECT tenant_id FROM dsh_orders WHERE id=$1::uuid FOR UPDATE`, current.OrderID).Scan(&tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	// Idempotency is evaluated before current-state eligibility so a retried
	// command returns its original result even after operations has moved the
	// assignment or resolved the exception.
	existing, err := getDeliveryExceptionByCorrelationTx(tx, tenantID, input.CorrelationID)
	if err == nil {
		if existing.AssignmentID != assignmentID || existing.CaptainID != captainID || existing.ReasonCode != input.ReasonCode {
			return nil, fmt.Errorf("%w: correlationId already belongs to a different exception command", ErrConflict)
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	if current.Status != AssignmentAccepted || !reportableDeliveryStatuses[current.Delivery.Status] {
		return nil, fmt.Errorf("%w: delivery exception requires an active accepted delivery", ErrConflict)
	}

	var openID string
	err = tx.QueryRow(`
		SELECT id::text FROM dsh_delivery_exceptions
		WHERE assignment_id=$1::uuid AND status IN ('open','acknowledged')
		LIMIT 1`, assignmentID).Scan(&openID)
	if err == nil {
		return nil, fmt.Errorf("%w: an active delivery exception already exists", ErrConflict)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	var id string
	err = tx.QueryRow(`
		INSERT INTO dsh_delivery_exceptions (
			tenant_id, assignment_id, order_id, captain_id, reason_code, note,
			delivery_status_at_report, severity, correlation_id,
			reported_latitude, reported_longitude
		) VALUES ($1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id::text`,
		tenantID, assignmentID, current.OrderID, captainID, string(input.ReasonCode), input.Note,
		string(current.Delivery.Status), string(severityForDeliveryException(input.ReasonCode)), input.CorrelationID,
		input.Latitude, input.Longitude,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetDeliveryException(db, id)
}

func AcknowledgeDeliveryException(db *sql.DB, id string, expectedVersion int, actorID string) (*DeliveryException, error) {
	if strings.TrimSpace(id) == "" || strings.TrimSpace(actorID) == "" || expectedVersion <= 0 {
		return nil, fmt.Errorf("%w: id, expectedVersion, and actor are required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := getDeliveryExceptionForUpdate(tx, id)
	if err != nil {
		return nil, err
	}
	if current.Status == DeliveryExceptionAcknowledged {
		return current, nil
	}
	if current.Status != DeliveryExceptionOpen {
		return nil, fmt.Errorf("%w: only an open exception can be acknowledged", ErrConflict)
	}
	if current.Version != expectedVersion {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}

	res, err := tx.Exec(`
		UPDATE dsh_delivery_exceptions
		SET status='acknowledged', acknowledged_at=NOW(), acknowledged_by_actor_id=$1,
		    version=version+1, updated_at=NOW()
		WHERE id=$2::uuid AND version=$3 AND status='open'`, actorID, id, expectedVersion)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n != 1 {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetDeliveryException(db, id)
}

func ResolveDeliveryExceptionRetrySameCaptain(db *sql.DB, id string, expectedVersion int, note, actorID string) (*DeliveryException, error) {
	note = strings.TrimSpace(note)
	if strings.TrimSpace(id) == "" || strings.TrimSpace(actorID) == "" || expectedVersion <= 0 || len(note) < 5 {
		return nil, fmt.Errorf("%w: id, expectedVersion, actor, and a resolution note are required", ErrInvalid)
	}
	if len(note) > 1000 {
		return nil, fmt.Errorf("%w: resolution note must not exceed 1000 characters", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	current, err := getDeliveryExceptionForUpdate(tx, id)
	if err != nil {
		return nil, err
	}
	if current.Status == DeliveryExceptionResolved {
		if current.ResolutionAction != nil && *current.ResolutionAction == "retry_same_captain" && current.ResolutionNote != nil && *current.ResolutionNote == note {
			return current, nil
		}
		return nil, fmt.Errorf("%w: delivery exception was already resolved differently", ErrConflict)
	}
	if current.Version != expectedVersion {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}

	var assignmentStatus AssignmentStatus
	var deliveryStatus DeliveryStatus
	if err := tx.QueryRow(`
		SELECT a.status, d.status
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id=a.id
		WHERE a.id=$1::uuid AND a.captain_id=$2
		FOR UPDATE OF a, d`, current.AssignmentID, current.CaptainID).Scan(&assignmentStatus, &deliveryStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if assignmentStatus != AssignmentAccepted || !reportableDeliveryStatuses[deliveryStatus] {
		return nil, fmt.Errorf("%w: assignment is no longer eligible for same-captain retry", ErrConflict)
	}

	res, err := tx.Exec(`
		UPDATE dsh_delivery_exceptions
		SET status='resolved', resolved_at=NOW(), resolved_by_actor_id=$1,
		    resolution_action='retry_same_captain', resolution_note=$2,
		    version=version+1, updated_at=NOW()
		WHERE id=$3::uuid AND version=$4 AND status IN ('open','acknowledged')`,
		actorID, note, id, expectedVersion)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n != 1 {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetDeliveryException(db, id)
}

func ResolveDeliveryExceptionReassignCaptain(db *sql.DB, id string, expectedVersion int, newCaptainID, note, actorID string) (*DeliveryException, error) {
	newCaptainID = strings.TrimSpace(newCaptainID)
	note = strings.TrimSpace(note)
	actorID = strings.TrimSpace(actorID)
	if strings.TrimSpace(id) == "" || expectedVersion <= 0 || newCaptainID == "" || actorID == "" || len(note) < 5 {
		return nil, fmt.Errorf("%w: id, expectedVersion, replacement captain, actor, and note are required", ErrInvalid)
	}
	if len(note) > 1000 {
		return nil, fmt.Errorf("%w: resolution note must not exceed 1000 characters", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	current, err := getDeliveryExceptionForUpdate(tx, id)
	if err != nil {
		return nil, err
	}
	if current.Status == DeliveryExceptionResolved {
		if current.ResolutionAction != nil && *current.ResolutionAction == "reassign_captain" &&
			current.ReplacementCaptainID != nil && *current.ReplacementCaptainID == newCaptainID &&
			current.ResolutionNote != nil && *current.ResolutionNote == note {
			return current, nil
		}
		return nil, fmt.Errorf("%w: delivery exception was already resolved differently", ErrConflict)
	}
	if current.Version != expectedVersion {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}
	if newCaptainID == current.CaptainID {
		return nil, fmt.Errorf("%w: replacement captain must differ from current captain", ErrInvalid)
	}

	var assignmentStatus AssignmentStatus
	var deliveryStatus DeliveryStatus
	var orderStatus string
	if err := tx.QueryRow(`
		SELECT a.status, d.status, o.status
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id=a.id
		JOIN dsh_orders o ON o.id=a.order_id
		WHERE a.id=$1::uuid AND a.captain_id=$2 AND o.id=$3::uuid
		FOR UPDATE OF a, d, o`, current.AssignmentID, current.CaptainID, current.OrderID).
		Scan(&assignmentStatus, &deliveryStatus, &orderStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if assignmentStatus != AssignmentAccepted || (deliveryStatus != DeliveryDriverAssigned && deliveryStatus != DeliveryArrivedStore) {
		return nil, fmt.Errorf("%w: reassignment is allowed only before pickup", ErrConflict)
	}

	if _, err := tx.Exec(`
		UPDATE dsh_assignments
		SET status='cancelled', updated_at=NOW()
		WHERE id=$1::uuid AND status='accepted'`, current.AssignmentID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		UPDATE dsh_deliveries
		SET status='cancelled', note=COALESCE(NULLIF(note,''), 'reassigned after delivery exception'), updated_at=NOW()
		WHERE assignment_id=$1::uuid AND status IN ('driver_assigned','driver_arrived_store')`, current.AssignmentID); err != nil {
		return nil, err
	}

	if orderStatus != "driver_assigned" {
		if _, err := tx.Exec(`UPDATE dsh_orders SET status='driver_assigned', updated_at=NOW() WHERE id=$1::uuid`, current.OrderID); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`
			INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note)
			VALUES($1::uuid,'operator',$2,'driver_assigned',$3)`, current.OrderID, orderStatus, "delivery exception reassigned to another captain"); err != nil {
			return nil, err
		}
	}

	var replacementAssignmentID string
	if err := tx.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at)
		VALUES($1::uuid,$2,$3,'offered',NOW()+INTERVAL '90 seconds')
		RETURNING id::text`, current.OrderID, newCaptainID, actorID).Scan(&replacementAssignmentID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status,note)
		VALUES($1::uuid,$2::uuid,$3,'assigned','replacement assignment after governed delivery exception')`,
		replacementAssignmentID, current.OrderID, newCaptainID); err != nil {
		return nil, err
	}

	res, err := tx.Exec(`
		UPDATE dsh_delivery_exceptions
		SET status='resolved', resolved_at=NOW(), resolved_by_actor_id=$1,
		    resolution_action='reassign_captain', resolution_note=$2,
		    replacement_assignment_id=$3::uuid, replacement_captain_id=$4,
		    version=version+1, updated_at=NOW()
		WHERE id=$5::uuid AND version=$6 AND status IN ('open','acknowledged')`,
		actorID, note, replacementAssignmentID, newCaptainID, id, expectedVersion)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n != 1 {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetDeliveryException(db, id)
}

func ResolveDeliveryExceptionReturnToStore(db *sql.DB, id string, expectedVersion int, note, actorID string) (*DeliveryException, error) {
	note = strings.TrimSpace(note)
	actorID = strings.TrimSpace(actorID)
	if strings.TrimSpace(id) == "" || expectedVersion <= 0 || actorID == "" || len(note) < 5 {
		return nil, fmt.Errorf("%w: id, expectedVersion, actor, and return note are required", ErrInvalid)
	}
	if len(note) > 1000 {
		return nil, fmt.Errorf("%w: return note must not exceed 1000 characters", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	current, err := getDeliveryExceptionForUpdate(tx, id)
	if err != nil {
		return nil, err
	}
	if current.Status == DeliveryExceptionResolved {
		if current.ResolutionAction != nil && *current.ResolutionAction == "return_to_store" && current.ResolutionNote != nil && *current.ResolutionNote == note {
			return current, nil
		}
		return nil, fmt.Errorf("%w: delivery exception was already resolved differently", ErrConflict)
	}
	if current.Version != expectedVersion {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}
	var assignmentStatus AssignmentStatus
	var deliveryStatus DeliveryStatus
	var orderStatus string
	if err := tx.QueryRow(`
		SELECT a.status,d.status,o.status
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id=a.id
		JOIN dsh_orders o ON o.id=a.order_id
		WHERE a.id=$1::uuid AND a.captain_id=$2 AND o.id=$3::uuid
		FOR UPDATE OF a,d,o`, current.AssignmentID, current.CaptainID, current.OrderID).
		Scan(&assignmentStatus, &deliveryStatus, &orderStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if assignmentStatus != AssignmentAccepted || (deliveryStatus != DeliveryPickedUp && deliveryStatus != DeliveryArrivedCustomer) {
		return nil, fmt.Errorf("%w: return-to-store is allowed only after pickup and before delivery", ErrConflict)
	}
	if _, err := tx.Exec(`UPDATE dsh_deliveries SET status='returning_to_store', note=$1, updated_at=NOW() WHERE assignment_id=$2::uuid`, note, current.AssignmentID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE dsh_orders SET status='returning_to_store', updated_at=NOW() WHERE id=$1::uuid`, current.OrderID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note) VALUES($1::uuid,'operator',$2,'returning_to_store',$3)`, current.OrderID, orderStatus, note); err != nil {
		return nil, err
	}
	res, err := tx.Exec(`
		UPDATE dsh_delivery_exceptions
		SET status='resolved', resolved_at=NOW(), resolved_by_actor_id=$1,
		    resolution_action='return_to_store', resolution_note=$2,
		    return_started_at=NOW(), version=version+1, updated_at=NOW()
		WHERE id=$3::uuid AND version=$4 AND status IN ('open','acknowledged')`, actorID, note, id, expectedVersion)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n != 1 {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetDeliveryException(db, id)
}

func CaptainArriveReturnToStore(db *sql.DB, assignmentID, captainID string) (*DeliveryException, error) {
	assignmentID = strings.TrimSpace(assignmentID)
	captainID = strings.TrimSpace(captainID)
	if assignmentID == "" || captainID == "" {
		return nil, fmt.Errorf("%w: assignment and captain are required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var assignmentStatus AssignmentStatus
	var deliveryStatus DeliveryStatus
	var orderID, orderStatus string
	if err := tx.QueryRow(`
		SELECT a.status,d.status,a.order_id::text,o.status
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id=a.id
		JOIN dsh_orders o ON o.id=a.order_id
		WHERE a.id=$1::uuid AND a.captain_id=$2
		FOR UPDATE OF a,d,o`, assignmentID, captainID).
		Scan(&assignmentStatus, &deliveryStatus, &orderID, &orderStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	row := tx.QueryRow(`
		SELECT `+deliveryExceptionColumns+`
		FROM dsh_delivery_exceptions e
		WHERE e.assignment_id=$1::uuid AND e.status='resolved'
		  AND e.resolution_action='return_to_store' AND e.returned_at IS NULL
		ORDER BY e.resolved_at DESC LIMIT 1 FOR UPDATE`, assignmentID)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if item.ReturnArrivedAt != nil {
		if orderStatus != "return_arrived_store" || deliveryStatus != DeliveryReturnArrivedStore {
			return nil, fmt.Errorf("%w: return arrival state drift", ErrConflict)
		}
		return item, nil
	}
	if assignmentStatus != AssignmentAccepted || deliveryStatus != DeliveryReturningStore || orderStatus != "returning_to_store" {
		return nil, fmt.Errorf("%w: assignment is not returning to store", ErrConflict)
	}
	if _, err := tx.Exec(`UPDATE dsh_deliveries SET status='return_arrived_store', updated_at=NOW() WHERE assignment_id=$1::uuid`, assignmentID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE dsh_orders SET status='return_arrived_store', updated_at=NOW() WHERE id=$1::uuid`, orderID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note) VALUES($1::uuid,'captain','returning_to_store','return_arrived_store','captain arrived at store with returned order')`, orderID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE dsh_delivery_exceptions SET return_arrived_at=NOW(), version=version+1, updated_at=NOW() WHERE id=$1::uuid AND return_arrived_at IS NULL`, item.ID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetDeliveryException(db, item.ID)
}

func GetPartnerReturnToStore(db *sql.DB, orderID string) (*DeliveryException, error) {
	row := db.QueryRow(`
		SELECT `+deliveryExceptionColumns+`
		FROM dsh_delivery_exceptions e
		WHERE e.order_id=$1::uuid AND e.status='resolved' AND e.resolution_action='return_to_store'
		ORDER BY e.resolved_at DESC LIMIT 1`, orderID)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return item, err
}

func AcceptReturnToStoreByPartner(db *sql.DB, orderID, actorID string) (*DeliveryException, error) {
	orderID = strings.TrimSpace(orderID)
	actorID = strings.TrimSpace(actorID)
	if orderID == "" || actorID == "" {
		return nil, fmt.Errorf("%w: order and partner actor are required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	row := tx.QueryRow(`
		SELECT `+deliveryExceptionColumns+`
		FROM dsh_delivery_exceptions e
		WHERE e.order_id=$1::uuid AND e.status='resolved' AND e.resolution_action='return_to_store'
		ORDER BY e.resolved_at DESC LIMIT 1 FOR UPDATE`, orderID)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if item.ReturnedAt != nil {
		return item, nil
	}
	if item.ReturnArrivedAt == nil {
		return nil, fmt.Errorf("%w: captain has not arrived at the store with the return", ErrConflict)
	}

	var assignmentStatus AssignmentStatus
	var deliveryStatus DeliveryStatus
	var orderStatus string
	if err := tx.QueryRow(`
		SELECT a.status,d.status,o.status
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id=a.id
		JOIN dsh_orders o ON o.id=a.order_id
		WHERE a.id=$1::uuid AND o.id=$2::uuid
		FOR UPDATE OF a,d,o`, item.AssignmentID, orderID).
		Scan(&assignmentStatus, &deliveryStatus, &orderStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if assignmentStatus != AssignmentAccepted || deliveryStatus != DeliveryReturnArrivedStore || orderStatus != "return_arrived_store" {
		return nil, fmt.Errorf("%w: returned order is not awaiting store receipt", ErrConflict)
	}
	if _, err := tx.Exec(`UPDATE dsh_deliveries SET status='returned_to_store', updated_at=NOW() WHERE assignment_id=$1::uuid`, item.AssignmentID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE dsh_assignments SET status='completed', completed_at=NOW(), updated_at=NOW() WHERE id=$1::uuid`, item.AssignmentID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE dsh_orders SET status='returned_to_store', updated_at=NOW() WHERE id=$1::uuid`, orderID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note) VALUES($1::uuid,'partner','return_arrived_store','returned_to_store','store accepted returned order custody')`, orderID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE dsh_delivery_exceptions SET returned_at=NOW(), return_accepted_by_actor_id=$1, version=version+1, updated_at=NOW() WHERE id=$2::uuid AND returned_at IS NULL`, actorID, item.ID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetDeliveryException(db, item.ID)
}

func getDeliveryExceptionForUpdate(tx *sql.Tx, id string) (*DeliveryException, error) {
	row := tx.QueryRow(`SELECT `+deliveryExceptionColumns+` FROM dsh_delivery_exceptions e WHERE e.id=$1::uuid FOR UPDATE`, id)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return item, err
}

func ensureNoOpenDeliveryException(tx *sql.Tx, assignmentID string) error {
	var exists bool
	if err := tx.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM dsh_delivery_exceptions
			WHERE assignment_id=$1::uuid AND status IN ('open','acknowledged')
		)`, assignmentID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("%w: delivery exception requires operations resolution", ErrConflict)
	}
	return nil
}

func GetCaptainOpenDeliveryException(db *sql.DB, assignmentID, captainID string) (*DeliveryException, error) {
	row := db.QueryRow(`
		SELECT `+deliveryExceptionColumns+`
		FROM dsh_delivery_exceptions e
		JOIN dsh_assignments a ON a.id=e.assignment_id
		WHERE e.assignment_id=$1::uuid AND a.captain_id=$2 AND (e.status IN ('open','acknowledged') OR (e.status='resolved' AND e.resolution_action='return_to_store' AND e.returned_at IS NULL))
		ORDER BY e.reported_at DESC LIMIT 1`, assignmentID, captainID)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return item, err
}

func GetDeliveryException(db *sql.DB, id string) (*DeliveryException, error) {
	row := db.QueryRow(`SELECT `+deliveryExceptionColumns+` FROM dsh_delivery_exceptions e WHERE e.id=$1::uuid`, id)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return item, err
}

func ListOperatorDeliveryExceptions(db *sql.DB, status DeliveryExceptionStatus, limit int) ([]DeliveryException, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	if status == "" {
		status = DeliveryExceptionOpen
	}
	if status != DeliveryExceptionOpen && status != DeliveryExceptionAcknowledged && status != DeliveryExceptionResolved {
		return nil, fmt.Errorf("%w: invalid delivery exception status", ErrInvalid)
	}
	rows, err := db.Query(`
		SELECT `+deliveryExceptionColumns+`
		FROM dsh_delivery_exceptions e
		WHERE e.status=$1
		ORDER BY CASE e.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, e.reported_at ASC
		LIMIT $2`, string(status), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]DeliveryException, 0)
	for rows.Next() {
		item, err := scanDeliveryException(rows.Scan)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, rows.Err()
}

const deliveryExceptionColumns = `
	e.id::text, e.tenant_id, e.assignment_id::text, e.order_id::text, e.captain_id,
	e.reason_code, e.note, e.delivery_status_at_report, e.severity, e.status,
	e.correlation_id, e.reported_latitude, e.reported_longitude, e.reported_at,
	e.acknowledged_at, e.acknowledged_by_actor_id, e.resolved_at, e.resolved_by_actor_id, e.resolution_action,
	e.resolution_note, e.replacement_assignment_id::text, e.replacement_captain_id, e.return_started_at, e.return_arrived_at, e.returned_at, e.return_accepted_by_actor_id, e.version, e.created_at, e.updated_at`

type deliveryExceptionScanner func(dest ...any) error

func scanDeliveryException(scan deliveryExceptionScanner) (*DeliveryException, error) {
	var item DeliveryException
	err := scan(
		&item.ID, &item.TenantID, &item.AssignmentID, &item.OrderID, &item.CaptainID,
		&item.ReasonCode, &item.Note, &item.DeliveryStatusAtReport, &item.Severity, &item.Status,
		&item.CorrelationID, &item.ReportedLatitude, &item.ReportedLongitude, &item.ReportedAt,
		&item.AcknowledgedAt, &item.AcknowledgedByActorID, &item.ResolvedAt, &item.ResolvedByActorID, &item.ResolutionAction,
		&item.ResolutionNote, &item.ReplacementAssignmentID, &item.ReplacementCaptainID, &item.ReturnStartedAt, &item.ReturnArrivedAt, &item.ReturnedAt, &item.ReturnAcceptedByActorID, &item.Version, &item.CreatedAt, &item.UpdatedAt,
	)
	return &item, err
}

func getDeliveryExceptionByCorrelationTx(tx *sql.Tx, tenantID, correlationID string) (*DeliveryException, error) {
	row := tx.QueryRow(`SELECT `+deliveryExceptionColumns+` FROM dsh_delivery_exceptions e WHERE e.tenant_id=$1 AND e.correlation_id=$2`, tenantID, correlationID)
	return scanDeliveryException(row.Scan)
}
