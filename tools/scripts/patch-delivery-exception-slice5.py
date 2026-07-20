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
        "services/dsh/database/migrations/dsh-093_delivery_return_lifecycle.sql",
        '''-- DSH-093: explicit return-to-store lifecycle after pickup.
-- Returning an order does not create a refund. Financial cancellation remains
-- governed by the existing DSH cancellation -> WLT closure journey.

BEGIN;

ALTER TABLE dsh_orders DROP CONSTRAINT IF EXISTS dsh_orders_status_check;
ALTER TABLE dsh_orders ADD CONSTRAINT dsh_orders_status_check CHECK (status IN (
    'pending','store_accepted','preparing','ready_for_pickup','driver_assigned',
    'driver_arrived_store','picked_up','arrived_customer','returning_to_store',
    'returned_to_store','delivered','cancelled_by_client','cancelled_by_store',
    'cancelled_by_operator','cancelled_no_driver','failed_payment','failed_dispatch'
));

ALTER TABLE dsh_deliveries DROP CONSTRAINT IF EXISTS dsh_deliveries_status_check;
ALTER TABLE dsh_deliveries ADD CONSTRAINT dsh_deliveries_status_check CHECK (status IN (
    'assigned','driver_assigned','driver_arrived_store','picked_up','arrived_customer',
    'returning_to_store','returned_to_store','delivered','cancelled'
));

ALTER TABLE dsh_delivery_exceptions
    ADD COLUMN IF NOT EXISTS return_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

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
                 AND return_started_at IS NULL AND returned_at IS NULL)
                OR
                (resolution_action = 'return_to_store'
                 AND replacement_assignment_id IS NULL
                 AND replacement_captain_id IS NULL
                 AND return_started_at IS NOT NULL
                 AND (returned_at IS NULL OR returned_at >= return_started_at))
                OR
                (resolution_action NOT IN ('reassign_captain','return_to_store')
                 AND replacement_assignment_id IS NULL
                 AND replacement_captain_id IS NULL
                 AND return_started_at IS NULL AND returned_at IS NULL)
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
            AND returned_at IS NULL
        )
    );

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_return_queue
    ON dsh_delivery_exceptions(returned_at, return_started_at DESC)
    WHERE resolution_action = 'return_to_store';

COMMIT;
''',
    )


def patch_status_constants() -> None:
    path = "services/dsh/backend/internal/orders/orders.go"
    text = read(path)
    if 'StatusReturningStore' not in text:
        text = text.replace(
            '\tStatusArrivedCustomer OrderStatus = "arrived_customer"\n\tStatusDelivered',
            '\tStatusArrivedCustomer OrderStatus = "arrived_customer"\n\tStatusReturningStore  OrderStatus = "returning_to_store"\n\tStatusReturnedStore   OrderStatus = "returned_to_store"\n\tStatusDelivered',
            1,
        )
    write(path, text)

    path = "services/dsh/backend/internal/dispatch/dispatch.go"
    text = read(path)
    if 'DeliveryReturningStore' not in text:
        text = text.replace(
            '\tDeliveryArrivedCustomer DeliveryStatus = "arrived_customer"\n\tDeliveryDelivered',
            '\tDeliveryArrivedCustomer DeliveryStatus = "arrived_customer"\n\tDeliveryReturningStore  DeliveryStatus = "returning_to_store"\n\tDeliveryReturnedStore   DeliveryStatus = "returned_to_store"\n\tDeliveryDelivered',
            1,
        )
    write(path, text)


