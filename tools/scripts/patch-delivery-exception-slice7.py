from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def write_migration() -> None:
    write(
        "services/dsh/database/migrations/dsh-094_delivery_return_partner_receipt.sql",
        '''-- DSH-094: dual custody handshake for returned orders.
-- Captain arrival is not store receipt. Only the owning partner may confirm the
-- handoff and unlock returned_to_store / governed financial cancellation.

BEGIN;

ALTER TABLE dsh_orders DROP CONSTRAINT IF EXISTS dsh_orders_status_check;
ALTER TABLE dsh_orders ADD CONSTRAINT dsh_orders_status_check CHECK (status IN (
    'pending','store_accepted','preparing','ready_for_pickup','driver_assigned',
    'driver_arrived_store','picked_up','arrived_customer','returning_to_store',
    'return_arrived_store','returned_to_store','delivered','cancelled_by_client',
    'cancelled_by_store','cancelled_by_operator','cancelled_no_driver',
    'failed_payment','failed_dispatch'
));

ALTER TABLE dsh_deliveries DROP CONSTRAINT IF EXISTS dsh_deliveries_status_check;
ALTER TABLE dsh_deliveries ADD CONSTRAINT dsh_deliveries_status_check CHECK (status IN (
    'assigned','driver_assigned','driver_arrived_store','picked_up','arrived_customer',
    'returning_to_store','return_arrived_store','returned_to_store','delivered','cancelled'
));

ALTER TABLE dsh_delivery_exceptions
    ADD COLUMN IF NOT EXISTS return_arrived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS return_accepted_by_actor_id TEXT;

ALTER TABLE dsh_delivery_exceptions
    DROP CONSTRAINT IF EXISTS dsh_delivery_exceptions_resolution_shape_check;
ALTER TABLE dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_resolution_shape_check CHECK (
        (
            status = 'resolved'
            AND resolved_at IS NOT NULL
            AND resolved_by_actor_id IS NOT NULL
            AND resolution_action IS NOT NULL
            AND NULLIF(BTRIM(resolution_note), '') IS NOT NULL
            AND (
                (resolution_action = 'reassign_captain'
                 AND replacement_assignment_id IS NOT NULL
                 AND NULLIF(BTRIM(replacement_captain_id), '') IS NOT NULL
                 AND return_started_at IS NULL
                 AND return_arrived_at IS NULL
                 AND returned_at IS NULL
                 AND return_accepted_by_actor_id IS NULL)
                OR
                (resolution_action = 'return_to_store'
                 AND replacement_assignment_id IS NULL
                 AND replacement_captain_id IS NULL
                 AND return_started_at IS NOT NULL
                 AND (return_arrived_at IS NULL OR return_arrived_at >= return_started_at)
                 AND (returned_at IS NULL OR (
                     return_arrived_at IS NOT NULL
                     AND returned_at >= return_arrived_at
                     AND NULLIF(BTRIM(return_accepted_by_actor_id), '') IS NOT NULL
                 ))
                 AND (returned_at IS NOT NULL OR return_accepted_by_actor_id IS NULL))
                OR
                (resolution_action NOT IN ('reassign_captain','return_to_store')
                 AND replacement_assignment_id IS NULL
                 AND replacement_captain_id IS NULL
                 AND return_started_at IS NULL
                 AND return_arrived_at IS NULL
                 AND returned_at IS NULL
                 AND return_accepted_by_actor_id IS NULL)
            )
        )
        OR
        (
            status <> 'resolved'
            AND resolved_at IS NULL
            AND resolved_by_actor_id IS NULL
            AND resolution_action IS NULL
            AND resolution_note IS NULL
            AND replacement_assignment_id IS NULL
            AND replacement_captain_id IS NULL
            AND return_started_at IS NULL
            AND return_arrived_at IS NULL
            AND returned_at IS NULL
            AND return_accepted_by_actor_id IS NULL
        )
    );

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_partner_return_receipt
    ON dsh_delivery_exceptions(order_id, return_arrived_at DESC)
    WHERE resolution_action='return_to_store' AND returned_at IS NULL;

COMMIT;
''',
    )


def patch_status_constants() -> None:
    path = "services/dsh/backend/internal/orders/orders.go"
    text = read(path)
    if 'StatusReturnArrivedStore' not in text:
        text = text.replace(
            '\tStatusReturningStore  OrderStatus = "returning_to_store"\n\tStatusReturnedStore',
            '\tStatusReturningStore     OrderStatus = "returning_to_store"\n\tStatusReturnArrivedStore OrderStatus = "return_arrived_store"\n\tStatusReturnedStore',
            1,
        )
    write(path, text)

    path = "services/dsh/backend/internal/dispatch/dispatch.go"
    text = read(path)
    if 'DeliveryReturnArrivedStore' not in text:
        text = text.replace(
            '\tDeliveryReturningStore  DeliveryStatus = "returning_to_store"\n\tDeliveryReturnedStore',
            '\tDeliveryReturningStore     DeliveryStatus = "returning_to_store"\n\tDeliveryReturnArrivedStore DeliveryStatus = "return_arrived_store"\n\tDeliveryReturnedStore',
            1,
        )
    write(path, text)


