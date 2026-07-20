from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor in {path}, found {count}")
    write(path, text.replace(old, new, 1))


def write_migration() -> None:
    write(
        "services/dsh/database/migrations/dsh-092_delivery_exception_lifecycle.sql",
        """-- DSH-092: governed platform-captain delivery exception lifecycle.\n-- Exceptions overlay the current delivery stage; they do not invent a new order\n-- status or mutate financial truth. Operations must resolve the overlay before\n-- delivery progression or proof-of-delivery can continue.\n\nBEGIN;\n\nCREATE TABLE IF NOT EXISTS dsh_delivery_exceptions (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    tenant_id TEXT NOT NULL,\n    assignment_id UUID NOT NULL REFERENCES dsh_assignments(id) ON DELETE CASCADE,\n    order_id UUID NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,\n    captain_id TEXT NOT NULL,\n    reason_code TEXT NOT NULL CHECK (reason_code IN (\n        'customer_unreachable',\n        'recipient_refused',\n        'wrong_address',\n        'unsafe_location',\n        'vehicle_breakdown',\n        'accident',\n        'damaged_order',\n        'cash_collection_issue',\n        'weather_or_road_block',\n        'proof_unavailable',\n        'other'\n    )),\n    note TEXT NOT NULL DEFAULT '',\n    delivery_status_at_report TEXT NOT NULL CHECK (delivery_status_at_report IN (\n        'driver_assigned',\n        'driver_arrived_store',\n        'picked_up',\n        'arrived_customer'\n    )),\n    severity TEXT NOT NULL CHECK (severity IN ('medium', 'high', 'critical')),\n    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),\n    correlation_id TEXT NOT NULL,\n    reported_latitude DOUBLE PRECISION,\n    reported_longitude DOUBLE PRECISION,\n    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n    acknowledged_at TIMESTAMPTZ,\n    resolved_at TIMESTAMPTZ,\n    resolved_by_actor_id TEXT,\n    resolution_action TEXT CHECK (resolution_action IS NULL OR resolution_action IN (\n        'retry_same_captain',\n        'reassign_captain',\n        'return_to_store',\n        'cancel_order'\n    )),\n    resolution_note TEXT,\n    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),\n    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n    CONSTRAINT dsh_delivery_exceptions_location_pair_check CHECK (\n        (reported_latitude IS NULL AND reported_longitude IS NULL) OR\n        (reported_latitude BETWEEN -90 AND 90 AND reported_longitude BETWEEN -180 AND 180)\n    ),\n    CONSTRAINT dsh_delivery_exceptions_resolution_shape_check CHECK (\n        (status = 'resolved' AND resolved_at IS NOT NULL AND resolved_by_actor_id IS NOT NULL\n         AND resolution_action IS NOT NULL AND NULLIF(BTRIM(resolution_note), '') IS NOT NULL)\n        OR\n        (status <> 'resolved' AND resolved_at IS NULL AND resolved_by_actor_id IS NULL\n         AND resolution_action IS NULL AND resolution_note IS NULL)\n    ),\n    CONSTRAINT dsh_delivery_exceptions_correlation_unique UNIQUE (tenant_id, correlation_id)\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_delivery_exceptions_active_assignment\n    ON dsh_delivery_exceptions(assignment_id)\n    WHERE status IN ('open', 'acknowledged');\n\nCREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_operator_queue\n    ON dsh_delivery_exceptions(status, severity, reported_at DESC);\n\nCREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_order\n    ON dsh_delivery_exceptions(order_id, reported_at DESC);\n\nCOMMIT;\n""",
    )


def write_backend_domain() -> None:
    write(
        "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
        r'''package dispatch

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
''',
    )


def patch_backend_guards() -> None:
    path = "services/dsh/backend/internal/dispatch/dispatch.go"
    text = read(path)
    submit_anchor = '''\tif current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {\n\t\treturn nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)\n\t}\n\tif current.Delivery.Status != DeliveryArrivedCustomer {'''
    submit_replacement = '''\tif current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {\n\t\treturn nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)\n\t}\n\tif err = ensureNoOpenDeliveryException(tx, assignmentID); err != nil {\n\t\treturn nil, err\n\t}\n\tif current.Delivery.Status != DeliveryArrivedCustomer {'''
    if submit_replacement not in text:
        if submit_anchor not in text:
            raise RuntimeError("SubmitPoD exception guard anchor not found")
        text = text.replace(submit_anchor, submit_replacement, 1)

    progress_anchor = '''\tif current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {\n\t\treturn nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)\n\t}\n\tif current.Status != AssignmentAccepted {'''
    progress_replacement = '''\tif current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {\n\t\treturn nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)\n\t}\n\tif err = ensureNoOpenDeliveryException(tx, assignmentID); err != nil {\n\t\treturn nil, err\n\t}\n\tif current.Status != AssignmentAccepted {'''
    if progress_replacement not in text:
        if progress_anchor not in text:
            raise RuntimeError("delivery progress exception guard anchor not found")
        text = text.replace(progress_anchor, progress_replacement, 1)
    write(path, text)