def patch_backend() -> None:
    path = "services/dsh/backend/internal/dispatch/delivery_exceptions.go"
    text = read(path)
    if 'ReturnStartedAt' not in text:
        text = text.replace(
            '\tReplacementCaptainID    *string\n\tVersion',
            '\tReplacementCaptainID    *string\n\tReturnStartedAt        *time.Time\n\tReturnedAt             *time.Time\n\tVersion',
            1,
        )

    block = r'''
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
	if err != nil { return nil, err }
	defer tx.Rollback()
	current, err := getDeliveryExceptionForUpdate(tx, id)
	if err != nil { return nil, err }
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
		if errors.Is(err, sql.ErrNoRows) { return nil, ErrNotFound }
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
	if err != nil { return nil, err }
	if n, _ := res.RowsAffected(); n != 1 { return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict) }
	if err := tx.Commit(); err != nil { return nil, err }
	return GetDeliveryException(db, id)
}

func CompleteReturnToStore(db *sql.DB, assignmentID, captainID string) (*DeliveryException, error) {
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
	if assignmentStatus != AssignmentAccepted || deliveryStatus != DeliveryReturningStore || orderStatus != "returning_to_store" {
		return nil, fmt.Errorf("%w: assignment is not returning to store", ErrConflict)
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
	if _, err := tx.Exec(`UPDATE dsh_deliveries SET status='returned_to_store', updated_at=NOW() WHERE assignment_id=$1::uuid`, assignmentID); err != nil { return nil, err }
	if _, err := tx.Exec(`UPDATE dsh_assignments SET status='completed', completed_at=NOW(), updated_at=NOW() WHERE id=$1::uuid`, assignmentID); err != nil { return nil, err }
	if _, err := tx.Exec(`UPDATE dsh_orders SET status='returned_to_store', updated_at=NOW() WHERE id=$1::uuid`, orderID); err != nil { return nil, err }
	if _, err := tx.Exec(`INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note) VALUES($1::uuid,'captain','returning_to_store','returned_to_store','returned order handed back to store')`, orderID); err != nil { return nil, err }
	if _, err := tx.Exec(`UPDATE dsh_delivery_exceptions SET returned_at=NOW(), version=version+1, updated_at=NOW() WHERE id=$1::uuid AND returned_at IS NULL`, item.ID); err != nil { return nil, err }
	if err := tx.Commit(); err != nil { return nil, err }
	return GetDeliveryException(db, item.ID)
}

'''
    if 'func ResolveDeliveryExceptionReturnToStore' not in text:
        anchor = 'func getDeliveryExceptionForUpdate'
        if anchor not in text: raise RuntimeError('return backend anchor missing')
        text = text.replace(anchor, block + anchor, 1)

    text = text.replace(
        "WHERE e.assignment_id=$1::uuid AND a.captain_id=$2 AND e.status IN ('open','acknowledged')",
        "WHERE e.assignment_id=$1::uuid AND a.captain_id=$2 AND (e.status IN ('open','acknowledged') OR (e.status='resolved' AND e.resolution_action='return_to_store' AND e.returned_at IS NULL))",
        1,
    )
    text = text.replace(
        'e.resolution_note, e.replacement_assignment_id::text, e.replacement_captain_id, e.version, e.created_at, e.updated_at`',
        'e.resolution_note, e.replacement_assignment_id::text, e.replacement_captain_id, e.return_started_at, e.returned_at, e.version, e.created_at, e.updated_at`',
        1,
    )
    text = text.replace(
        '&item.ResolutionNote, &item.ReplacementAssignmentID, &item.ReplacementCaptainID, &item.Version, &item.CreatedAt, &item.UpdatedAt,',
        '&item.ResolutionNote, &item.ReplacementAssignmentID, &item.ReplacementCaptainID, &item.ReturnStartedAt, &item.ReturnedAt, &item.Version, &item.CreatedAt, &item.UpdatedAt,',
        1,
    )
    write(path, text)


