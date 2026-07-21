package dispatch

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/orders"

	"github.com/lib/pq"
)

const DefaultDispatchTenantID = "default"

var (
	ErrCaptainNotEligible = errors.New("captain is not eligible for dispatch")
	ErrCaptainAtCapacity  = errors.New("captain dispatch capacity reached")
	ErrOfferExpired       = errors.New("dispatch offer expired")
)

type GovernedCreateAssignmentInput struct {
	OrderID               string
	TenantID              string
	CaptainID             string
	ActorID               string
	ServiceAreaCode       string
	IdempotencyKey        string
	Priority              int
	DistanceMeters        *int
	OfferReason           string
	ResponseTimeoutSecond int
	SupersedesAssignmentID string
}

type CaptainDispatchProfileInput struct {
	TenantID            string
	CaptainID           string
	AccreditationStatus string
	AvailabilityStatus  string
	MaxActiveAssignments int
	PriorityScore       int
	ExpectedVersion     int
	ActorID             string
}

type CaptainDispatchCandidate struct {
	TenantID             string `json:"tenantId"`
	CaptainID            string `json:"captainId"`
	ServiceAreaCode      string `json:"serviceAreaCode"`
	AccreditationStatus  string `json:"accreditationStatus"`
	AvailabilityStatus   string `json:"availabilityStatus"`
	MaxActiveAssignments int    `json:"maxActiveAssignments"`
	ActiveAssignments    int    `json:"activeAssignments"`
	RemainingCapacity    int    `json:"remainingCapacity"`
	PriorityScore        int    `json:"priorityScore"`
	Eligible             bool   `json:"eligible"`
	IneligibilityReason  string `json:"ineligibilityReason,omitempty"`
	Version              int    `json:"version"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type DispatchDecision struct {
	ID           string          `json:"id"`
	TenantID     string          `json:"tenantId"`
	AssignmentID string          `json:"assignmentId,omitempty"`
	OrderID      string          `json:"orderId,omitempty"`
	CaptainID    string          `json:"captainId,omitempty"`
	Action       string          `json:"action"`
	ReasonCode   string          `json:"reasonCode,omitempty"`
	Reason       string          `json:"reason,omitempty"`
	ActorID      string          `json:"actorId"`
	ActorRole    string          `json:"actorRole"`
	Metadata     json.RawMessage `json:"metadata"`
	CreatedAt    time.Time       `json:"createdAt"`
}

type ReassignAssignmentInput struct {
	AssignmentID         string
	TenantID             string
	CaptainID            string
	ActorID              string
	ServiceAreaCode      string
	IdempotencyKey       string
	Priority             int
	DistanceMeters       *int
	Reason               string
	ResponseTimeoutSecond int
}

func normalizeTenantID(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return DefaultDispatchTenantID
	}
	return value
}

func validateGovernedCreateInput(input *GovernedCreateAssignmentInput) error {
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.TenantID = normalizeTenantID(input.TenantID)
	input.CaptainID = strings.TrimSpace(input.CaptainID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ServiceAreaCode = strings.TrimSpace(input.ServiceAreaCode)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.OfferReason = strings.TrimSpace(input.OfferReason)
	input.SupersedesAssignmentID = strings.TrimSpace(input.SupersedesAssignmentID)
	if input.ResponseTimeoutSecond == 0 {
		input.ResponseTimeoutSecond = 90
	}
	if input.OrderID == "" || input.CaptainID == "" || input.ActorID == "" || input.ServiceAreaCode == "" {
		return fmt.Errorf("%w: orderId, captainId, actorId, and serviceAreaCode are required", ErrInvalid)
	}
	if len(input.IdempotencyKey) < 16 || len(input.IdempotencyKey) > 200 {
		return fmt.Errorf("%w: idempotencyKey must contain 16 to 200 characters", ErrInvalid)
	}
	if input.Priority < 0 || input.Priority > 100 {
		return fmt.Errorf("%w: priority must be between 0 and 100", ErrInvalid)
	}
	if input.DistanceMeters != nil && *input.DistanceMeters < 0 {
		return fmt.Errorf("%w: distanceMeters cannot be negative", ErrInvalid)
	}
	if input.ResponseTimeoutSecond < 30 || input.ResponseTimeoutSecond > 600 {
		return fmt.Errorf("%w: responseTimeoutSeconds must be between 30 and 600", ErrInvalid)
	}
	return nil
}

func UpsertCaptainDispatchProfile(db *sql.DB, input CaptainDispatchProfileInput) (*CaptainDispatchCandidate, error) {
	input.TenantID = normalizeTenantID(input.TenantID)
	input.CaptainID = strings.TrimSpace(input.CaptainID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.AccreditationStatus = strings.TrimSpace(input.AccreditationStatus)
	input.AvailabilityStatus = strings.TrimSpace(input.AvailabilityStatus)
	if input.CaptainID == "" || input.ActorID == "" {
		return nil, fmt.Errorf("%w: captainId and actorId are required", ErrInvalid)
	}
	if input.AccreditationStatus == "" {
		input.AccreditationStatus = "pending"
	}
	if input.AvailabilityStatus == "" {
		input.AvailabilityStatus = "offline"
	}
	if input.MaxActiveAssignments == 0 {
		input.MaxActiveAssignments = 1
	}
	if input.MaxActiveAssignments < 1 || input.MaxActiveAssignments > 20 || input.PriorityScore < 0 || input.PriorityScore > 1000 {
		return nil, fmt.Errorf("%w: invalid capacity or priority score", ErrInvalid)
	}
	var version int
	err := db.QueryRow(`
		INSERT INTO dsh_captain_dispatch_profiles (
			tenant_id, captain_id, accreditation_status, availability_status,
			max_active_assignments, priority_score, updated_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (tenant_id, captain_id) DO UPDATE SET
			accreditation_status=EXCLUDED.accreditation_status,
			availability_status=EXCLUDED.availability_status,
			max_active_assignments=EXCLUDED.max_active_assignments,
			priority_score=EXCLUDED.priority_score,
			updated_by=EXCLUDED.updated_by,
			version=dsh_captain_dispatch_profiles.version+1,
			updated_at=NOW()
		WHERE $8=0 OR dsh_captain_dispatch_profiles.version=$8
		RETURNING version`,
		input.TenantID, input.CaptainID, input.AccreditationStatus, input.AvailabilityStatus,
		input.MaxActiveAssignments, input.PriorityScore, input.ActorID, input.ExpectedVersion,
	).Scan(&version)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: captain profile version changed", ErrConflict)
	}
	if err != nil {
		return nil, err
	}
	candidate, err := getCaptainCandidate(db, input.TenantID, input.CaptainID, "")
	if candidate != nil {
		candidate.Version = version
	}
	return candidate, err
}

func ListCaptainDispatchCandidates(db *sql.DB, tenantID, serviceAreaCode string, limit int) ([]CaptainDispatchCandidate, error) {
	tenantID = normalizeTenantID(tenantID)
	serviceAreaCode = strings.TrimSpace(serviceAreaCode)
	if serviceAreaCode == "" {
		return nil, fmt.Errorf("%w: serviceAreaCode is required", ErrInvalid)
	}
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := db.Query(`
		SELECT p.tenant_id, p.captain_id, s.service_area_code,
		       p.accreditation_status, p.availability_status,
		       p.max_active_assignments,
		       COUNT(a.id) FILTER (WHERE a.status='accepted' OR (a.status='offered' AND a.response_deadline_at>NOW()))::int,
		       p.priority_score, p.version, p.updated_at
		FROM dsh_captain_dispatch_profiles p
		JOIN dsh_actor_service_area_scopes s
		  ON s.actor_id=p.captain_id AND s.actor_role='captain' AND s.active=true
		 AND s.service_area_code=$2
		LEFT JOIN dsh_assignments a
		  ON a.tenant_id=p.tenant_id AND a.captain_id=p.captain_id
		 AND (a.status='accepted' OR (a.status='offered' AND a.response_deadline_at>NOW()))
		WHERE p.tenant_id=$1
		GROUP BY p.tenant_id,p.captain_id,s.service_area_code,p.accreditation_status,
		         p.availability_status,p.max_active_assignments,p.priority_score,p.version,p.updated_at
		ORDER BY
		  CASE WHEN p.accreditation_status='approved' AND p.availability_status='available' THEN 0 ELSE 1 END,
		  p.priority_score DESC,
		  COUNT(a.id) ASC,
		  p.updated_at DESC
		LIMIT $3`, tenantID, serviceAreaCode, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]CaptainDispatchCandidate, 0)
	for rows.Next() {
		var item CaptainDispatchCandidate
		if err = rows.Scan(&item.TenantID, &item.CaptainID, &item.ServiceAreaCode,
			&item.AccreditationStatus, &item.AvailabilityStatus,
			&item.MaxActiveAssignments, &item.ActiveAssignments,
			&item.PriorityScore, &item.Version, &item.UpdatedAt); err != nil {
			return nil, err
		}
		finalizeCandidate(&item)
		items = append(items, item)
	}
	return items, rows.Err()
}

func getCaptainCandidate(db *sql.DB, tenantID, captainID, serviceAreaCode string) (*CaptainDispatchCandidate, error) {
	if serviceAreaCode == "" {
		err := db.QueryRow(`
			SELECT service_area_code FROM dsh_actor_service_area_scopes
			WHERE actor_id=$1 AND actor_role='captain' AND active=true
			ORDER BY service_area_code LIMIT 1`, captainID).Scan(&serviceAreaCode)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCaptainNotEligible
		}
		if err != nil {
			return nil, err
		}
	}
	items, err := ListCaptainDispatchCandidates(db, tenantID, serviceAreaCode, 200)
	if err != nil {
		return nil, err
	}
	for i := range items {
		if items[i].CaptainID == captainID {
			return &items[i], nil
		}
	}
	return nil, ErrCaptainNotEligible
}

func finalizeCandidate(item *CaptainDispatchCandidate) {
	item.RemainingCapacity = item.MaxActiveAssignments - item.ActiveAssignments
	item.Eligible = item.AccreditationStatus == "approved" && item.AvailabilityStatus == "available" && item.RemainingCapacity > 0
	switch {
	case item.AccreditationStatus != "approved":
		item.IneligibilityReason = "CAPTAIN_NOT_ACCREDITED"
	case item.AvailabilityStatus != "available":
		item.IneligibilityReason = "CAPTAIN_NOT_AVAILABLE"
	case item.RemainingCapacity <= 0:
		item.IneligibilityReason = "CAPTAIN_AT_CAPACITY"
	}
}

func validateCaptainForAssignmentTx(tx *sql.Tx, tenantID, captainID, serviceAreaCode string) error {
	var accreditation, availability string
	var maxActive, active int
	err := tx.QueryRow(`
		SELECT p.accreditation_status, p.availability_status, p.max_active_assignments,
		       COUNT(a.id) FILTER (WHERE a.status='accepted' OR (a.status='offered' AND a.response_deadline_at>NOW()))::int
		FROM dsh_captain_dispatch_profiles p
		JOIN dsh_actor_service_area_scopes s
		  ON s.actor_id=p.captain_id AND s.actor_role='captain' AND s.active=true
		 AND s.service_area_code=$3
		LEFT JOIN dsh_assignments a
		  ON a.tenant_id=p.tenant_id AND a.captain_id=p.captain_id
		 AND (a.status='accepted' OR (a.status='offered' AND a.response_deadline_at>NOW()))
		WHERE p.tenant_id=$1 AND p.captain_id=$2
		GROUP BY p.accreditation_status,p.availability_status,p.max_active_assignments`,
		tenantID, captainID, serviceAreaCode).Scan(&accreditation, &availability, &maxActive, &active)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrCaptainNotEligible
	}
	if err != nil {
		return err
	}
	if accreditation != "approved" || availability != "available" {
		return ErrCaptainNotEligible
	}
	if active >= maxActive {
		return ErrCaptainAtCapacity
	}
	return nil
}

func CreateGovernedAssignment(db *sql.DB, input GovernedCreateAssignmentInput) (*Assignment, bool, error) {
	if err := validateGovernedCreateInput(&input); err != nil {
		return nil, false, err
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, input.TenantID+"|dispatch|"+input.OrderID); err != nil {
		return nil, false, err
	}

	var existingID, existingCaptainID string
	err = tx.QueryRow(`
		SELECT id::text, captain_id FROM dsh_assignments
		WHERE tenant_id=$1 AND idempotency_key=$2`, input.TenantID, input.IdempotencyKey,
	).Scan(&existingID, &existingCaptainID)
	if err == nil {
		row := tx.QueryRow(assignmentSelectSQL()+` WHERE a.id=$1::uuid AND a.captain_id=$2`, existingID, existingCaptainID)
		item, readErr := scanAssignmentRowWithDelivery(row)
		if readErr != nil {
			return nil, false, readErr
		}
		if item.OrderID != input.OrderID || item.CaptainID != input.CaptainID {
			return nil, false, fmt.Errorf("%w: idempotency key belongs to another dispatch request", ErrConflict)
		}
		if err = tx.Commit(); err != nil {
			return nil, false, err
		}
		return item, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	var fulfillmentMode, orderTenant string
	err = tx.QueryRow(`SELECT fulfillment_mode, tenant_id FROM dsh_orders WHERE id=$1::uuid FOR UPDATE`, input.OrderID).Scan(&fulfillmentMode, &orderTenant)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, ErrNotFound
	}
	if err != nil {
		return nil, false, err
	}
	if orderTenant != input.TenantID || fulfillmentMode != "bthwani_delivery" {
		return nil, false, fmt.Errorf("%w: order is not eligible for platform-captain dispatch", ErrConflict)
	}
	if err = validateCaptainForAssignmentTx(tx, input.TenantID, input.CaptainID, input.ServiceAreaCode); err != nil {
		action := "eligibility_rejected"
		if errors.Is(err, ErrCaptainAtCapacity) {
			action = "capacity_rejected"
		}
		_ = insertDispatchDecisionTx(tx, input.TenantID, "", input.OrderID, input.CaptainID, action, dispatchErrorCode(err), err.Error(), input.ActorID, "operator", nil)
		return nil, false, err
	}

	var activeAssignmentID string
	err = tx.QueryRow(`
		SELECT id::text FROM dsh_assignments
		WHERE tenant_id=$1 AND order_id=$2::uuid
		  AND (status='accepted' OR (status='offered' AND response_deadline_at>NOW()))
		ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, input.TenantID, input.OrderID,
	).Scan(&activeAssignmentID)
	if err == nil {
		return nil, false, fmt.Errorf("%w: order already has active assignment %s", ErrConflict, activeAssignmentID)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	if _, err = orders.TransitionDispatchOrder(tx, input.OrderID, "operator",
		[]orders.OrderStatus{orders.StatusReadyForPickup}, orders.StatusDriverAssigned, "captain offer created"); err != nil {
		return nil, false, mapOrderError(err)
	}

	assignment, err := scanAssignmentRow(tx.QueryRow(`
		INSERT INTO dsh_assignments (
			order_id,captain_id,assigned_by,status,response_deadline_at,
			tenant_id,service_area_code,idempotency_key,priority,distance_meters,
			offer_reason,supersedes_assignment_id
		) VALUES (
			$1::uuid,$2,$3,$4,NOW()+($5*INTERVAL '1 second'),
			$6,$7,$8,$9,$10,NULLIF($11,''),NULLIF($12,'')::uuid
		)
		RETURNING id::text, order_id::text, captain_id, assigned_by, status,
		          response_deadline_at, accepted_at, declined_at, completed_at, created_at, updated_at`,
		input.OrderID, input.CaptainID, input.ActorID, string(AssignmentOffered), input.ResponseTimeoutSecond,
		input.TenantID, input.ServiceAreaCode, input.IdempotencyKey, input.Priority, input.DistanceMeters,
		input.OfferReason, input.SupersedesAssignmentID,
	))
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, false, fmt.Errorf("%w: duplicate governed dispatch request", ErrConflict)
		}
		return nil, false, err
	}
	delivery, err := scanDeliveryRow(tx.QueryRow(`
		INSERT INTO dsh_deliveries (assignment_id,order_id,captain_id,status)
		VALUES ($1::uuid,$2::uuid,$3,$4)
		RETURNING id::text,assignment_id::text,order_id::text,captain_id,status,
		          COALESCE(pod_method,''),COALESCE(pod_reference,''),COALESCE(note,''),created_at,updated_at`,
		assignment.ID, input.OrderID, input.CaptainID, string(DeliveryAssigned),
	))
	if err != nil {
		return nil, false, err
	}
	assignment.Delivery = *delivery
	metadata := map[string]any{
		"serviceAreaCode": input.ServiceAreaCode,
		"priority": input.Priority,
		"responseTimeoutSeconds": input.ResponseTimeoutSecond,
	}
	if input.DistanceMeters != nil {
		metadata["distanceMeters"] = *input.DistanceMeters
	}
	if err = insertDispatchDecisionTx(tx, input.TenantID, assignment.ID, input.OrderID, input.CaptainID,
		"offered", "OFFER_CREATED", input.OfferReason, input.ActorID, "operator", metadata); err != nil {
		return nil, false, err
	}
	if err = tx.Commit(); err != nil {
		return nil, false, err
	}
	return assignment, false, nil
}