def patch_http() -> None:
    path = "services/dsh/backend/internal/http/dispatch.go"
    text = read(path)
    if "handleReportDeliveryException" not in text:
        anchor = '''// GET /dsh/client/orders/{orderId}/tracking\nfunc (s *protectedStoreServer) handleGetClientTracking'''
        block = r'''// POST /dsh/captain/dispatch/assignments/{assignmentId}/exceptions
func (s *protectedStoreServer) handleReportDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body struct {
		ReasonCode    dispatch.DeliveryExceptionReasonCode `json:"reasonCode"`
		Note          string                               `json:"note"`
		CorrelationID string                               `json:"correlationId"`
		Latitude      *float64                             `json:"latitude"`
		Longitude     *float64                             `json:"longitude"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	item, err := dispatch.ReportDeliveryException(s.db, r.PathValue("assignmentId"), actor.ID, dispatch.ReportDeliveryExceptionInput{
		ReasonCode: body.ReasonCode, Note: body.Note,
		CorrelationID: operationalCorrelationID(r, body.CorrelationID),
		Latitude: body.Latitude, Longitude: body.Longitude,
	})
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"exception": marshalDeliveryException(item)})
}

// GET /dsh/captain/dispatch/assignments/{assignmentId}/exceptions
func (s *protectedStoreServer) handleGetCaptainDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	item, err := dispatch.GetCaptainOpenDeliveryException(s.db, r.PathValue("assignmentId"), actor.ID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

// GET /dsh/operator/delivery-exceptions
func (s *protectedStoreServer) handleListOperatorDeliveryExceptions(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	items, err := dispatch.ListOperatorDeliveryExceptions(s.db, dispatch.DeliveryExceptionStatus(r.URL.Query().Get("status")), 100)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for i := range items {
		out = append(out, marshalDeliveryException(&items[i]))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exceptions": out})
}

func writeDeliveryExceptionError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, dispatch.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "delivery exception not found")
	case errors.Is(err, dispatch.ErrConflict):
		store.SendError(w, http.StatusConflict, "DELIVERY_EXCEPTION_CONFLICT", err.Error())
	case errors.Is(err, dispatch.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "delivery exception operation failed")
	}
}

func marshalDeliveryException(item *dispatch.DeliveryException) map[string]any {
	return map[string]any{
		"id": item.ID,
		"tenantId": item.TenantID,
		"assignmentId": item.AssignmentID,
		"orderId": item.OrderID,
		"captainId": item.CaptainID,
		"reasonCode": string(item.ReasonCode),
		"note": item.Note,
		"deliveryStatusAtReport": string(item.DeliveryStatusAtReport),
		"severity": string(item.Severity),
		"status": string(item.Status),
		"correlationId": item.CorrelationID,
		"reportedLatitude": item.ReportedLatitude,
		"reportedLongitude": item.ReportedLongitude,
		"reportedAt": item.ReportedAt,
		"acknowledgedAt": item.AcknowledgedAt,
		"resolvedAt": item.ResolvedAt,
		"resolvedByActorId": item.ResolvedByActorID,
		"resolutionAction": item.ResolutionAction,
		"resolutionNote": item.ResolutionNote,
		"version": item.Version,
		"createdAt": item.CreatedAt,
		"updatedAt": item.UpdatedAt,
	}
}

// GET /dsh/client/orders/{orderId}/tracking
func (s *protectedStoreServer) handleGetClientTracking'''
        if anchor not in text:
            raise RuntimeError("dispatch HTTP insertion anchor not found")
        text = text.replace(anchor, block, 1)
    write(path, text)

    path = "services/dsh/backend/internal/http/server.go"
    text = read(path)
    routes_anchor = '''\tmux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/location", protected.handlePushDispatchLocation)\n\tmux.HandleFunc("GET /dsh/client/orders/{orderId}/tracking", protected.handleGetClientTracking)'''
    routes_new = '''\tmux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/location", protected.handlePushDispatchLocation)\n\tmux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/exceptions", protected.handleReportDeliveryException)\n\tmux.HandleFunc("GET /dsh/captain/dispatch/assignments/{assignmentId}/exceptions", protected.handleGetCaptainDeliveryException)\n\tmux.HandleFunc("GET /dsh/operator/delivery-exceptions", protected.handleListOperatorDeliveryExceptions)\n\tmux.HandleFunc("GET /dsh/client/orders/{orderId}/tracking", protected.handleGetClientTracking)'''
    if routes_new not in text:
        if routes_anchor not in text:
            raise RuntimeError("dispatch route anchor not found")
        text = text.replace(routes_anchor, routes_new, 1)
    write(path, text)


