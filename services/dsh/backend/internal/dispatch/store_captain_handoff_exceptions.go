package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

const (
	ExceptionHandoffShortage DeliveryExceptionReasonCode = "handoff_shortage"
	ExceptionHandoffMismatch DeliveryExceptionReasonCode = "handoff_mismatch"
)

type StoreCaptainHandoffExceptionReporterRole string

const (
	HandoffExceptionReporterCaptain StoreCaptainHandoffExceptionReporterRole = "captain"
	HandoffExceptionReporterPartner StoreCaptainHandoffExceptionReporterRole = "partner"
)

func isStoreCaptainHandoffExceptionReason(reason DeliveryExceptionReasonCode) bool {
	return reason == ExceptionHandoffShortage || reason == ExceptionHandoffMismatch
}

func validateStoreCaptainHandoffExceptionInput(input ReportDeliveryExceptionInput) error {
	input.Note = strings.TrimSpace(input.Note)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if !isStoreCaptainHandoffExceptionReason(input.ReasonCode) {
		return fmt.Errorf("%w: unsupported store-captain handoff exception reason", ErrInvalid)
	}
	if input.CorrelationID == "" || len(input.CorrelationID) > 200 {
		return fmt.Errorf("%w: correlationId is required and must not exceed 200 characters", ErrInvalid)
	}
	if len(input.Note) < 5 || len(input.Note) > 1000 {
		return fmt.Errorf("%w: handoff exception note must be between 5 and 1000 characters", ErrInvalid)
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

func ReportCaptainStoreCaptainHandoffException(
	db *sql.DB,
	assignmentID string,
	captainID string,
	input ReportDeliveryExceptionInput,
) (*DeliveryException, error) {
	return reportStoreCaptainHandoffException(
		db,
		assignmentID,
		"",
		captainID,
		captainID,
		HandoffExceptionReporterCaptain,
		input,
	)
}

func ReportPartnerStoreCaptainHandoffException(
	db *sql.DB,
	orderID string,
	storeID string,
	actorID string,
	input ReportDeliveryExceptionInput,
) (*DeliveryException, error) {
	if strings.TrimSpace(orderID) == "" || strings.TrimSpace(storeID) == "" {
		return nil, fmt.Errorf("%w: order and store are required", ErrInvalid)
	}

	var assignmentID, captainID string
	err := db.QueryRow(`
		SELECT h.assignment_id::text, h.captain_id
		FROM dsh_store_captain_handoffs h
		JOIN dsh_assignments a ON a.id = h.assignment_id
		WHERE h.order_id = $1::uuid
		  AND h.store_id = $2
		  AND h.status IN ('awaiting_partner', 'partner_confirmed')
		  AND a.status = 'accepted'
		ORDER BY h.created_at DESC
		LIMIT 1`, orderID, storeID).Scan(&assignmentID, &captainID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return reportStoreCaptainHandoffException(
		db,
		assignmentID,
		storeID,
		captainID,
		actorID,
		HandoffExceptionReporterPartner,
		input,
	)
}

func reportStoreCaptainHandoffException(
	db *sql.DB,
	assignmentID string,
	expectedStoreID string,
	expectedCaptainID string,
	reporterActorID string,
	reporterRole StoreCaptainHandoffExceptionReporterRole,
	input ReportDeliveryExceptionInput,
) (*DeliveryException, error) {
	assignmentID = strings.TrimSpace(assignmentID)
	expectedStoreID = strings.TrimSpace(expectedStoreID)
	expectedCaptainID = strings.TrimSpace(expectedCaptainID)
	reporterActorID = strings.TrimSpace(reporterActorID)
	input.Note = strings.TrimSpace(input.Note)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if assignmentID == "" || expectedCaptainID == "" || reporterActorID == "" {
		return nil, fmt.Errorf("%w: assignment, captain, and reporter are required", ErrInvalid)
	}
	if reporterRole != HandoffExceptionReporterCaptain && reporterRole != HandoffExceptionReporterPartner {
		return nil, fmt.Errorf("%w: unsupported handoff exception reporter role", ErrInvalid)
	}
	if err := validateStoreCaptainHandoffExceptionInput(input); err != nil {
		return nil, err
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var orderID, storeID, captainID, assignmentStatus, deliveryStatus, handoffStatus, tenantID string
	err = tx.QueryRow(`
		SELECT o.id::text, o.store_id, o.tenant_id,
		       a.captain_id, a.status, d.status, h.status
		FROM dsh_store_captain_handoffs h
		JOIN dsh_assignments a ON a.id = h.assignment_id
		JOIN dsh_deliveries d ON d.assignment_id = a.id
		JOIN dsh_orders o ON o.id = h.order_id
		WHERE h.assignment_id = $1::uuid
		FOR UPDATE OF h, a, d, o`, assignmentID).Scan(
		&orderID,
		&storeID,
		&tenantID,
		&captainID,
		&assignmentStatus,
		&deliveryStatus,
		&handoffStatus,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if expectedStoreID != "" && storeID != expectedStoreID {
		return nil, ErrNotFound
	}
	if captainID != expectedCaptainID {
		return nil, ErrNotFound
	}
	if assignmentStatus != string(AssignmentAccepted) || deliveryStatus != string(DeliveryArrivedStore) {
		return nil, fmt.Errorf("%w: handoff exception requires an accepted captain at the store", ErrConflict)
	}
	if handoffStatus != "awaiting_partner" && handoffStatus != "partner_confirmed" {
		return nil, fmt.Errorf("%w: handoff attempt is not open", ErrConflict)
	}

	existing, err := getDeliveryExceptionByCorrelationTx(tx, tenantID, input.CorrelationID)
	if err == nil {
		if existing.AssignmentID != assignmentID || existing.ReasonCode != input.ReasonCode {
			return nil, fmt.Errorf("%w: correlationId already belongs to a different exception command", ErrConflict)
		}
		var recordedActorID, recordedRole string
		if err = tx.QueryRow(`
			SELECT actor_id, actor_role
			FROM dsh_delivery_exception_reporters
			WHERE exception_id = $1::uuid`, existing.ID).Scan(&recordedActorID, &recordedRole); err != nil {
			return nil, err
		}
		if recordedActorID != reporterActorID || recordedRole != string(reporterRole) {
			return nil, fmt.Errorf("%w: correlationId already belongs to another reporter", ErrConflict)
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	var openID string
	err = tx.QueryRow(`
		SELECT id::text
		FROM dsh_delivery_exceptions
		WHERE assignment_id = $1::uuid
		  AND status IN ('open', 'acknowledged')
		LIMIT 1`, assignmentID).Scan(&openID)
	if err == nil {
		return nil, fmt.Errorf("%w: an active delivery exception already exists", ErrConflict)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	var exceptionID string
	err = tx.QueryRow(`
		INSERT INTO dsh_delivery_exceptions (
			tenant_id,
			assignment_id,
			order_id,
			captain_id,
			reason_code,
			note,
			delivery_status_at_report,
			severity,
			correlation_id,
			reported_latitude,
			reported_longitude
		) VALUES (
			$1,
			$2::uuid,
			$3::uuid,
			$4,
			$5,
			$6,
			$7,
			'high',
			$8,
			$9,
			$10
		)
		RETURNING id::text`,
		tenantID,
		assignmentID,
		orderID,
		captainID,
		string(input.ReasonCode),
		input.Note,
		deliveryStatus,
		input.CorrelationID,
		input.Latitude,
		input.Longitude,
	).Scan(&exceptionID)
	if err != nil {
		return nil, err
	}

	result, err := tx.Exec(`
		UPDATE dsh_delivery_exception_reporters
		SET actor_id = $1,
		    actor_role = $2,
		    reported_at = NOW()
		WHERE exception_id = $3::uuid`, reporterActorID, string(reporterRole), exceptionID)
	if err != nil {
		return nil, err
	}
	if rows, rowsErr := result.RowsAffected(); rowsErr != nil {
		return nil, rowsErr
	} else if rows != 1 {
		return nil, fmt.Errorf("store-captain handoff exception reporter was not recorded")
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetDeliveryException(db, exceptionID)
}