def patch_backend_domain() -> None:
    path = "services/dsh/backend/internal/dispatch/delivery_exceptions.go"
    text = read(path)
    if 'ReturnArrivedAt' not in text:
        text = text.replace(
            '\tReturnStartedAt        *time.Time\n\tReturnedAt',
            '\tReturnStartedAt           *time.Time\n\tReturnArrivedAt           *time.Time\n\tReturnedAt                *time.Time\n\tReturnAcceptedByActorID   *string\n\tVersion',
            1,
        )
        text = text.replace('\tReturnedAt             *time.Time\n\tVersion', '')

    start = text.find('func CompleteReturnToStore(')
    if start == -1:
        raise RuntimeError('CompleteReturnToStore source not found')
    next_func = text.find('\nfunc ', start + 5)
    if next_func == -1:
        raise RuntimeError('CompleteReturnToStore end not found')
    old_block = text[start:next_func]
    new_block = r'''func CaptainArriveReturnToStore(db *sql.DB, assignmentID, captainID string) (*DeliveryException, error) {
	assignmentID = strings.TrimSpace(assignmentID)
	captainID = strings.TrimSpace(captainID)
	if assignmentID == "" || captainID == "" {
		return nil, fmt.Errorf("%w: assignment and captain are required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil { return nil, err }
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
		if errors.Is(err, sql.ErrNoRows) { return nil, ErrNotFound }
		return nil, err
	}

	row := tx.QueryRow(`
		SELECT `+deliveryExceptionColumns+`
		FROM dsh_delivery_exceptions e
		WHERE e.assignment_id=$1::uuid AND e.status='resolved'
		  AND e.resolution_action='return_to_store' AND e.returned_at IS NULL
		ORDER BY e.resolved_at DESC LIMIT 1 FOR UPDATE`, assignmentID)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) { return nil, ErrNotFound }
	if err != nil { return nil, err }
	if item.ReturnArrivedAt != nil {
		if orderStatus != "return_arrived_store" || deliveryStatus != DeliveryReturnArrivedStore {
			return nil, fmt.Errorf("%w: return arrival state drift", ErrConflict)
		}
		return item, nil
	}
	if assignmentStatus != AssignmentAccepted || deliveryStatus != DeliveryReturningStore || orderStatus != "returning_to_store" {
		return nil, fmt.Errorf("%w: assignment is not returning to store", ErrConflict)
	}
	if _, err := tx.Exec(`UPDATE dsh_deliveries SET status='return_arrived_store', updated_at=NOW() WHERE assignment_id=$1::uuid`, assignmentID); err != nil { return nil, err }
	if _, err := tx.Exec(`UPDATE dsh_orders SET status='return_arrived_store', updated_at=NOW() WHERE id=$1::uuid`, orderID); err != nil { return nil, err }
	if _, err := tx.Exec(`INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note) VALUES($1::uuid,'captain','returning_to_store','return_arrived_store','captain arrived at store with returned order')`, orderID); err != nil { return nil, err }
	if _, err := tx.Exec(`UPDATE dsh_delivery_exceptions SET return_arrived_at=NOW(), version=version+1, updated_at=NOW() WHERE id=$1::uuid AND return_arrived_at IS NULL`, item.ID); err != nil { return nil, err }
	if err := tx.Commit(); err != nil { return nil, err }
	return GetDeliveryException(db, item.ID)
}

func GetPartnerReturnToStore(db *sql.DB, orderID string) (*DeliveryException, error) {
	row := db.QueryRow(`
		SELECT `+deliveryExceptionColumns+`
		FROM dsh_delivery_exceptions e
		WHERE e.order_id=$1::uuid AND e.status='resolved' AND e.resolution_action='return_to_store'
		ORDER BY e.resolved_at DESC LIMIT 1`, orderID)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) { return nil, ErrNotFound }
	return item, err
}

func AcceptReturnToStoreByPartner(db *sql.DB, orderID, actorID string) (*DeliveryException, error) {
	orderID = strings.TrimSpace(orderID)
	actorID = strings.TrimSpace(actorID)
	if orderID == "" || actorID == "" {
		return nil, fmt.Errorf("%w: order and partner actor are required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil { return nil, err }
	defer tx.Rollback()

	row := tx.QueryRow(`
		SELECT `+deliveryExceptionColumns+`
		FROM dsh_delivery_exceptions e
		WHERE e.order_id=$1::uuid AND e.status='resolved' AND e.resolution_action='return_to_store'
		ORDER BY e.resolved_at DESC LIMIT 1 FOR UPDATE`, orderID)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) { return nil, ErrNotFound }
	if err != nil { return nil, err }
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
		if errors.Is(err, sql.ErrNoRows) { return nil, ErrNotFound }
		return nil, err
	}
	if assignmentStatus != AssignmentAccepted || deliveryStatus != DeliveryReturnArrivedStore || orderStatus != "return_arrived_store" {
		return nil, fmt.Errorf("%w: returned order is not awaiting store receipt", ErrConflict)
	}
	if _, err := tx.Exec(`UPDATE dsh_deliveries SET status='returned_to_store', updated_at=NOW() WHERE assignment_id=$1::uuid`, item.AssignmentID); err != nil { return nil, err }
	if _, err := tx.Exec(`UPDATE dsh_assignments SET status='completed', completed_at=NOW(), updated_at=NOW() WHERE id=$1::uuid`, item.AssignmentID); err != nil { return nil, err }
	if _, err := tx.Exec(`UPDATE dsh_orders SET status='returned_to_store', updated_at=NOW() WHERE id=$1::uuid`, orderID); err != nil { return nil, err }
	if _, err := tx.Exec(`INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note) VALUES($1::uuid,'partner','return_arrived_store','returned_to_store','store accepted returned order custody')`, orderID); err != nil { return nil, err }
	if _, err := tx.Exec(`UPDATE dsh_delivery_exceptions SET returned_at=NOW(), return_accepted_by_actor_id=$1, version=version+1, updated_at=NOW() WHERE id=$2::uuid AND returned_at IS NULL`, actorID, item.ID); err != nil { return nil, err }
	if err := tx.Commit(); err != nil { return nil, err }
	return GetDeliveryException(db, item.ID)
}
'''
    text = text[:start] + new_block + text[next_func:]

    text = text.replace(
        'e.resolution_note, e.replacement_assignment_id::text, e.replacement_captain_id, e.return_started_at, e.returned_at, e.version, e.created_at, e.updated_at`',
        'e.resolution_note, e.replacement_assignment_id::text, e.replacement_captain_id, e.return_started_at, e.return_arrived_at, e.returned_at, e.return_accepted_by_actor_id, e.version, e.created_at, e.updated_at`',
        1,
    )
    text = text.replace(
        '&item.ResolutionNote, &item.ReplacementAssignmentID, &item.ReplacementCaptainID, &item.ReturnStartedAt, &item.ReturnedAt, &item.Version, &item.CreatedAt, &item.UpdatedAt,',
        '&item.ResolutionNote, &item.ReplacementAssignmentID, &item.ReplacementCaptainID, &item.ReturnStartedAt, &item.ReturnArrivedAt, &item.ReturnedAt, &item.ReturnAcceptedByActorID, &item.Version, &item.CreatedAt, &item.UpdatedAt,',
        1,
    )
    write(path, text)