def patch_contract() -> None:
    path = "services/dsh/contracts/dsh.openapi.yaml"
    text = read(path)
    if "  version: 0.7.0\n" not in text:
        if "  version: 0.6.0\n" not in text:
            raise RuntimeError("DSH contract version anchor not found")
        text = text.replace("  version: 0.6.0\n", "  version: 0.7.0\n", 1)

    if "  /dsh/captain/dispatch/assignments/{assignmentId}/exceptions:\n" not in text:
        paths_block = '''  /dsh/captain/dispatch/assignments/{assignmentId}/exceptions:\n    parameters:\n      - name: assignmentId\n        in: path\n        required: true\n        schema: { type: string, format: uuid }\n    get:\n      operationId: getDshCaptainDeliveryException\n      summary: Return the captain's active governed delivery exception.\n      tags: [DshDispatch]\n      security: [{ bearerAuth: [] }]\n      responses:\n        "200":\n          description: Active delivery exception returned.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshDeliveryExceptionResponse" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "404": { $ref: "#/components/responses/NotFound" }\n    post:\n      operationId: reportDshCaptainDeliveryException\n      summary: Report one idempotent delivery exception for an active accepted assignment.\n      description: >-\n        Creates an operational overlay without changing the order status or financial truth.\n        Delivery progression and proof are blocked until operations resolves the exception;\n        foreground location pushes remain allowed for safety and response coordination.\n      tags: [DshDispatch]\n      security: [{ bearerAuth: [] }]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { $ref: "#/components/schemas/DshReportDeliveryExceptionRequest" }\n      responses:\n        "201":\n          description: Delivery exception recorded or idempotently replayed.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshDeliveryExceptionResponse" }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "404": { $ref: "#/components/responses/NotFound" }\n        "409":\n          description: Assignment is not active or already has an unresolved exception.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshErrorResponse" }\n\n  /dsh/operator/delivery-exceptions:\n    get:\n      operationId: listDshOperatorDeliveryExceptions\n      summary: List the governed delivery-exception operations queue.\n      tags: [DshDispatch]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: status\n          in: query\n          required: false\n          schema: { $ref: "#/components/schemas/DshDeliveryExceptionStatus" }\n      responses:\n        "200":\n          description: Delivery-exception queue returned.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshDeliveryExceptionListResponse" }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n\n'''
        if "components:\n" not in text:
            raise RuntimeError("OpenAPI components anchor not found")
        text = text.replace("components:\n", paths_block + "components:\n", 1)

    if "    DshDeliveryExceptionReasonCode:\n" not in text:
        schemas_block = '''    DshDeliveryExceptionReasonCode:\n      type: string\n      enum:\n        - customer_unreachable\n        - recipient_refused\n        - wrong_address\n        - unsafe_location\n        - vehicle_breakdown\n        - accident\n        - damaged_order\n        - cash_collection_issue\n        - weather_or_road_block\n        - proof_unavailable\n        - other\n\n    DshDeliveryExceptionStatus:\n      type: string\n      enum: [open, acknowledged, resolved]\n\n    DshDeliveryExceptionSeverity:\n      type: string\n      enum: [medium, high, critical]\n\n    DshReportDeliveryExceptionRequest:\n      type: object\n      additionalProperties: false\n      required: [reasonCode, correlationId]\n      properties:\n        reasonCode: { $ref: "#/components/schemas/DshDeliveryExceptionReasonCode" }\n        note: { type: string, maxLength: 1000 }\n        correlationId: { type: string, minLength: 1, maxLength: 200 }\n        latitude: { type: number, format: double, minimum: -90, maximum: 90, nullable: true }\n        longitude: { type: number, format: double, minimum: -180, maximum: 180, nullable: true }\n\n    DshDeliveryException:\n      type: object\n      additionalProperties: false\n      required:\n        - id\n        - tenantId\n        - assignmentId\n        - orderId\n        - captainId\n        - reasonCode\n        - note\n        - deliveryStatusAtReport\n        - severity\n        - status\n        - correlationId\n        - reportedAt\n        - version\n        - createdAt\n        - updatedAt\n      properties:\n        id: { type: string, format: uuid }\n        tenantId: { type: string }\n        assignmentId: { type: string, format: uuid }\n        orderId: { type: string, format: uuid }\n        captainId: { type: string }\n        reasonCode: { $ref: "#/components/schemas/DshDeliveryExceptionReasonCode" }\n        note: { type: string }\n        deliveryStatusAtReport: { $ref: "#/components/schemas/DshDeliveryStatus" }\n        severity: { $ref: "#/components/schemas/DshDeliveryExceptionSeverity" }\n        status: { $ref: "#/components/schemas/DshDeliveryExceptionStatus" }\n        correlationId: { type: string }\n        reportedLatitude: { type: number, format: double, nullable: true }\n        reportedLongitude: { type: number, format: double, nullable: true }\n        reportedAt: { type: string, format: date-time }\n        acknowledgedAt: { type: string, format: date-time, nullable: true }\n        resolvedAt: { type: string, format: date-time, nullable: true }\n        resolvedByActorId: { type: string, nullable: true }\n        resolutionAction:\n          type: string\n          enum: [retry_same_captain, reassign_captain, return_to_store, cancel_order]\n          nullable: true\n        resolutionNote: { type: string, nullable: true }\n        version: { type: integer, minimum: 1 }\n        createdAt: { type: string, format: date-time }\n        updatedAt: { type: string, format: date-time }\n\n    DshDeliveryExceptionResponse:\n      type: object\n      additionalProperties: false\n      required: [exception]\n      properties:\n        exception: { $ref: "#/components/schemas/DshDeliveryException" }\n\n    DshDeliveryExceptionListResponse:\n      type: object\n      additionalProperties: false\n      required: [exceptions]\n      properties:\n        exceptions:\n          type: array\n          items: { $ref: "#/components/schemas/DshDeliveryException" }\n\n'''
        anchor = "  schemas:\n"
        if anchor not in text:
            raise RuntimeError("OpenAPI schemas anchor not found")
        text = text.replace(anchor, anchor + schemas_block, 1)
    write(path, text)


