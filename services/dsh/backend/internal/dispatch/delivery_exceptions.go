package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
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
	ID                     string
	TenantID               string
	AssignmentID           string
	OrderID                string
	CaptainID              string
	ReasonCode             DeliveryExceptionReasonCode
	Note                   string
	DeliveryStatusAtReport DeliveryStatus
	Severity               DeliveryExceptionSeverity
	Status                 DeliveryExceptionStatus
	CorrelationID          string
	ReportedLatitude       *float64
	ReportedLongitude      *float64
	ReportedAt             time.Time
	AcknowledgedAt         *time.Time
	ResolvedAt             *time.Time
	ResolvedByActorID      *string
	ResolutionAction       *string
	ResolutionNote         *string
	Version                int
	CreatedAt              time.Time
	UpdatedAt              time.Time
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
	if current.Status != AssignmentAccepted || !reportableDeliveryStatuses[current.Delivery.Status] {
		return nil, fmt.Errorf("%w: delivery exception requires an active accepted delivery", ErrConflict)
	}

	var tenantID string
	if err := tx.QueryRow(`SELECT tenant_id FROM dsh_orders WHERE id=$1::uuid FOR UPDATE`, current.OrderID).Scan(&tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

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
		WHERE e.assignment_id=$1::uuid AND a.captain_id=$2 AND e.status IN ('open','acknowledged')
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
	e.acknowledged_at, e.resolved_at, e.resolved_by_actor_id, e.resolution_action,
	e.resolution_note, e.version, e.created_at, e.updated_at`

type deliveryExceptionScanner func(dest ...any) error

func scanDeliveryException(scan deliveryExceptionScanner) (*DeliveryException, error) {
	var item DeliveryException
	err := scan(
		&item.ID, &item.TenantID, &item.AssignmentID, &item.OrderID, &item.CaptainID,
		&item.ReasonCode, &item.Note, &item.DeliveryStatusAtReport, &item.Severity, &item.Status,
		&item.CorrelationID, &item.ReportedLatitude, &item.ReportedLongitude, &item.ReportedAt,
		&item.AcknowledgedAt, &item.ResolvedAt, &item.ResolvedByActorID, &item.ResolutionAction,
		&item.ResolutionNote, &item.Version, &item.CreatedAt, &item.UpdatedAt,
	)
	return &item, err
}

func getDeliveryExceptionByCorrelationTx(tx *sql.Tx, tenantID, correlationID string) (*DeliveryException, error) {
	row := tx.QueryRow(`SELECT `+deliveryExceptionColumns+` FROM dsh_delivery_exceptions e WHERE e.tenant_id=$1 AND e.correlation_id=$2`, tenantID, correlationID)
	return scanDeliveryException(row.Scan)
}