def patch_http() -> None:
    path = "services/dsh/backend/internal/http/dispatch.go"
    text = read(path)
    text = text.replace(
        '// POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/complete\nfunc (s *protectedStoreServer) handleCompleteReturnToStore',
        '// POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/arrive\nfunc (s *protectedStoreServer) handleArriveReturnToStore',
        1,
    )
    text = text.replace(
        'item, err := dispatch.CompleteReturnToStore(s.db, r.PathValue("assignmentId"), actor.ID)',
        'item, err := dispatch.CaptainArriveReturnToStore(s.db, r.PathValue("assignmentId"), actor.ID)',
        1,
    )

    old_map = '''func marshalDeliveryException(item *dispatch.DeliveryException) map[string]any {
	return map[string]any{
		"id":                     item.ID,
		"tenantId":               item.TenantID,
		"assignmentId":           item.AssignmentID,
		"orderId":                item.OrderID,
		"captainId":              item.CaptainID,
		"reasonCode":             string(item.ReasonCode),
		"note":                   item.Note,
		"deliveryStatusAtReport": string(item.DeliveryStatusAtReport),
		"severity":               string(item.Severity),
		"status":                 string(item.Status),
		"correlationId":          item.CorrelationID,
		"reportedLatitude":       item.ReportedLatitude,
		"reportedLongitude":      item.ReportedLongitude,
		"reportedAt":             item.ReportedAt,
		"acknowledgedAt":         item.AcknowledgedAt,
		"resolvedAt":             item.ResolvedAt,
		"resolvedByActorId":      item.ResolvedByActorID,
		"resolutionAction":       item.ResolutionAction,
		"resolutionNote":         item.ResolutionNote,
		"version":                item.Version,
		"createdAt":              item.CreatedAt,
		"updatedAt":              item.UpdatedAt,
	}
}'''
    new_map = '''func marshalDeliveryException(item *dispatch.DeliveryException) map[string]any {
	return map[string]any{
		"id": item.ID, "tenantId": item.TenantID, "assignmentId": item.AssignmentID,
		"orderId": item.OrderID, "captainId": item.CaptainID,
		"reasonCode": string(item.ReasonCode), "note": item.Note,
		"deliveryStatusAtReport": string(item.DeliveryStatusAtReport),
		"severity": string(item.Severity), "status": string(item.Status),
		"correlationId": item.CorrelationID,
		"reportedLatitude": item.ReportedLatitude, "reportedLongitude": item.ReportedLongitude,
		"reportedAt": item.ReportedAt,
		"acknowledgedAt": item.AcknowledgedAt,
		"acknowledgedByActorId": item.AcknowledgedByActorID,
		"resolvedAt": item.ResolvedAt, "resolvedByActorId": item.ResolvedByActorID,
		"resolutionAction": item.ResolutionAction, "resolutionNote": item.ResolutionNote,
		"replacementAssignmentId": item.ReplacementAssignmentID,
		"replacementCaptainId": item.ReplacementCaptainID,
		"returnStartedAt": item.ReturnStartedAt,
		"returnArrivedAt": item.ReturnArrivedAt,
		"returnedAt": item.ReturnedAt,
		"returnAcceptedByActorId": item.ReturnAcceptedByActorID,
		"version": item.Version, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt,
	}
}'''
    if new_map not in text:
        if old_map not in text:
            raise RuntimeError('delivery exception marshal anchor not found')
        text = text.replace(old_map, new_map, 1)
    write(path, text)

    path = "services/dsh/backend/internal/http/partner_delivery.go"
    text = read(path)
    if 'handleGetPartnerReturnToStore' not in text:
        text = text.replace(
            '"dsh-api/internal/partnerdelivery"\n',
            '"dsh-api/internal/dispatch"\n\t"dsh-api/internal/partnerdelivery"\n',
            1,
        )
        text += r'''

// GET /dsh/partner/orders/{orderId}/return-to-store
func (s *protectedStoreServer) handleGetPartnerReturnToStore(w http.ResponseWriter, r *http.Request) {
	order, _, ok := s.partnerOrder(w, r, r.PathValue("orderId"))
	if !ok { return }
	item, err := dispatch.GetPartnerReturnToStore(s.db, order.ID)
	if err != nil { writeDeliveryExceptionError(w, err); return }
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

// POST /dsh/partner/orders/{orderId}/return-to-store/accept
func (s *protectedStoreServer) handleAcceptPartnerReturnToStore(w http.ResponseWriter, r *http.Request) {
	order, actor, ok := s.partnerOrder(w, r, r.PathValue("orderId"))
	if !ok { return }
	item, err := dispatch.AcceptReturnToStoreByPartner(s.db, order.ID, actor.ID)
	if err != nil { writeDeliveryExceptionError(w, err); return }
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}
'''
    write(path, text)

    path = "services/dsh/backend/internal/http/server.go"
    text = read(path)
    text = text.replace(
        '\tmux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/complete", protected.handleCompleteReturnToStore)\n',
        '\tmux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/arrive", protected.handleArriveReturnToStore)\n',
        1,
    )
    partner_anchor = '\tmux.HandleFunc("POST /dsh/partner/orders/{orderId}/delivery/exception", protected.handlePartnerDeliveryException)\n'
    partner_new = partner_anchor + '\tmux.HandleFunc("GET /dsh/partner/orders/{orderId}/return-to-store", protected.handleGetPartnerReturnToStore)\n\tmux.HandleFunc("POST /dsh/partner/orders/{orderId}/return-to-store/accept", protected.handleAcceptPartnerReturnToStore)\n'
    if 'handleGetPartnerReturnToStore' not in text:
        if partner_anchor not in text:
            raise RuntimeError('partner return route anchor not found')
        text = text.replace(partner_anchor, partner_new, 1)
    write(path, text)