func AcceptGovernedAssignment(db *sql.DB, assignmentID, captainID string) (*Assignment, error) {
	assignmentID = strings.TrimSpace(assignmentID)
	captainID = strings.TrimSpace(captainID)
	if assignmentID == "" || captainID == "" {
		return nil, fmt.Errorf("%w: assignmentId and captainId are required", ErrInvalid)
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
	var tenantID string
	if err = tx.QueryRow(`SELECT tenant_id FROM dsh_assignments WHERE id=$1::uuid`, assignmentID).Scan(&tenantID); err != nil {
		return nil, err
	}
	if current.Status != AssignmentOffered {
		return nil, fmt.Errorf("%w: assignment already actioned", ErrConflict)
	}
	if !current.ResponseDeadlineAt.After(time.Now().UTC()) {
		if err = expireAssignmentTx(tx, tenantID, current, "captain", captainID, "OFFER_TIMEOUT", "captain responded after deadline"); err != nil {
			return nil, err
		}
		if err = tx.Commit(); err != nil {
			return nil, err
		}
		return nil, ErrOfferExpired
	}
	if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "captain",
		[]orders.OrderStatus{orders.StatusDriverAssigned}, orders.StatusDriverAssigned, "captain accepted assignment"); err != nil {
		return nil, mapOrderError(err)
	}
	if _, err = tx.Exec(`
		UPDATE dsh_assignments SET status='accepted',accepted_at=NOW(),response_reason='accepted',version=version+1,updated_at=NOW()
		WHERE id=$1::uuid AND captain_id=$2`, assignmentID, captainID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE dsh_deliveries SET status=$1,updated_at=NOW() WHERE assignment_id=$2::uuid`, string(DeliveryDriverAssigned), assignmentID); err != nil {
		return nil, err
	}
	if err = insertDispatchDecisionTx(tx, tenantID, assignmentID, current.OrderID, captainID,
		"accepted", "CAPTAIN_ACCEPTED", "", captainID, "captain", nil); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignment(db, assignmentID, captainID)
}

func DeclineGovernedAssignment(db *sql.DB, assignmentID, captainID, reasonCode, reason string) (*Assignment, error) {
	assignmentID = strings.TrimSpace(assignmentID)
	captainID = strings.TrimSpace(captainID)
	reasonCode = strings.TrimSpace(reasonCode)
	reason = strings.TrimSpace(reason)
	if assignmentID == "" || captainID == "" || reasonCode == "" || reason == "" {
		return nil, fmt.Errorf("%w: assignmentId, captainId, reasonCode, and reason are required", ErrInvalid)
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
	var tenantID string
	if err = tx.QueryRow(`SELECT tenant_id FROM dsh_assignments WHERE id=$1::uuid`, assignmentID).Scan(&tenantID); err != nil {
		return nil, err
	}
	if current.Status != AssignmentOffered {
		return nil, fmt.Errorf("%w: assignment already actioned", ErrConflict)
	}
	if !current.ResponseDeadlineAt.After(time.Now().UTC()) {
		if err = expireAssignmentTx(tx, tenantID, current, "captain", captainID, "OFFER_TIMEOUT", reason); err != nil {
			return nil, err
		}
		if err = tx.Commit(); err != nil {
			return nil, err
		}
		return nil, ErrOfferExpired
	}
	if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "captain",
		[]orders.OrderStatus{orders.StatusDriverAssigned}, orders.StatusReadyForPickup, reason); err != nil {
		return nil, mapOrderError(err)
	}
	if _, err = tx.Exec(`
		UPDATE dsh_assignments SET status='declined',declined_at=NOW(),response_reason=$1,
		       last_latitude=NULL,last_longitude=NULL,location_recorded_at=NULL,version=version+1,updated_at=NOW()
		WHERE id=$2::uuid AND captain_id=$3`, reason, assignmentID, captainID); err != nil {
		return nil, err
	}
	if err = insertDispatchDecisionTx(tx, tenantID, assignmentID, current.OrderID, captainID,
		"declined", reasonCode, reason, captainID, "captain", nil); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignment(db, assignmentID, captainID)
}

func ExpireOverdueAssignments(db *sql.DB, tenantID, actorID string, limit int) (int, error) {
	tenantID = normalizeTenantID(tenantID)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		actorID = "dispatch-expiry-worker"
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	rows, err := tx.Query(assignmentSelectSQL()+`
		WHERE a.tenant_id=$1 AND a.status='offered' AND a.response_deadline_at<=NOW()
		ORDER BY a.response_deadline_at ASC LIMIT $2 FOR UPDATE OF a,d`, tenantID, limit)
	if err != nil {
		return 0, err
	}
	items, err := scanAssignments(rows)
	rows.Close()
	if err != nil {
		return 0, err
	}
	for i := range items {
		if err = expireAssignmentTx(tx, tenantID, &items[i], "system", actorID, "OFFER_TIMEOUT", "captain did not respond before deadline"); err != nil {
			return 0, err
		}
	}
	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return len(items), nil
}

func expireAssignmentTx(tx *sql.Tx, tenantID string, current *Assignment, actorRole, actorID, reasonCode, reason string) error {
	if current.Status != AssignmentOffered {
		return fmt.Errorf("%w: only offered assignments can expire", ErrConflict)
	}
	if current.OrderID != "" {
		if _, err := orders.TransitionDispatchOrder(tx, current.OrderID, "operator",
			[]orders.OrderStatus{orders.StatusDriverAssigned}, orders.StatusReadyForPickup, reason); err != nil {
			return mapOrderError(err)
		}
	}
	if _, err := tx.Exec(`
		UPDATE dsh_assignments SET status='cancelled',expired_at=NOW(),cancelled_at=NOW(),cancelled_by=$1,
		       response_reason=$2,last_latitude=NULL,last_longitude=NULL,location_recorded_at=NULL,
		       version=version+1,updated_at=NOW()
		WHERE id=$3::uuid`, actorID, reason, current.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE dsh_deliveries SET status='cancelled',updated_at=NOW() WHERE assignment_id=$1::uuid`, current.ID); err != nil {
		return err
	}
	return insertDispatchDecisionTx(tx, tenantID, current.ID, current.OrderID, current.CaptainID,
		"expired", reasonCode, reason, actorID, actorRole, nil)
}