def patch_http() -> None:
    path = "services/dsh/backend/internal/http/dispatch.go"
    text = read(path)
    old = '''\tcase "reassign_captain":\n\t\titem, err = dispatch.ResolveDeliveryExceptionReassignCaptain(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.NewCaptainID, body.Note, actor.ID)\n\tdefault:'''
    new = '''\tcase "reassign_captain":\n\t\titem, err = dispatch.ResolveDeliveryExceptionReassignCaptain(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.NewCaptainID, body.Note, actor.ID)\n\tcase "return_to_store":\n\t\titem, err = dispatch.ResolveDeliveryExceptionReturnToStore(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.Note, actor.ID)\n\tdefault:'''
    if new not in text:
        if old not in text: raise RuntimeError('resolve return switch anchor missing')
        text = text.replace(old, new, 1)
    if 'handleCompleteReturnToStore' not in text:
        anchor = '// GET /dsh/client/orders/{orderId}/tracking'
        block = r'''// POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/complete
func (s *protectedStoreServer) handleCompleteReturnToStore(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok { return }
	item, err := dispatch.CompleteReturnToStore(s.db, r.PathValue("assignmentId"), actor.ID)
	if err != nil { writeDeliveryExceptionError(w, err); return }
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

'''
        text = text.replace(anchor, block + anchor, 1)
    if '"returnStartedAt"' not in text:
        text = text.replace(
            '"replacementCaptainId": item.ReplacementCaptainID,',
            '"replacementCaptainId": item.ReplacementCaptainID,\n\t\t"returnStartedAt": item.ReturnStartedAt,\n\t\t"returnedAt": item.ReturnedAt,',
            1,
        )
    write(path, text)

    path = "services/dsh/backend/internal/http/server.go"
    text = read(path)
    anchor = '\tmux.HandleFunc("GET /dsh/captain/dispatch/assignments/{assignmentId}/exceptions", protected.handleGetCaptainDeliveryException)\n'
    new = anchor + '\tmux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/complete", protected.handleCompleteReturnToStore)\n'
    if 'handleCompleteReturnToStore' not in text:
        if anchor not in text: raise RuntimeError('return route anchor missing')
        text = text.replace(anchor, new, 1)
    write(path, text)


def patch_contract() -> None:
    path = "services/dsh/contracts/dsh.openapi.yaml"
    text = read(path)
    text = text.replace('enum: [retry_same_captain, reassign_captain]', 'enum: [retry_same_captain, reassign_captain, return_to_store]', 1)
    for anchor, replacement in [
        ('        - arrived_customer\n        - delivered', '        - arrived_customer\n        - returning_to_store\n        - returned_to_store\n        - delivered'),
        ('enum: [assigned, driver_assigned, driver_arrived_store, picked_up, arrived_customer, delivered, cancelled]', 'enum: [assigned, driver_assigned, driver_arrived_store, picked_up, arrived_customer, returning_to_store, returned_to_store, delivered, cancelled]'),
    ]:
        text = text.replace(anchor, replacement)
    if '  /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/complete:\n' not in text:
        route = '''  /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/complete:\n    parameters:\n      - name: assignmentId\n        in: path\n        required: true\n        schema: { type: string, format: uuid }\n    post:\n      operationId: completeDshCaptainReturnToStore\n      summary: Confirm that a governed returned order was handed back to the store.\n      tags: [DshDispatch]\n      security: [{ bearerAuth: [] }]\n      responses:\n        "200":\n          description: Return completed and assignment closed.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshDeliveryExceptionResponse" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "404": { $ref: "#/components/responses/NotFound" }\n        "409":\n          description: Assignment is not in returning_to_store state.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshErrorResponse" }\n\n'''
        text = text.replace('components:\n', route + 'components:\n', 1)
    if 'returnStartedAt:' not in text:
        text = text.replace(
            '        replacementCaptainId: { type: string, nullable: true }',
            '        replacementCaptainId: { type: string, nullable: true }\n        returnStartedAt: { type: string, format: date-time, nullable: true }\n        returnedAt: { type: string, format: date-time, nullable: true }',
            1,
        )
    write(path, text)