def patch_contract() -> None:
    path = "services/dsh/contracts/dsh.openapi.yaml"
    text = read(path)
    text = text.replace('        - returning_to_store\n        - returned_to_store', '        - returning_to_store\n        - return_arrived_store\n        - returned_to_store')
    text = text.replace('enum: [assigned, driver_assigned, driver_arrived_store, picked_up, arrived_customer, returning_to_store, returned_to_store, delivered, cancelled]', 'enum: [assigned, driver_assigned, driver_arrived_store, picked_up, arrived_customer, returning_to_store, return_arrived_store, returned_to_store, delivered, cancelled]')

    old_route_start = '  /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/complete:\n'
    if old_route_start in text:
        start = text.index(old_route_start)
        end = text.index('\n  /', start + len(old_route_start))
        route = '''  /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/arrive:
    parameters:
      - name: assignmentId
        in: path
        required: true
        schema: { type: string, format: uuid }
    post:
      operationId: arriveDshCaptainReturnToStore
      summary: Confirm captain arrival at the store with the returned order.
      description: Does not complete custody; the owning partner must accept the return.
      tags: [DshDispatch]
      security: [{ bearerAuth: [] }]
      responses:
        "200":
          description: Captain arrival recorded; store receipt remains pending.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshDeliveryExceptionResponse" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "404": { $ref: "#/components/responses/NotFound" }
        "409":
          description: Assignment is not in returning_to_store state.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshErrorResponse" }
'''
        text = text[:start] + route + text[end:]

    if '  /dsh/partner/orders/{orderId}/return-to-store:\n' not in text:
        partner_routes = '''  /dsh/partner/orders/{orderId}/return-to-store:
    parameters:
      - name: orderId
        in: path
        required: true
        schema: { type: string, format: uuid }
    get:
      operationId: getDshPartnerReturnToStore
      summary: Read the governed return state for an order owned by the partner.
      tags: [DshDispatch]
      security: [{ bearerAuth: [] }]
      responses:
        "200":
          description: Return state returned.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshDeliveryExceptionResponse" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }

  /dsh/partner/orders/{orderId}/return-to-store/accept:
    parameters:
      - name: orderId
        in: path
        required: true
        schema: { type: string, format: uuid }
    post:
      operationId: acceptDshPartnerReturnToStore
      summary: Confirm store custody of a returned order after captain arrival.
      tags: [DshDispatch]
      security: [{ bearerAuth: [] }]
      responses:
        "200":
          description: Store receipt confirmed and return completed.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshDeliveryExceptionResponse" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }
        "409":
          description: Captain has not arrived or return was already finalized inconsistently.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshErrorResponse" }

'''
        text = text.replace('components:\n', partner_routes + 'components:\n', 1)

    if 'returnArrivedAt:' not in text:
        text = text.replace(
            '        returnStartedAt: { type: string, format: date-time, nullable: true }\n        returnedAt: { type: string, format: date-time, nullable: true }',
            '        returnStartedAt: { type: string, format: date-time, nullable: true }\n        returnArrivedAt: { type: string, format: date-time, nullable: true }\n        returnedAt: { type: string, format: date-time, nullable: true }\n        returnAcceptedByActorId: { type: string, nullable: true }',
            1,
        )
    write(path, text)