func CancelGovernedAssignment(db *sql.DB, assignmentID, actorID, reasonCode, reason string) error {
	assignmentID = strings.TrimSpace(assignmentID)
	actorID = strings.TrimSpace(actorID)
	reasonCode = strings.TrimSpace(reasonCode)
	reason = strings.TrimSpace(reason)
	if assignmentID == "" || actorID == "" || reasonCode == "" || reason == "" {
		return fmt.Errorf("%w: assignmentId, actorId, reasonCode, and reason are required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	row := tx.QueryRow(assignmentSelectSQL()+` WHERE a.id=$1::uuid FOR UPDATE OF a,d`, assignmentID)
	current, err := scanAssignmentRowWithDelivery(row)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if current.Status != AssignmentOffered && current.Status != AssignmentAccepted {
		return fmt.Errorf("%w: assignment is already terminal", ErrConflict)
	}
	if current.Delivery.Status != DeliveryAssigned && current.Delivery.Status != DeliveryDriverAssigned {
		return fmt.Errorf("%w: assignment cannot be cancelled after pickup execution starts", ErrConflict)
	}
	var tenantID string
	if err = tx.QueryRow(`SELECT tenant_id FROM dsh_assignments WHERE id=$1::uuid`, assignmentID).Scan(&tenantID); err != nil {
		return err
	}
	if current.OrderID != "" {
		if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "operator",
			[]orders.OrderStatus{orders.StatusDriverAssigned}, orders.StatusReadyForPickup, reason); err != nil {
			return mapOrderError(err)
		}
	}
	if _, err = tx.Exec(`
		UPDATE dsh_assignments SET status='cancelled',cancelled_at=NOW(),cancelled_by=$1,response_reason=$2,
		       last_latitude=NULL,last_longitude=NULL,location_recorded_at=NULL,version=version+1,updated_at=NOW()
		WHERE id=$3::uuid`, actorID, reason, assignmentID); err != nil {
		return err
	}
	if _, err = tx.Exec(`UPDATE dsh_deliveries SET status='cancelled',updated_at=NOW() WHERE assignment_id=$1::uuid`, assignmentID); err != nil {
		return err
	}
	if err = insertDispatchDecisionTx(tx, tenantID, assignmentID, current.OrderID, current.CaptainID,
		"cancelled", reasonCode, reason, actorID, "operator", nil); err != nil {
		return err
	}
	return tx.Commit()
}

func ReassignGovernedAssignment(db *sql.DB, input ReassignAssignmentInput) (*Assignment, error) {
	input.AssignmentID = strings.TrimSpace(input.AssignmentID)
	input.Reason = strings.TrimSpace(input.Reason)
	if input.AssignmentID == "" || input.Reason == "" {
		return nil, fmt.Errorf("%w: assignmentId and reason are required", ErrInvalid)
	}
	// Cancellation and replacement are serialized by the assignment advisory lock.
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "dispatch-reassign|"+input.AssignmentID); err != nil {
		return nil, err
	}
	row := tx.QueryRow(assignmentSelectSQL()+` WHERE a.id=$1::uuid FOR UPDATE OF a,d`, input.AssignmentID)
	current, err := scanAssignmentRowWithDelivery(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if current.Status != AssignmentOffered && current.Status != AssignmentAccepted {
		return nil, fmt.Errorf("%w: only active assignments can be reassigned", ErrConflict)
	}
	if current.Delivery.Status != DeliveryAssigned && current.Delivery.Status != DeliveryDriverAssigned {
		return nil, fmt.Errorf("%w: assignment cannot be reassigned after pickup execution starts", ErrConflict)
	}
	var tenantID string
	if err = tx.QueryRow(`SELECT tenant_id FROM dsh_assignments WHERE id=$1::uuid`, input.AssignmentID).Scan(&tenantID); err != nil {
		return nil, err
	}
	input.TenantID = normalizeTenantID(input.TenantID)
	if input.TenantID != tenantID {
		return nil, fmt.Errorf("%w: tenant mismatch", ErrConflict)
	}
	if err = validateCaptainForAssignmentTx(tx, tenantID, strings.TrimSpace(input.CaptainID), strings.TrimSpace(input.ServiceAreaCode)); err != nil {
		return nil, err
	}
	if current.OrderID != "" {
		if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "operator",
			[]orders.OrderStatus{orders.StatusDriverAssigned}, orders.StatusReadyForPickup, input.Reason); err != nil {
			return nil, mapOrderError(err)
		}
	}
	if _, err = tx.Exec(`
		UPDATE dsh_assignments SET status='cancelled',cancelled_at=NOW(),cancelled_by=$1,response_reason=$2,
		       last_latitude=NULL,last_longitude=NULL,location_recorded_at=NULL,version=version+1,updated_at=NOW()
		WHERE id=$3::uuid`, input.ActorID, input.Reason, input.AssignmentID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE dsh_deliveries SET status='cancelled',updated_at=NOW() WHERE assignment_id=$1::uuid`, input.AssignmentID); err != nil {
		return nil, err
	}
	if err = insertDispatchDecisionTx(tx, tenantID, input.AssignmentID, current.OrderID, current.CaptainID,
		"reassigned", "OPERATOR_REASSIGNED", input.Reason, input.ActorID, "operator", map[string]any{"newCaptainId": input.CaptainID}); err != nil {
		return nil, err
	}
	if _, err = orders.TransitionDispatchOrder(tx, current.OrderID, "operator",
		[]orders.OrderStatus{orders.StatusReadyForPickup}, orders.StatusDriverAssigned, "replacement captain offer created"); err != nil {
		return nil, mapOrderError(err)
	}
	create := GovernedCreateAssignmentInput{
		OrderID: current.OrderID, TenantID: tenantID, CaptainID: input.CaptainID, ActorID: input.ActorID,
		ServiceAreaCode: input.ServiceAreaCode, IdempotencyKey: input.IdempotencyKey,
		Priority: input.Priority, DistanceMeters: input.DistanceMeters, OfferReason: input.Reason,
		ResponseTimeoutSecond: input.ResponseTimeoutSecond, SupersedesAssignmentID: input.AssignmentID,
	}
	if err = validateGovernedCreateInput(&create); err != nil {
		return nil, err
	}
	assignment, err := scanAssignmentRow(tx.QueryRow(`
		INSERT INTO dsh_assignments (
			order_id,captain_id,assigned_by,status,response_deadline_at,tenant_id,service_area_code,
			idempotency_key,priority,distance_meters,offer_reason,supersedes_assignment_id
		) VALUES ($1::uuid,$2,$3,'offered',NOW()+($4*INTERVAL '1 second'),$5,$6,$7,$8,$9,NULLIF($10,''),$11::uuid)
		RETURNING id::text,order_id::text,captain_id,assigned_by,status,response_deadline_at,
		          accepted_at,declined_at,completed_at,created_at,updated_at`,
		create.OrderID, create.CaptainID, create.ActorID, create.ResponseTimeoutSecond, create.TenantID,
		create.ServiceAreaCode, create.IdempotencyKey, create.Priority, create.DistanceMeters, create.OfferReason,
		create.SupersedesAssignmentID,
	))
	if err != nil {
		return nil, err
	}
	delivery, err := scanDeliveryRow(tx.QueryRow(`
		INSERT INTO dsh_deliveries (assignment_id,order_id,captain_id,status)
		VALUES ($1::uuid,$2::uuid,$3,'assigned')
		RETURNING id::text,assignment_id::text,order_id::text,captain_id,status,
		          COALESCE(pod_method,''),COALESCE(pod_reference,''),COALESCE(note,''),created_at,updated_at`,
		assignment.ID, create.OrderID, create.CaptainID,
	))
	if err != nil {
		return nil, err
	}
	assignment.Delivery = *delivery
	if err = insertDispatchDecisionTx(tx, tenantID, assignment.ID, current.OrderID, create.CaptainID,
		"offered", "REASSIGNMENT_OFFER_CREATED", input.Reason, input.ActorID, "operator",
		map[string]any{"supersedesAssignmentId": input.AssignmentID}); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return assignment, nil
}

func ListDispatchDecisions(db *sql.DB, tenantID, assignmentID, orderID string, limit int) ([]DispatchDecision, error) {
	tenantID = normalizeTenantID(tenantID)
	assignmentID = strings.TrimSpace(assignmentID)
	orderID = strings.TrimSpace(orderID)
	if assignmentID == "" && orderID == "" {
		return nil, fmt.Errorf("%w: assignmentId or orderId is required", ErrInvalid)
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := db.Query(`
		SELECT id::text,tenant_id,COALESCE(assignment_id::text,''),COALESCE(order_id::text,''),
		       COALESCE(captain_id,''),action,COALESCE(reason_code,''),COALESCE(reason,''),
		       actor_id,actor_role,metadata,created_at
		FROM dsh_dispatch_decisions
		WHERE tenant_id=$1
		  AND ($2='' OR assignment_id=$2::uuid)
		  AND ($3='' OR order_id=$3::uuid)
		ORDER BY created_at DESC LIMIT $4`, tenantID, assignmentID, orderID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]DispatchDecision, 0)
	for rows.Next() {
		var item DispatchDecision
		if err = rows.Scan(&item.ID, &item.TenantID, &item.AssignmentID, &item.OrderID, &item.CaptainID,
			&item.Action, &item.ReasonCode, &item.Reason, &item.ActorID, &item.ActorRole,
			&item.Metadata, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func insertDispatchDecisionTx(tx *sql.Tx, tenantID, assignmentID, orderID, captainID,
	action, reasonCode, reason, actorID, actorRole string, metadata map[string]any) error {
	if metadata == nil {
		metadata = map[string]any{}
	}
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`
		INSERT INTO dsh_dispatch_decisions (
			tenant_id,assignment_id,order_id,captain_id,action,reason_code,reason,actor_id,actor_role,metadata
		) VALUES ($1,NULLIF($2,'')::uuid,NULLIF($3,'')::uuid,NULLIF($4,''),$5,NULLIF($6,''),NULLIF($7,''),$8,$9,$10::jsonb)`,
		normalizeTenantID(tenantID), assignmentID, orderID, captainID, action, reasonCode, reason, actorID, actorRole, string(encoded))
	return err
}

func dispatchErrorCode(err error) string {
	switch {
	case errors.Is(err, ErrCaptainAtCapacity):
		return "CAPTAIN_AT_CAPACITY"
	case errors.Is(err, ErrCaptainNotEligible):
		return "CAPTAIN_NOT_ELIGIBLE"
	case errors.Is(err, ErrOfferExpired):
		return "DISPATCH_OFFER_EXPIRED"
	default:
		return "DISPATCH_CONFLICT"
	}
}