def patch_frontend_shared() -> None:
    path = "services/dsh/frontend/shared/dispatch/dispatch.api.ts"
    text = read(path)
    if 'resolveDeliveryExceptionReturnToStore' not in text:
        anchor = 'export async function fetchClientOrderTracking'
        block = '''export async function resolveDeliveryExceptionReturnToStore(\n  id: string,\n  expectedVersion: number,\n  note: string,\n): Promise<DshDeliveryException> {\n  const data = await request<{ exception: DshDeliveryException }>(\n    `/dsh/operator/delivery-exceptions/${encodeURIComponent(id)}/resolve`,\n    { method: "POST", body: { expectedVersion, action: "return_to_store", note } },\n  );\n  return data.exception;\n}\n\nexport async function completeCaptainReturnToStore(assignmentId: string): Promise<DshDeliveryException> {\n  const data = await request<{ exception: DshDeliveryException }>(\n    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/return-to-store/complete`,\n    { method: "POST" },\n  );\n  return data.exception;\n}\n\n'''
        text = text.replace(anchor, block + anchor, 1)
    write(path, text)

    path = "services/dsh/frontend/shared/dispatch/dispatch.types.ts"
    text = read(path)
    text = text.replace('  arrived_customer: "وصل إلى العميل",\n  delivered:', '  arrived_customer: "وصل إلى العميل",\n  returning_to_store: "في طريق العودة إلى المتجر",\n  returned_to_store: "أعيد إلى المتجر",\n  delivered:', 1)
    write(path, text)

    path = "services/dsh/frontend/shared/orders/orders.types.ts"
    text = read(path)
    text = text.replace('  arrived_customer: "وصل الكابتن للعميل",\n  delivered:', '  arrived_customer: "وصل الكابتن للعميل",\n  returning_to_store: "جارٍ إرجاع الطلب إلى المتجر",\n  returned_to_store: "أعيد الطلب إلى المتجر",\n  delivered:', 1)
    write(path, text)

    path = "services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts"
    text = read(path)
    text = text.replace("  'arrived_customer',\n]);", "  'arrived_customer',\n  'returning_to_store',\n]);", 1)
    write(path, text)


def patch_pod_screen() -> None:
    path = "services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx"
    text = read(path)
    text = text.replace(
        "import { fetchCaptainDeliveryException } from '../../shared/dispatch/dispatch.api';",
        "import { completeCaptainReturnToStore, fetchCaptainDeliveryException } from '../../shared/dispatch/dispatch.api';",
        1,
    )
    if 'const [completingReturn' not in text:
        text = text.replace("  const [reporting, setReporting] = React.useState(false);", "  const [reporting, setReporting] = React.useState(false);\n  const [completingReturn, setCompletingReturn] = React.useState(false);", 1)
    if 'const completeReturn' not in text:
        anchor = '  if (activeException) {'
        block = '''  const completeReturn = React.useCallback(async () => {\n    setCompletingReturn(true);\n    setExceptionLoadError(null);\n    try {\n      await completeCaptainReturnToStore(assignmentId);\n      setActiveException(null);\n      onBack?.();\n    } catch (error) {\n      setExceptionLoadError(error instanceof Error ? error.message : 'تعذر تثبيت تسليم المرتجع للمتجر.');\n    } finally {\n      setCompletingReturn(false);\n    }\n  }, [assignmentId, onBack]);\n\n'''
        text = text.replace(anchor, block + anchor, 1)
    old = '''  if (activeException) {\n    return (\n      <View style={styles.root}>\n        <StateView\n          tone={activeException.severity === 'critical' ? 'danger' : 'warning'}\n          title={activeException.status === 'acknowledged' ? 'العمليات تراجع الاستثناء' : 'تم رفع الاستثناء إلى العمليات'}\n          description={`${REASON_LABELS[activeException.reasonCode]}${activeException.note ? ` — ${activeException.note}` : ''}. توقفت انتقالات المهمة وإثبات التسليم مؤقتًا، بينما يبقى تحديث GPS فعالًا.`}\n          actionLabel="تحديث قرار العمليات"\n          onActionPress={() => void loadException()}\n        />\n        {onBack ? <Button label="العودة إلى المهمة" tone="secondary" onPress={onBack} /> : null}\n      </View>\n    );\n  }'''
    new = '''  if (activeException) {\n    const returningToStore = activeException.resolutionAction === 'return_to_store' && !activeException.returnedAt;\n    return (\n      <View style={styles.root}>\n        <StateView\n          tone={returningToStore ? 'warning' : activeException.severity === 'critical' ? 'danger' : 'warning'}\n          title={returningToStore ? 'أعد الطلب إلى المتجر' : activeException.status === 'acknowledged' ? 'العمليات تراجع الاستثناء' : 'تم رفع الاستثناء إلى العمليات'}\n          description={returningToStore\n            ? `اعتمدت العمليات إرجاع الطلب. استمر بتحديث GPS، ثم ثبّت تسليم المرتجع للمتجر. ${activeException.resolutionNote ?? ''}`\n            : `${REASON_LABELS[activeException.reasonCode]}${activeException.note ? ` — ${activeException.note}` : ''}. توقفت انتقالات المهمة وإثبات التسليم مؤقتًا، بينما يبقى تحديث GPS فعالًا.`}\n          actionLabel={returningToStore ? (completingReturn ? 'جارٍ تثبيت المرتجع…' : 'تأكيد تسليم المرتجع للمتجر') : 'تحديث قرار العمليات'}\n          onActionPress={() => returningToStore ? void completeReturn() : void loadException()}\n        />\n        {exceptionLoadError ? <Text role="caption" tone="danger">{exceptionLoadError}</Text> : null}\n        {onBack ? <Button label="العودة إلى المهمة" tone="secondary" onPress={onBack} /> : null}\n      </View>\n    );\n  }'''
    if new not in text:
        if old not in text: raise RuntimeError('PoD active exception anchor missing')
        text = text.replace(old, new, 1)
    write(path, text)