def patch_frontend_api() -> None:
    path = "services/dsh/frontend/shared/dispatch/dispatch.api.ts"
    text = read(path)
    text = text.replace('export async function completeCaptainReturnToStore(', 'export async function arriveCaptainReturnToStore(', 1)
    text = text.replace('/return-to-store/complete`', '/return-to-store/arrive`', 1)
    if 'fetchPartnerReturnToStore' not in text:
        anchor = 'export async function fetchClientOrderTracking'
        block = '''export async function fetchPartnerReturnToStore(orderId: string): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/return-to-store`,
  );
  return data.exception;
}

export async function acceptPartnerReturnToStore(orderId: string): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/return-to-store/accept`,
    { method: "POST" },
  );
  return data.exception;
}

'''
        text = text.replace(anchor, block + anchor, 1)
    write(path, text)


def patch_frontend_labels() -> None:
    path = "services/dsh/frontend/shared/dispatch/dispatch.types.ts"
    text = read(path)
    text = text.replace('  returning_to_store: "في طريق العودة إلى المتجر",\n  returned_to_store:', '  returning_to_store: "في طريق العودة إلى المتجر",\n  return_arrived_store: "وصل المرتجع وينتظر استلام المتجر",\n  returned_to_store:', 1)
    write(path, text)

    path = "services/dsh/frontend/shared/orders/orders.types.ts"
    text = read(path)
    text = text.replace('  returning_to_store: "جارٍ إرجاع الطلب إلى المتجر",\n  returned_to_store:', '  returning_to_store: "جارٍ إرجاع الطلب إلى المتجر",\n  return_arrived_store: "وصل المرتجع وينتظر تأكيد المتجر",\n  returned_to_store:', 1)
    write(path, text)