def patch_frontend() -> None:
    path = "services/dsh/frontend/shared/dispatch/dispatch.types.ts"
    text = read(path)
    type_anchor = 'export type DshSubmitPoDInput = components["schemas"]["DshSubmitPoDRequest"];\n'
    type_new = type_anchor + 'export type DshDeliveryException = components["schemas"]["DshDeliveryException"];\nexport type DshReportDeliveryExceptionInput = components["schemas"]["DshReportDeliveryExceptionRequest"];\n'
    if 'export type DshDeliveryException =' not in text:
        if type_anchor not in text:
            raise RuntimeError("dispatch type anchor not found")
        text = text.replace(type_anchor, type_new, 1)
    write(path, text)

    path = "services/dsh/frontend/shared/dispatch/dispatch.api.ts"
    text = read(path)
    if "DshDeliveryException," not in text:
        text = text.replace("  DshCreateAssignmentInput,\n", "  DshCreateAssignmentInput,\n  DshDeliveryException,\n", 1)
        text = text.replace("  DshSubmitPoDInput,\n", "  DshSubmitPoDInput,\n  DshReportDeliveryExceptionInput,\n", 1)
    if "reportDeliveryException" not in text:
        anchor = '''export async function fetchClientOrderTracking(orderId: string): Promise<DshDispatchAssignment> {'''
        block = '''export async function reportDeliveryException(assignmentId: string, input: DshReportDeliveryExceptionInput): Promise<DshDeliveryException> {\n  const data = await request<{ exception: DshDeliveryException }>(\n    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/exceptions`,\n    { method: "POST", body: input },\n  );\n  return data.exception;\n}\n\nexport async function fetchCaptainDeliveryException(assignmentId: string): Promise<DshDeliveryException> {\n  const data = await request<{ exception: DshDeliveryException }>(\n    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/exceptions`,\n  );\n  return data.exception;\n}\n\n'''
        if anchor not in text:
            raise RuntimeError("dispatch API insertion anchor not found")
        text = text.replace(anchor, block + anchor, 1)
    write(path, text)

    path = "services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts"
    text = read(path)
    if "reportDeliveryException," not in text:
        text = text.replace("  declineDispatchAssignment,\n", "  declineDispatchAssignment,\n  reportDeliveryException,\n", 1)
    old = '''  const failDelivery = React.useCallback(\n    async (_assignmentId: string, _captainId: string) => {\n      throw {\n        kind: 'unsupported_transition',\n        message: 'failed delivery requires the governed dispatch exception endpoint',\n      };\n    },\n    [],\n  );'''
    new = '''  const failDelivery = React.useCallback(\n    (assignmentId: string, _captainId: string) => reportDeliveryException(assignmentId, {\n      reasonCode: 'proof_unavailable',\n      note: 'تعذر إكمال إثبات التسليم؛ تم تحويل المهمة إلى مراجعة العمليات.',\n      correlationId: globalThis.crypto?.randomUUID?.() ?? `${assignmentId}-${Date.now()}`,\n    }),\n    [],\n  );'''
    if new not in text:
        if old not in text:
            raise RuntimeError("captain failDelivery anchor not found")
        text = text.replace(old, new, 1)
    write(path, text)

    path = "services/dsh/frontend/shared/orders/dsh-order-lifecycle.policy.ts"
    text = read(path)
    text = text.replace("  failDelivery: false,", "  failDelivery: true,")
    write(path, text)