def patch_client_tracking() -> None:
    path = "services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx"
    text = read(path)
    if "status === 'returning_to_store'" not in text:
        anchor = "function OrderTimeline({ status }: { readonly status: DshOrderStatus }) {\n"
        addition = anchor + "  if (status === 'returning_to_store' || status === 'returned_to_store') {\n    return (\n      <Surface tone={status === 'returned_to_store' ? 'raised' : 'warning'} gap={2}>\n        <Text role=\"bodyStrong\">{ORDER_STATUS_LABELS[status]}</Text>\n        <Text role=\"bodySm\">{status === 'returned_to_store' ? 'استلم المتجر المرتجع وتراجع العمليات الإغلاق المالي المناسب.' : 'تعذر إكمال التسليم واعتمدت العمليات إعادة الطلب إلى المتجر.'}</Text>\n      </Surface>\n    );\n  }\n"
        text = text.replace(anchor, addition, 1)
    write(path, text)


def patch_operations_screen() -> None:
    path = "services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx"
    text = read(path)
    text = text.replace(
        '  resolveDeliveryExceptionReassignCaptain,\n  resolveDeliveryExceptionRetrySameCaptain,',
        '  resolveDeliveryExceptionReassignCaptain,\n  resolveDeliveryExceptionRetrySameCaptain,\n  resolveDeliveryExceptionReturnToStore,',
        1,
    )
    text = text.replace(
        "| { readonly kind: 'ready'; readonly readiness: readonly DshReadinessEscalation[]; readonly delivery: readonly DshDeliveryException[] };",
        "| { readonly kind: 'ready'; readonly readiness: readonly DshReadinessEscalation[]; readonly delivery: readonly DshDeliveryException[]; readonly returns: readonly DshDeliveryException[] };",
        1,
    )
    old = '''      const [readiness, open, acknowledged] = await Promise.all([\n        fetchOperatorEscalations(),\n        fetchOperatorDeliveryExceptions('open'),\n        fetchOperatorDeliveryExceptions('acknowledged'),\n      ]);\n      setState({ kind: 'ready', readiness, delivery: [...open, ...acknowledged] });'''
    new = '''      const [readiness, open, acknowledged, resolved] = await Promise.all([\n        fetchOperatorEscalations(),\n        fetchOperatorDeliveryExceptions('open'),\n        fetchOperatorDeliveryExceptions('acknowledged'),\n        fetchOperatorDeliveryExceptions('resolved'),\n      ]);\n      setState({\n        kind: 'ready',\n        readiness,\n        delivery: [...open, ...acknowledged],\n        returns: resolved.filter((item) => item.resolutionAction === 'return_to_store'),\n      });'''
    if new not in text:
        if old not in text: raise RuntimeError('operations load anchor missing')
        text = text.replace(old, new, 1)
    if 'const resolveReturn' not in text:
        anchor = '  const resolveReadiness = React.useCallback'
        block = '''  const resolveReturn = React.useCallback(async (item: DshDeliveryException) => {\n    if (note.trim().length < 5) {\n      setActionState({ kind: 'error', id: item.id, message: 'اكتب سبب الإرجاع وخطوات التسليم للمتجر.' });\n      return;\n    }\n    setActionState({ kind: 'submitting', id: item.id });\n    try {\n      await resolveDeliveryExceptionReturnToStore(item.id, item.version, note.trim());\n      setSelectedDeliveryId(null);\n      await load();\n    } catch (error) {\n      setActionState({ kind: 'error', id: item.id, message: error instanceof Error ? error.message : 'تعذر بدء إرجاع الطلب.' });\n    }\n  }, [load, note]);\n\n'''
        text = text.replace(anchor, block + anchor, 1)
    text = text.replace(
        '<Badge label={`تصعيدات جاهزية: ${state.readiness.filter((item) => item.status !== \'resolved\').length}`} tone="neutral" />',
        '<Badge label={`مرتجعات قيد المتابعة: ${state.returns.filter((item) => !item.returnedAt).length}`} tone="warning" />\n        <Badge label={`مرتجعات مستلمة: ${state.returns.filter((item) => Boolean(item.returnedAt)).length}`} tone="neutral" />\n        <Badge label={`تصعيدات جاهزية: ${state.readiness.filter((item) => item.status !== \'resolved\').length}`} tone="neutral" />',
        1,
    )
    if 'رحلات الإرجاع إلى المتجر' not in text:
        anchor = '      {selectedDelivery ? ('
        block = '''      <Box gap={3}>\n        <Text role="titleSm" align="start">رحلات الإرجاع إلى المتجر</Text>\n        {state.returns.length === 0 ? (\n          <StateView tone="neutral" title="لا توجد رحلات إرجاع" />\n        ) : state.returns.map((item) => (\n          <Card key={`return-${item.id}`} padding={4} gap={2}>\n            <Text role="bodyStrong" align="start">الطلب: {item.orderId}</Text>\n            <Text role="caption" tone="muted" align="start">الكابتن: {item.captainId}</Text>\n            <Badge label={item.returnedAt ? 'استلم المتجر المرتجع' : 'في طريق العودة إلى المتجر'} tone={item.returnedAt ? 'success' : 'warning'} />\n            <Text role="bodySm" align="start">{item.resolutionNote}</Text>\n            <Button label="فتح الطلب الحي" tone="ghost" size="sm" fullWidth={false} onPress={() => router.push(buildOperationsHref('live-orders', { subGroup: 'queue', orderId: item.orderId }))} />\n          </Card>\n        ))}\n      </Box>\n\n'''
        text = text.replace(anchor, block + anchor, 1)
    text = text.replace(
        '{canReassign(selectedDelivery) ? <Button label="حل: إعادة الإسناد للكابتن البديل" tone="secondary" disabled={!selectedReplacementCaptainId || actionState.kind === \'submitting\'} onPress={() => void resolveReassign(selectedDelivery)} /> : null}',
        '{canReassign(selectedDelivery) ? <Button label="حل: إعادة الإسناد للكابتن البديل" tone="secondary" disabled={!selectedReplacementCaptainId || actionState.kind === \'submitting\'} onPress={() => void resolveReassign(selectedDelivery)} /> : null}\n            {(selectedDelivery.deliveryStatusAtReport === \'picked_up\' || selectedDelivery.deliveryStatusAtReport === \'arrived_customer\') ? <Button label="حل: إرجاع الطلب إلى المتجر" tone="secondary" disabled={actionState.kind === \'submitting\'} onPress={() => void resolveReturn(selectedDelivery)} /> : null}',
        1,
    )
    write(path, text)