def patch_captain_screen() -> None:
    path = "services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx"
    text = read(path)
    text = text.replace('completeCaptainReturnToStore, fetchCaptainDeliveryException', 'arriveCaptainReturnToStore, fetchCaptainDeliveryException', 1)
    text = text.replace('const [completingReturn, setCompletingReturn]', 'const [arrivingReturn, setArrivingReturn]', 1)
    text = text.replace('setCompletingReturn(true)', 'setArrivingReturn(true)')
    text = text.replace('setCompletingReturn(false)', 'setArrivingReturn(false)')
    text = text.replace('const completeReturn = React.useCallback', 'const arriveReturn = React.useCallback', 1)
    text = text.replace('await completeCaptainReturnToStore(assignmentId);\n      setActiveException(null);\n      onBack?.();', 'const item = await arriveCaptainReturnToStore(assignmentId);\n      setActiveException(item);', 1)

    old = '''    const returningToStore = activeException.resolutionAction === 'return_to_store' && !activeException.returnedAt;
    return (
      <View style={styles.root}>
        <StateView
          tone={returningToStore ? 'warning' : activeException.severity === 'critical' ? 'danger' : 'warning'}
          title={returningToStore ? 'أعد الطلب إلى المتجر' : activeException.status === 'acknowledged' ? 'العمليات تراجع الاستثناء' : 'تم رفع الاستثناء إلى العمليات'}
          description={returningToStore
            ? `اعتمدت العمليات إرجاع الطلب. استمر بتحديث GPS، ثم ثبّت تسليم المرتجع للمتجر. ${activeException.resolutionNote ?? ''}`
            : `${REASON_LABELS[activeException.reasonCode]}${activeException.note ? ` — ${activeException.note}` : ''}. توقفت انتقالات المهمة وإثبات التسليم مؤقتًا، بينما يبقى تحديث GPS فعالًا.`}
          actionLabel={returningToStore ? (completingReturn ? 'جارٍ تثبيت المرتجع…' : 'تأكيد تسليم المرتجع للمتجر') : 'تحديث قرار العمليات'}
          onActionPress={() => returningToStore ? void completeReturn() : void loadException()}
        />'''
    new = '''    const returnInProgress = activeException.resolutionAction === 'return_to_store' && !activeException.returnArrivedAt;
    const awaitingStoreReceipt = activeException.resolutionAction === 'return_to_store' && Boolean(activeException.returnArrivedAt) && !activeException.returnedAt;
    return (
      <View style={styles.root}>
        <StateView
          tone={(returnInProgress || awaitingStoreReceipt) ? 'warning' : activeException.severity === 'critical' ? 'danger' : 'warning'}
          title={returnInProgress ? 'أعد الطلب إلى المتجر' : awaitingStoreReceipt ? 'بانتظار تأكيد استلام المتجر' : activeException.status === 'acknowledged' ? 'العمليات تراجع الاستثناء' : 'تم رفع الاستثناء إلى العمليات'}
          description={returnInProgress
            ? `اعتمدت العمليات إرجاع الطلب. استمر بتحديث GPS، وعند الوصول ثبّت وصولك بالمرتجع. ${activeException.resolutionNote ?? ''}`
            : awaitingStoreReceipt
              ? 'تم تسجيل وصولك بالمرتجع. تبقى المهمة مفتوحة حتى يؤكد المتجر استلام العهدة من تطبيق الشريك.'
              : `${REASON_LABELS[activeException.reasonCode]}${activeException.note ? ` — ${activeException.note}` : ''}. توقفت انتقالات المهمة وإثبات التسليم مؤقتًا، بينما يبقى تحديث GPS فعالًا.`}
          actionLabel={returnInProgress ? (arrivingReturn ? 'جارٍ تسجيل الوصول…' : 'تأكيد الوصول بالمرتجع') : 'تحديث الحالة'}
          onActionPress={() => returnInProgress ? void arriveReturn() : void loadException()}
        />'''
    if new not in text:
        if old not in text:
            raise RuntimeError('captain return state anchor not found')
        text = text.replace(old, new, 1)
    write(path, text)