def write_db_test() -> None:
    write(
        "services/dsh/backend/internal/dispatch/delivery_exceptions_db_test.go",
        r'''package dispatch

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestDeliveryExceptionBlocksProgressButAllowsLocationDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-delivery-exception-" + suffix
	storeID := "delivery-exception-store-" + suffix
	captainID := "delivery-exception-captain-" + suffix
	clientID := uuid.NewString()

	if _, err := db.Exec(`
		INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible)
		VALUES($1,$1,'Delivery Exception Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}

	var checkoutIntentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_checkout_intents(
			tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,
			subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash
		) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('e',64))
		RETURNING id::text`, tenantID, clientID, storeID, "delivery-exception-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("insert checkout intent: %v", err)
	}

	var orderID string
	if err := db.QueryRow(`
		INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id)
		VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'arrived_customer',$5)
		RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "delivery-exception-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatalf("insert order: %v", err)
	}

	var assignmentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at)
		VALUES($1::uuid,$2,'operator-test','accepted',NOW()+INTERVAL '90 seconds',NOW())
		RETURNING id::text`, orderID, captainID).Scan(&assignmentID); err != nil {
		t.Fatalf("insert assignment: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status)
		VALUES($1::uuid,$2::uuid,$3,'arrived_customer')`, assignmentID, orderID, captainID); err != nil {
		t.Fatalf("insert delivery: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	correlationID := "delivery-exception-command-" + suffix
	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{
		ReasonCode: ExceptionCustomerUnreachable,
		Note: "اتصل الكابتن عدة مرات دون استجابة",
		CorrelationID: correlationID,
	})
	if err != nil {
		t.Fatalf("report delivery exception: %v", err)
	}
	if item.Status != DeliveryExceptionOpen || item.DeliveryStatusAtReport != DeliveryArrivedCustomer {
		t.Fatalf("unexpected exception state: %+v", item)
	}

	replayed, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{
		ReasonCode: ExceptionCustomerUnreachable,
		Note: "اتصل الكابتن عدة مرات دون استجابة",
		CorrelationID: correlationID,
	})
	if err != nil || replayed.ID != item.ID {
		t.Fatalf("expected idempotent replay of %s, got %+v err=%v", item.ID, replayed, err)
	}

	if _, err := SubmitPoD(db, assignmentID, captainID, PoDInput{Method: "photo", Reference: "blocked-proof"}); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected proof to be blocked by active exception, got %v", err)
	}

	if _, err := PushLocation(db, assignmentID, captainID, PushLocationInput{Latitude: 15.3694, Longitude: 44.1910}); err != nil {
		t.Fatalf("location must remain available during exception response: %v", err)
	}

	queue, err := ListOperatorDeliveryExceptions(db, DeliveryExceptionOpen, 100)
	if err != nil {
		t.Fatalf("list operator exceptions: %v", err)
	}
	found := false
	for _, candidate := range queue {
		if candidate.ID == item.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("reported exception missing from operator queue")
	}
}
''',
    )


def main() -> None:
    write_migration()
    write_backend_domain()
    patch_backend_guards()
    patch_http()
    patch_contract()
    patch_frontend()
    write_db_test()
    print("Delivery exception slice one patch applied.")


if __name__ == "__main__":
    main()