def write_db_test() -> None:
    write(
        "services/dsh/backend/internal/dispatch/delivery_return_db_test.go",
        r'''package dispatch

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestDeliveryExceptionReturnToStoreLifecycleDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-return-" + suffix
	storeID := "return-store-" + suffix
	captainID := "return-captain-" + suffix
	clientID := uuid.NewString()
	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Return Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil { t.Fatal(err) }
	var checkoutIntentID string
	if err := db.QueryRow(`INSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('c',64)) RETURNING id::text`, tenantID, clientID, storeID, "return-payment-"+suffix).Scan(&checkoutIntentID); err != nil { t.Fatal(err) }
	var orderID string
	if err := db.QueryRow(`INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id) VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'picked_up',$5) RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "return-payment-"+suffix).Scan(&orderID); err != nil { t.Fatal(err) }
	var assignmentID string
	if err := db.QueryRow(`INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at) VALUES($1::uuid,$2,'operator-1','accepted',NOW()+INTERVAL '90 seconds',NOW()) RETURNING id::text`, orderID, captainID).Scan(&assignmentID); err != nil { t.Fatal(err) }
	if _, err := db.Exec(`INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status) VALUES($1::uuid,$2::uuid,$3,'picked_up')`, assignmentID, orderID, captainID); err != nil { t.Fatal(err) }
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID); _, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID); _, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID) })

	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{ReasonCode: ExceptionRecipientRefused, Note: "رفض العميل استلام الطلب بعد الوصول", CorrelationID: "return-command-" + suffix})
	if err != nil { t.Fatal(err) }
	returning, err := ResolveDeliveryExceptionReturnToStore(db, item.ID, item.Version, "إعادة الطلب إلى المتجر بعد رفض المستلم", "operator-1")
	if err != nil { t.Fatalf("start return: %v", err) }
	if returning.ResolutionAction == nil || *returning.ResolutionAction != "return_to_store" || returning.ReturnStartedAt == nil || returning.ReturnedAt != nil { t.Fatalf("unexpected return start: %+v", returning) }
	var orderStatus, deliveryStatus, assignmentStatus string
	if err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil { t.Fatal(err) }
	if orderStatus != "returning_to_store" || deliveryStatus != "returning_to_store" || assignmentStatus != "accepted" { t.Fatalf("return start mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus) }
	if _, err := PushLocation(db, assignmentID, captainID, PushLocationInput{Latitude: 15.37, Longitude: 44.19}); err != nil { t.Fatalf("GPS must remain active during return: %v", err) }
	visible, err := GetCaptainOpenDeliveryException(db, assignmentID, captainID)
	if err != nil || visible.ID != item.ID { t.Fatalf("return decision must remain visible to captain: %+v err=%v", visible, err) }
	returned, err := CompleteReturnToStore(db, assignmentID, captainID)
	if err != nil { t.Fatalf("complete return: %v", err) }
	if returned.ReturnedAt == nil { t.Fatalf("returnedAt was not recorded: %+v", returned) }
	if err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil { t.Fatal(err) }
	if orderStatus != "returned_to_store" || deliveryStatus != "returned_to_store" || assignmentStatus != "completed" { t.Fatalf("return completion mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus) }
	if _, err := GetCaptainOpenDeliveryException(db, assignmentID, captainID); !errors.Is(err, ErrNotFound) { t.Fatalf("completed return must leave captain exception view, got %v", err) }
	inbox, err := ListCaptainAssignments(db, captainID, 50)
	if err != nil || len(inbox) != 0 { t.Fatalf("completed return remained active: %+v err=%v", inbox, err) }
}
''',
    )


def main() -> None:
    write_migration()
    patch_status_constants()
    patch_backend()
    patch_http()
    patch_contract()
    patch_frontend_shared()
    patch_pod_screen()
    patch_client_tracking()
    patch_operations_screen()
    write_db_test()
    print("Governed return-to-store lifecycle slice applied.")


if __name__ == "__main__":
    main()