def patch_partner_screen() -> None:
    path = "services/dsh/frontend/app-partner/orders/PartnerFulfillmentActionsPanel.tsx"
    text = read(path)
    if 'fetchPartnerReturnToStore' not in text:
        text = text.replace(
            "import { usePickupActionsController } from '../../shared/pickup/use-pickup-controller';\n",
            "import { usePickupActionsController } from '../../shared/pickup/use-pickup-controller';\nimport { acceptPartnerReturnToStore, fetchPartnerReturnToStore } from '../../shared/dispatch/dispatch.api';\nimport type { DshDeliveryException } from '../../shared/dispatch/dispatch.types';\n",
            1,
        )
        anchor = 'function PartnerDeliveryActions('
        block = '''function isNotFound(error: unknown): boolean {
  const typed = error as { status?: number; body?: { code?: string } };
  return typed.status === 404 || typed.body?.code === 'NOT_FOUND';
}

function ReturnToStoreReceiptActions({ orderId }: { readonly orderId: string }) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const [state, setState] = React.useState<
    | { readonly kind: 'loading' }
    | { readonly kind: 'none' }
    | { readonly kind: 'ready'; readonly item: DshDeliveryException }
    | { readonly kind: 'error'; readonly message: string }
  >({ kind: 'loading' });
  const [accepting, setAccepting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const item = await fetchPartnerReturnToStore(orderId);
      setState({ kind: 'ready', item });
    } catch (error) {
      if (isNotFound(error)) {
        setState({ kind: 'none' });
        return;
      }
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'تعذر قراءة حالة المرتجع.' });
    }
  }, [orderId]);

  React.useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const accept = React.useCallback(async () => {
    setAccepting(true);
    try {
      const item = await acceptPartnerReturnToStore(orderId);
      setState({ kind: 'ready', item });
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'تعذر تأكيد استلام المرتجع.' });
    } finally {
      setAccepting(false);
    }
  }, [orderId]);

  if (state.kind === 'none') return null;
  if (state.kind === 'loading') return <StateView title="جارٍ قراءة رحلة المرتجع" description="نتحقق من DSH قبل إظهار أي إجراء." loading />;
  if (state.kind === 'error') return <StateView tone="danger" title="تعذر قراءة المرتجع" description={state.message} actionLabel="إعادة المحاولة" onActionPress={() => void load()} />;

  const item = state.item;
  const arrived = Boolean(item.returnArrivedAt);
  const accepted = Boolean(item.returnedAt);
  return (
    <Surface tone="raised" gap={3}>
      <Text role="label" style={{ textAlign }}>استلام مرتجع توصيل بثواني</Text>
      <Text role="bodySm" tone="muted" style={{ textAlign }}>
        لا يتحول الطلب إلى «أعيد إلى المتجر» إلا بعد تأكيدك استلام العهدة فعليًا من الكابتن.
      </Text>
      <Badge
        label={accepted ? 'تم استلام المرتجع' : arrived ? 'الكابتن وصل بالمرتجع' : 'المرتجع في الطريق'}
        tone={accepted ? 'success' : arrived ? 'warning' : 'action'}
      />
      {arrived && !accepted ? (
        <Button
          label={accepting ? 'جارٍ تثبيت الاستلام…' : 'تأكيد استلام المرتجع من الكابتن'}
          disabled={accepting}
          onPress={() => void accept()}
        />
      ) : null}
      {!arrived ? <Text role="caption" tone="muted">لا يوجد إجراء قبل تسجيل وصول الكابتن بالمرتجع.</Text> : null}
      <Button label="تحديث حالة المرتجع" tone="ghost" size="sm" fullWidth={false} disabled={accepting} onPress={() => void load()} />
    </Surface>
  );
}

'''
        text = text.replace(anchor, block + anchor, 1)
    text = text.replace(
        "  if (fulfillmentMode === 'partner_delivery') {",
        "  if (fulfillmentMode === 'bthwani_delivery') {\n    return <ReturnToStoreReceiptActions orderId={orderId} />;\n  }\n  if (fulfillmentMode === 'partner_delivery') {",
        1,
    )
    write(path, text)


def patch_operations() -> None:
    path = "services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx"
    text = read(path)
    text = text.replace(
        "<Badge label={item.returnedAt ? 'استلم المتجر المرتجع' : 'في طريق العودة إلى المتجر'} tone={item.returnedAt ? 'success' : 'warning'} />",
        "<Badge label={item.returnedAt ? 'استلم المتجر المرتجع' : item.returnArrivedAt ? 'وصل المرتجع وينتظر تأكيد المتجر' : 'في طريق العودة إلى المتجر'} tone={item.returnedAt ? 'success' : 'warning'} />",
        1,
    )
    text = text.replace(
        '<Badge label={`مرتجعات قيد المتابعة: ${state.returns.filter((item) => !item.returnedAt).length}`} tone="warning" />',
        '<Badge label={`مرتجعات في الطريق: ${state.returns.filter((item) => !item.returnArrivedAt).length}`} tone="warning" />\n        <Badge label={`بانتظار المتجر: ${state.returns.filter((item) => Boolean(item.returnArrivedAt) && !item.returnedAt).length}`} tone="warning" />',
        1,
    )
    write(path, text)


def patch_client_tracking() -> None:
    path = "services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx"
    text = read(path)
    text = text.replace(
        "if (status === 'returning_to_store' || status === 'returned_to_store')",
        "if (status === 'returning_to_store' || status === 'return_arrived_store' || status === 'returned_to_store')",
        1,
    )
    text = text.replace(
        "{status === 'returned_to_store' ? 'استلم المتجر المرتجع وتراجع العمليات الإغلاق المالي المناسب.' : 'تعذر إكمال التسليم واعتمدت العمليات إعادة الطلب إلى المتجر.'}",
        "{status === 'returned_to_store' ? 'استلم المتجر المرتجع وتراجع العمليات الإغلاق المالي المناسب.' : status === 'return_arrived_store' ? 'وصل المرتجع إلى المتجر وينتظر تأكيد الاستلام من الشريك.' : 'تعذر إكمال التسليم واعتمدت العمليات إعادة الطلب إلى المتجر.'}",
        1,
    )
    write(path, text)


def patch_order_sorting() -> None:
    path = "services/dsh/backend/internal/orders/orders.go"
    text = read(path)
    text = text.replace(
        "WHEN 'returning_to_store' THEN 9\n\t\t\t\t\tWHEN 'returned_to_store' THEN 10\n\t\t\t\t\tWHEN 'delivered' THEN 11",
        "WHEN 'returning_to_store' THEN 9\n\t\t\t\t\tWHEN 'return_arrived_store' THEN 10\n\t\t\t\t\tWHEN 'returned_to_store' THEN 11\n\t\t\t\t\tWHEN 'delivered' THEN 12",
        1,
    )
    write(path, text)


def patch_db_test() -> None:
    path = "services/dsh/backend/internal/dispatch/delivery_return_db_test.go"
    text = read(path)
    old = '''	returned, err := CompleteReturnToStore(db, assignmentID, captainID)
	if err != nil { t.Fatalf("complete return: %v", err) }
	if returned.ReturnedAt == nil { t.Fatalf("returnedAt was not recorded: %+v", returned) }
	if err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil { t.Fatal(err) }
	if orderStatus != "returned_to_store" || deliveryStatus != "returned_to_store" || assignmentStatus != "completed" { t.Fatalf("return completion mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus) }
	if _, err := GetCaptainOpenDeliveryException(db, assignmentID, captainID); !errors.Is(err, ErrNotFound) { t.Fatalf("completed return must leave captain exception view, got %v", err) }
	inbox, err := ListCaptainAssignments(db, captainID, 50)
	if err != nil || len(inbox) != 0 { t.Fatalf("completed return remained active: %+v err=%v", inbox, err) }'''
    new = '''	arrived, err := CaptainArriveReturnToStore(db, assignmentID, captainID)
	if err != nil { t.Fatalf("captain arrive return: %v", err) }
	if arrived.ReturnArrivedAt == nil || arrived.ReturnedAt != nil { t.Fatalf("captain arrival must not complete store receipt: %+v", arrived) }
	if err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil { t.Fatal(err) }
	if orderStatus != "return_arrived_store" || deliveryStatus != "return_arrived_store" || assignmentStatus != "accepted" { t.Fatalf("arrival handshake mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus) }
	if _, err := AcceptReturnToStoreByPartner(db, orderID, "wrong-partner-test"); err != nil {
		// Domain function intentionally relies on HTTP ownership authorization; a valid owning actor is supplied below.
	}
	returned, err := AcceptReturnToStoreByPartner(db, orderID, "partner-return-receipt-test")
	if err != nil { t.Fatalf("partner accept return: %v", err) }
	if returned.ReturnedAt == nil || returned.ReturnAcceptedByActorID == nil { t.Fatalf("partner receipt was not recorded: %+v", returned) }
	if err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil { t.Fatal(err) }
	if orderStatus != "returned_to_store" || deliveryStatus != "returned_to_store" || assignmentStatus != "completed" { t.Fatalf("partner receipt completion mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus) }
	if _, err := GetCaptainOpenDeliveryException(db, assignmentID, captainID); !errors.Is(err, ErrNotFound) { t.Fatalf("accepted return must leave captain exception view, got %v", err) }
	inbox, err := ListCaptainAssignments(db, captainID, 50)
	if err != nil || len(inbox) != 0 { t.Fatalf("partner-accepted return remained active: %+v err=%v", inbox, err) }'''
    if new not in text:
        if old not in text:
            raise RuntimeError('return DB handshake anchor not found')
        text = text.replace(old, new, 1)
    write(path, text)


def main() -> None:
    write_migration()
    patch_status_constants()
    patch_backend_domain()
    patch_http()
    patch_contract()
    patch_frontend_api()
    patch_frontend_labels()
    patch_captain_screen()
    patch_partner_screen()
    patch_operations()
    patch_client_tracking()
    patch_order_sorting()
    patch_db_test()
    print("Dual captain/partner return receipt handshake applied.")


if __name__ == "__main__":
    main()
