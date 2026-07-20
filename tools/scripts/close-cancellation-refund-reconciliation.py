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


def patch_dispatch_backend() -> None:
    path = "services/dsh/backend/internal/dispatch/dispatch.go"
    text = read(path)
    if 'AssignmentCancelled AssignmentStatus = "cancelled"' not in text:
        text = text.replace(
            '\tAssignmentCompleted AssignmentStatus = "completed"\n',
            '\tAssignmentCompleted AssignmentStatus = "completed"\n\tAssignmentCancelled AssignmentStatus = "cancelled"\n',
            1,
        )
    if 'DeliveryCancelled       DeliveryStatus = "cancelled"' not in text:
        text = text.replace(
            '\tDeliveryDelivered       DeliveryStatus = "delivered"\n',
            '\tDeliveryDelivered       DeliveryStatus = "delivered"\n\tDeliveryCancelled       DeliveryStatus = "cancelled"\n',
            1,
        )
    old = '''\trows, err := db.Query(assignmentSelectSQL()+`\n\t\tWHERE a.captain_id = $1\n\t\tORDER BY a.created_at DESC\n\t\tLIMIT $2`, captainID, limit)'''
    new = '''\trows, err := db.Query(assignmentSelectSQL()+`\n\t\tWHERE a.captain_id = $1\n\t\t  AND a.status IN ('offered', 'accepted')\n\t\t  AND d.status <> 'cancelled'\n\t\tORDER BY a.created_at DESC\n\t\tLIMIT $2`, captainID, limit)'''
    if new not in text:
        if old not in text:
            raise RuntimeError("captain active-assignment query anchor not found")
        text = text.replace(old, new, 1)
    write(path, text)


def patch_dispatch_frontend() -> None:
    path = "services/dsh/frontend/shared/dispatch/dispatch.types.ts"
    text = read(path)
    if '| { readonly kind: "cancelled";' not in text:
        text = text.replace(
            '  | { readonly kind: "delivered"; readonly assignment: DshDispatchAssignment }\n',
            '  | { readonly kind: "delivered"; readonly assignment: DshDispatchAssignment }\n'
            '  | { readonly kind: "cancelled"; readonly assignment: DshDispatchAssignment; readonly message: string }\n',
            1,
        )
    if 'cancelled: "ألغيت مهمة التوصيل بسبب إلغاء الطلب"' not in text:
        text = text.replace(
            '  delivered: "تم التسليم",\n};',
            '  delivered: "تم التسليم",\n  cancelled: "ألغيت مهمة التوصيل بسبب إلغاء الطلب",\n};',
            1,
        )
    if 'cancelled: "ألغيت المهمة بسبب إلغاء الطلب"' not in text:
        text = text.replace(
            '  completed: "مكتملة",\n};',
            '  completed: "مكتملة",\n  cancelled: "ألغيت المهمة بسبب إلغاء الطلب",\n};',
            1,
        )
    write(path, text)

    path = "services/dsh/frontend/shared/dispatch/dispatch.states.ts"
    text = read(path)
    marker = 'export function trackingCancelledState('
    if marker not in text:
        text = text.replace(
            '''export function trackingDeliveredState(assignment: DshDispatchAssignment): DshTrackingState {\n  return { kind: "delivered", assignment };\n}\n''',
            '''export function trackingDeliveredState(assignment: DshDispatchAssignment): DshTrackingState {\n  return { kind: "delivered", assignment };\n}\n\nexport function trackingCancelledState(assignment: DshDispatchAssignment): DshTrackingState {\n  return { kind: "cancelled", assignment, message: "ألغيت المهمة بسبب إلغاء الطلب." };\n}\n''',
            1,
        )
    write(path, text)

    path = "services/dsh/frontend/shared/dispatch/dispatch.controller-core.ts"
    text = read(path)
    if 'trackingCancelledState,' not in text:
        text = text.replace('  trackingActiveState,\n', '  trackingActiveState,\n  trackingCancelledState,\n', 1)
    old = '''export function resolveTrackingSuccess(assignment: DshDispatchAssignment): DshTrackingState {\n  return assignment.delivery.status === "delivered"\n    ? trackingDeliveredState(assignment)\n    : trackingActiveState(assignment);\n}'''
    new = '''export function resolveTrackingSuccess(assignment: DshDispatchAssignment): DshTrackingState {\n  if (assignment.status === "cancelled" || assignment.delivery.status === "cancelled") {\n    return trackingCancelledState(assignment);\n  }\n  return assignment.delivery.status === "delivered"\n    ? trackingDeliveredState(assignment)\n    : trackingActiveState(assignment);\n}'''
    if new not in text:
        if old not in text:
            raise RuntimeError("tracking cancellation anchor not found")
        text = text.replace(old, new, 1)
    text = text.replace(
        'if (error.kind === "conflict") return { kind: "error" as const, message: "الحالة الحالية لا تسمح بهذا الانتقال." };',
        'if (error.kind === "conflict") return { kind: "error" as const, message: "ألغيت المهمة أو تغيرت حالتها؛ أغلقت الإجراءات غير الصالحة." };',
        1,
    )
    write(path, text)

    path = "services/dsh/frontend/shared/dispatch/use-dispatch-controller.ts"
    text = read(path)
    replacements = {
        '''    } catch (error) {\n      setActionState(resolveDispatchActionError(classifyDispatchError(error), "accept"));\n    }''':
        '''    } catch (error) {\n      const classified = classifyDispatchError(error);\n      setActionState(resolveDispatchActionError(classified, "accept"));\n      if (classified.kind === "conflict" || classified.kind === "not_found") await load();\n    }''',
        '''    } catch (error) {\n      setActionState(resolveDispatchActionError(classifyDispatchError(error), "decline"));\n    }''':
        '''    } catch (error) {\n      const classified = classifyDispatchError(error);\n      setActionState(resolveDispatchActionError(classified, "decline"));\n      if (classified.kind === "conflict" || classified.kind === "not_found") await load();\n    }''',
        '''    } catch (error) {\n      setActionState(resolveDispatchActionError(classifyDispatchError(error), "status"));\n    }''':
        '''    } catch (error) {\n      const classified = classifyDispatchError(error);\n      setActionState(resolveDispatchActionError(classified, "status"));\n      if (classified.kind === "conflict" || classified.kind === "not_found") await load();\n    }''',
        '''    } catch (error) {\n      setActionState(resolveDispatchActionError(classifyDispatchError(error), "pod"));\n    }''':
        '''    } catch (error) {\n      const classified = classifyDispatchError(error);\n      setActionState(resolveDispatchActionError(classified, "pod"));\n      if (classified.kind === "conflict" || classified.kind === "not_found") await load();\n    }''',
    }
    for old_block, new_block in replacements.items():
        if new_block in text:
            continue
        if old_block not in text:
            raise RuntimeError("captain stale-action refresh anchor not found")
        text = text.replace(old_block, new_block, 1)
    write(path, text)

    path = "services/dsh/frontend/shared/delivery/captain-inbox.model.ts"
    text = read(path)
    if 'export function isCaptainAssignmentActive' not in text:
        text = text.replace(
            'export type CaptainInboxFetchState = Extract<DshCaptainOrdersScreenState, \'ready\' | \'loading\' | \'empty\' | \'error\'>;\n',
            'export type CaptainInboxFetchState = Extract<DshCaptainOrdersScreenState, \'ready\' | \'loading\' | \'empty\' | \'error\'>;\n\n'
            'export function isCaptainAssignmentActive(assignment: DshDispatchAssignment): boolean {\n'
            "  return (assignment.status === 'offered' || assignment.status === 'accepted') && assignment.delivery.status !== 'cancelled';\n"
            '}\n',
            1,
        )
    text = text.replace(
        '''      const data = await fetchCaptainDispatchAssignments();\n      if (requestTokenRef.current !== token) return;\n      setAssignments(data);\n      setFetchState(data.length > 0 ? 'ready' : 'empty');''',
        '''      const data = (await fetchCaptainDispatchAssignments()).filter(isCaptainAssignmentActive);\n      if (requestTokenRef.current !== token) return;\n      setAssignments(data);\n      setFetchState(data.length > 0 ? 'ready' : 'empty');''',
        1,
    )
    old_effect = '''  React.useEffect(() => {\n    refresh();\n  }, [refresh]);'''
    new_effect = '''  React.useEffect(() => {\n    refresh();\n    const interval = setInterval(refresh, 10_000);\n    return () => clearInterval(interval);\n  }, [refresh]);'''
    if new_effect not in text:
        if old_effect not in text:
            raise RuntimeError("captain inbox refresh effect anchor not found")
        text = text.replace(old_effect, new_effect, 1)
    write(path, text)

    path = "services/dsh/frontend/shared/delivery/captain.surface-model.ts"
    text = read(path)
    marker = 'orderModel.setActiveAssignmentId(\'\');\n    orderModel.setActiveOrderId(\'\');'
    if marker not in text:
        anchor = '''  React.useEffect(() => {\n    lifecycle.setInboxState(inboxModel.fetchState);\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [inboxModel.fetchState]);\n'''
        insertion = anchor + '''\n  React.useEffect(() => {\n    if (!orderModel.activeAssignmentId || inboxModel.fetchState === 'loading' || activeAssignment) return;\n    orderModel.setActiveAssignmentId('');\n    orderModel.setActiveOrderId('');\n    orderModel.setActiveOrderExpanded(false);\n    lifecycle.setIsPickupSheetVisible(false);\n    lifecycle.setIsDeliverySheetVisible(false);\n    navModel.goToInbox();\n  }, [\n    activeAssignment,\n    inboxModel.fetchState,\n    lifecycle.setIsDeliverySheetVisible,\n    lifecycle.setIsPickupSheetVisible,\n    navModel.goToInbox,\n    orderModel.activeAssignmentId,\n    orderModel.setActiveAssignmentId,\n    orderModel.setActiveOrderExpanded,\n    orderModel.setActiveOrderId,\n  ]);\n'''
        if anchor not in text:
            raise RuntimeError("captain surface cancellation-close anchor not found")
        text = text.replace(anchor, insertion, 1)
    write(path, text)


def patch_pickup_model_and_service() -> None:
    path = "services/dsh/backend/internal/pickup/pickup.go"
    text = read(path)
    if 'ErrCancelled' not in text:
        text = text.replace(
            '\tErrConflict         = errors.New("pickup state conflict")\n',
            '\tErrConflict         = errors.New("pickup state conflict")\n\tErrCancelled        = errors.New("pickup session cancelled")\n',
            1,
        )
    if 'CancelledAt' not in text:
        text = text.replace(
            '\tUsedAt             *time.Time\n\tVerifiedByActorID',
            '\tUsedAt             *time.Time\n\tCancelledAt        *time.Time\n\tCancellationReason *string\n\tVerifiedByActorID',
            1,
        )
        text = text.replace(
            '\tattempt_count, max_attempts, used_at, verified_by_actor_id, verification_method,\n',
            '\tattempt_count, max_attempts, used_at, cancelled_at, cancellation_reason, verified_by_actor_id, verification_method,\n',
            1,
        )
        text = text.replace(
            '\t\t&s.AttemptCount, &s.MaxAttempts, &s.UsedAt, &s.VerifiedByActorID, &s.VerificationMethod,\n',
            '\t\t&s.AttemptCount, &s.MaxAttempts, &s.UsedAt, &s.CancelledAt, &s.CancellationReason, &s.VerifiedByActorID, &s.VerificationMethod,\n',
            1,
        )
    write(path, text)

    path = "services/dsh/backend/internal/pickup/service.go"
    text = read(path)
    text = text.replace(
        '''func (s *Service) NotifyCustomer(ctx context.Context, orderID, actorID, actorRole, correlationID string) error {''',
        '''func (s *Service) NotifyCustomer(ctx context.Context, orderID, actorID, actorRole, correlationID string) error {''',
        1,
    )
    notify_start = text.index('func (s *Service) NotifyCustomer')
    notify_end = text.index('// IssueOtp', notify_start)
    notify_block = text[notify_start:notify_end].replace(
        'lockPickupOrder(tx, orderID, "")',
        'lockPickupOrder(tx, orderID, orders.StatusReadyForPickup)',
        1,
    )
    text = text[:notify_start] + notify_block + text[notify_end:]

    arrived_start = text.index('func (s *Service) CustomerArrived')
    arrived_end = text.index('// VerifyOtp', arrived_start)
    arrived_block = text[arrived_start:arrived_end].replace(
        'lockPickupOrder(tx, orderID, "")',
        'lockPickupOrder(tx, orderID, orders.StatusReadyForPickup)',
        1,
    )
    text = text[:arrived_start] + arrived_block + text[arrived_end:]

    issue_anchor = '''\t} else {\n\t\tfromJSON = sessionJSON(current)\n\t\tsessionID = current.ID'''
    issue_new = '''\t} else {\n\t\tif current.CancelledAt != nil {\n\t\t\treturn "", nil, ErrCancelled\n\t\t}\n\t\tfromJSON = sessionJSON(current)\n\t\tsessionID = current.ID'''
    if issue_new not in text:
        if issue_anchor not in text:
            raise RuntimeError("pickup issue cancelled guard anchor not found")
        text = text.replace(issue_anchor, issue_new, 1)

    def guard_function(source: str, function_name: str, return_stmt: str) -> str:
        start = source.index(function_name)
        next_func = source.find('\nfunc ', start + len(function_name))
        if next_func == -1:
            next_func = len(source)
        block = source[start:next_func]
        if 'current.CancelledAt != nil' in block:
            return source
        anchor = '''\tcurrent, err := GetForUpdateByOrderID(tx, orderID)\n\tif err != nil {\n\t\treturn ''' + return_stmt + ''', err\n\t}\n'''
        replacement = anchor + '''\tif current.CancelledAt != nil {\n\t\treturn ''' + return_stmt + ''', ErrCancelled\n\t}\n'''
        if anchor not in block:
            raise RuntimeError(f"pickup cancellation guard anchor not found in {function_name}")
        block = block.replace(anchor, replacement, 1)
        return source[:start] + block + source[next_func:]

    text = guard_function(text, 'func (s *Service) VerifyOtp', 'nil')
    text = guard_function(text, 'func (s *Service) NoShow', 'nil')
    text = guard_function(text, 'func (s *Service) ExtendWindow', 'nil')
    write(path, text)

    path = "services/dsh/backend/internal/http/pickup.go"
    text = read(path)
    if 'errors.Is(err, pickup.ErrCancelled)' not in text:
        text = text.replace(
            '''\tcase errors.Is(err, pickup.ErrVersionConflict):\n\t\tstore.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "pickup session version changed; reload before retrying")\n''',
            '''\tcase errors.Is(err, pickup.ErrVersionConflict):\n\t\tstore.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "pickup session version changed; reload before retrying")\n\tcase errors.Is(err, pickup.ErrCancelled):\n\t\tstore.SendError(w, http.StatusConflict, "PICKUP_CANCELLED", "pickup session was cancelled with the order")\n''',
            1,
        )
    old = '''func marshalPickupSession(s *pickup.PickupSession) map[string]any {\n\treturn map[string]any{\n\t\t"id":                 s.ID,\n\t\t"orderId":            s.OrderID,\n\t\t"storeId":            s.StoreID,\n\t\t"clientId":           s.ClientID,\n\t\t"expiresAt":          s.ExpiresAt,\n\t\t"attemptCount":       s.AttemptCount,\n\t\t"maxAttempts":        s.MaxAttempts,\n\t\t"usedAt":             s.UsedAt,\n\t\t"verifiedByActorId":  s.VerifiedByActorID,\n\t\t"verificationMethod": s.VerificationMethod,\n\t\t"version":            s.Version,\n\t\t"createdAt":          s.CreatedAt,\n\t\t"updatedAt":          s.UpdatedAt,\n\t}\n}'''
    new = '''func pickupSessionStatus(s *pickup.PickupSession) string {\n\tif s.CancelledAt != nil {\n\t\treturn "cancelled"\n\t}\n\tif s.UsedAt != nil {\n\t\tif s.VerificationMethod != nil && *s.VerificationMethod == "no_show" {\n\t\t\treturn "no_show"\n\t\t}\n\t\treturn "completed"\n\t}\n\tif !s.ExpiresAt.After(time.Now().UTC()) {\n\t\treturn "expired"\n\t}\n\treturn "active"\n}\n\nfunc marshalPickupSession(s *pickup.PickupSession) map[string]any {\n\treturn map[string]any{\n\t\t"id":                 s.ID,\n\t\t"orderId":            s.OrderID,\n\t\t"storeId":            s.StoreID,\n\t\t"clientId":           s.ClientID,\n\t\t"status":             pickupSessionStatus(s),\n\t\t"expiresAt":          s.ExpiresAt,\n\t\t"attemptCount":       s.AttemptCount,\n\t\t"maxAttempts":        s.MaxAttempts,\n\t\t"usedAt":             s.UsedAt,\n\t\t"cancelledAt":        s.CancelledAt,\n\t\t"cancellationReason": s.CancellationReason,\n\t\t"verifiedByActorId":  s.VerifiedByActorID,\n\t\t"verificationMethod": s.VerificationMethod,\n\t\t"version":            s.Version,\n\t\t"createdAt":          s.CreatedAt,\n\t\t"updatedAt":          s.UpdatedAt,\n\t}\n}'''
    if new not in text:
        if old not in text:
            raise RuntimeError("pickup response lifecycle anchor not found")
        text = text.replace(old, new, 1)
    write(path, text)


def write_pickup_migration() -> None:
    write(
        "services/dsh/database/migrations/dsh-091_pickup_cancellation_state.sql",
        """-- DSH-091: explicit pickup cancellation truth.\n-- A cancelled pickup session is not a used or successfully verified session.\n\nBEGIN;\n\nALTER TABLE dsh_pickup_sessions\n    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,\n    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;\n\n-- Repair rows polluted by the former used_at/verification_method cancellation encoding.\nUPDATE dsh_pickup_sessions\nSET cancelled_at = COALESCE(cancelled_at, used_at, updated_at),\n    cancellation_reason = COALESCE(cancellation_reason, 'order cancelled'),\n    used_at = NULL,\n    verified_by_actor_id = NULL,\n    verification_method = NULL,\n    version = version + 1,\n    updated_at = NOW()\nWHERE verification_method = 'cancelled';\n\nALTER TABLE dsh_pickup_sessions\n    DROP CONSTRAINT IF EXISTS dsh_pickup_sessions_terminal_state_check;\nALTER TABLE dsh_pickup_sessions\n    ADD CONSTRAINT dsh_pickup_sessions_terminal_state_check\n    CHECK (cancelled_at IS NULL OR used_at IS NULL);\n\nCREATE INDEX IF NOT EXISTS idx_dsh_pickup_sessions_cancelled\n    ON dsh_pickup_sessions(cancelled_at DESC)\n    WHERE cancelled_at IS NOT NULL;\n\nCREATE OR REPLACE FUNCTION dsh_cancel_order_dependent_work()\nRETURNS trigger\nLANGUAGE plpgsql\nAS $$\nBEGIN\n    IF NEW.status NOT IN (\n        'cancelled_by_client',\n        'cancelled_by_store',\n        'cancelled_by_operator',\n        'cancelled_no_driver',\n        'failed_payment',\n        'failed_dispatch'\n    ) OR OLD.status = NEW.status THEN\n        RETURN NEW;\n    END IF;\n\n    UPDATE dsh_assignments\n       SET status = 'cancelled',\n           last_latitude = NULL,\n           last_longitude = NULL,\n           location_recorded_at = NULL,\n           updated_at = NOW()\n     WHERE order_id = NEW.id\n       AND status IN ('offered', 'accepted');\n\n    UPDATE dsh_deliveries\n       SET status = 'cancelled',\n           note = COALESCE(NULLIF(note, ''), 'order cancelled'),\n           updated_at = NOW()\n     WHERE order_id = NEW.id\n       AND status <> 'delivered';\n\n    UPDATE dsh_partner_delivery_tasks\n       SET status = 'cancelled', version = version + 1, updated_at = NOW()\n     WHERE order_id = NEW.id\n       AND status NOT IN ('completed', 'cancelled');\n\n    UPDATE dsh_pickup_sessions\n       SET cancelled_at = COALESCE(cancelled_at, NEW.cancelled_at, NOW()),\n           cancellation_reason = COALESCE(\n               cancellation_reason,\n               NULLIF(NEW.cancellation_note, ''),\n               NULLIF(NEW.cancellation_reason_code, ''),\n               'order cancelled'\n           ),\n           version = version + 1,\n           updated_at = NOW()\n     WHERE order_id = NEW.id\n       AND used_at IS NULL\n       AND cancelled_at IS NULL;\n\n    RETURN NEW;\nEND;\n$$;\n\nCOMMIT;\n""",
    )


def patch_wlt_contract() -> None:
    path = "services/wlt/contracts/wlt.openapi.yaml"
    text = read(path)
    if "  version: 0.3.0\n" not in text:
        if "  version: 0.2.0\n" not in text:
            raise RuntimeError("WLT contract version anchor not found")
        text = text.replace("  version: 0.2.0\n", "  version: 0.3.0\n", 1)

    if "  /wlt/order-cancellations:\n" not in text:
        canonical_path = '''  /wlt/order-cancellations:\n    post:\n      operationId: createWltOrderCancellation\n      summary: Resolve the financial consequence of a governed DSH order cancellation.\n      description: >-\n        Internal DSH-to-WLT mutation. WLT validates payment-session ownership and\n        derives all amount and currency values from its own session. It expires an\n        uncollected session, requests one idempotent refund for captured funds, or\n        returns none for an already-terminal session.\n      tags: [WltPaymentSessions]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              $ref: "#/components/schemas/WltOrderCancellationRequest"\n      responses:\n        "200":\n          description: Financial cancellation decision returned.\n          content:\n            application/json:\n              schema:\n                $ref: "#/components/schemas/WltOrderCancellationResponse"\n        "400":\n          description: Missing or invalid cancellation references.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/WltErrorResponse" }\n        "403":\n          $ref: "#/components/responses/Forbidden"\n        "404":\n          $ref: "#/components/responses/NotFound"\n        "409":\n          description: Payment-session ownership or refund reference conflict.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/WltErrorResponse" }\n\n'''
        anchor = "  /wlt/payment-sessions/{paymentSessionId}/cancel-for-order:\n"
        if anchor not in text:
            raise RuntimeError("WLT legacy cancellation path anchor not found")
        text = text.replace(anchor, canonical_path + anchor, 1)

    if "    WltOrderCancellationRequest:\n" not in text:
        schemas = '''    WltOrderCancellationRequest:\n      type: object\n      additionalProperties: false\n      required: [paymentSessionId, orderId, clientId, reason]\n      properties:\n        paymentSessionId:\n          type: string\n          minLength: 1\n        orderId:\n          type: string\n          minLength: 1\n        clientId:\n          type: string\n          minLength: 1\n        reason:\n          type: string\n          minLength: 1\n          maxLength: 1000\n\n    WltOrderCancellationAction:\n      type: string\n      enum: [expired, refund_requested, none]\n      description: WLT-owned decision for the cancelled order's payment session.\n\n    WltOrderCancellationResponse:\n      type: object\n      additionalProperties: false\n      required: [action]\n      properties:\n        action: { $ref: "#/components/schemas/WltOrderCancellationAction" }\n        paymentSession: { $ref: "#/components/schemas/WltPaymentSession" }\n        refund: { $ref: "#/components/schemas/WltRefund" }\n        sessionStatus:\n          type: string\n          description: Present when action is none.\n\n'''
        anchor = "    WltCancelPaymentSessionForOrderRequest:\n"
        if anchor not in text:
            raise RuntimeError("WLT cancellation schema anchor not found")
        text = text.replace(anchor, schemas + anchor, 1)

    legacy_op = "      operationId: cancelWltPaymentSessionForOrder\n"
    if "      deprecated: true\n      operationId: cancelWltPaymentSessionForOrder\n" not in text:
        if legacy_op not in text:
            raise RuntimeError("WLT legacy operation anchor not found")
        text = text.replace(legacy_op, "      deprecated: true\n" + legacy_op, 1)

    write(path, text)


def patch_dsh_pickup_contract() -> None:
    path = "services/dsh/contracts/dsh.openapi.yaml"
    text = read(path)
    if "    DshPickupSessionStatus:\n" in text:
        return
    schema = '''    DshPickupSessionStatus:\n      type: string\n      enum: [active, completed, no_show, expired, cancelled]\n      description: Explicit pickup lifecycle; cancelled is never represented as used or verified.\n\n    DshPickupSessionCancellation:\n      type: object\n      additionalProperties: false\n      required: [status]\n      properties:\n        status: { $ref: "#/components/schemas/DshPickupSessionStatus" }\n        cancelledAt: { type: [string, "null"], format: date-time }\n        cancellationReason: { type: [string, "null"] }\n\n'''
    anchors = [
        "    # ─── Dispatch schemas ───────────────────────────────────────────\n",
        "  securitySchemes:\n",
    ]
    for anchor in anchors:
        if anchor in text:
            text = text.replace(anchor, schema + anchor, 1)
            write(path, text)
            return
    raise RuntimeError("DSH pickup contract insertion anchor not found")


def add_regression_tests() -> None:
    path = "services/dsh/backend/internal/pickup/pickup_db_test.go"
    text = read(path)
    marker = "func TestCancelledPickupCannotBeVerifiedOrExtendedDBIntegration"
    if marker not in text:
        text += '''\n\nfunc TestCancelledPickupCannotBeVerifiedOrExtendedDBIntegration(t *testing.T) {\n\tdb := openRequiredDB(t)\n\tf := seedFixture(t, db, "ready_for_pickup")\n\tsvc := NewService(db)\n\tctx := context.Background()\n\n\tplain, session := issuedSession(t, svc, f)\n\tif _, err := db.ExecContext(ctx, `\n\t\tUPDATE dsh_orders\n\t\tSET status = 'cancelled_by_operator', cancellation_reason_code = 'operational_failure',\n\t\t    cancellation_note = 'pickup cancelled by operations', cancelled_at = NOW()\n\t\tWHERE id = $1::uuid`, f.orderID); err != nil {\n\t\tt.Fatalf("failed to cancel pickup order: %v", err)\n\t}\n\n\tcancelled, err := Get(db, session.ID)\n\tif err != nil {\n\t\tt.Fatalf("failed to reload cancelled pickup: %v", err)\n\t}\n\tif cancelled.CancelledAt == nil || cancelled.UsedAt != nil {\n\t\tt.Fatalf("expected explicit cancellation without usedAt, got cancelledAt=%v usedAt=%v", cancelled.CancelledAt, cancelled.UsedAt)\n\t}\n\tif cancelled.VerificationMethod != nil {\n\t\tt.Fatalf("cancelled pickup must not have a verification method, got %v", *cancelled.VerificationMethod)\n\t}\n\n\tif _, err := svc.VerifyOtp(ctx, f.orderID, plain, "partner-1", "partner", ""); !errors.Is(err, ErrCancelled) {\n\t\tt.Fatalf("expected ErrCancelled from VerifyOtp, got %v", err)\n\t}\n\tif _, err := svc.ExtendWindow(ctx, f.orderID, time.Now().Add(time.Hour), "operator-1", "operator", "retry", ""); !errors.Is(err, ErrCancelled) {\n\t\tt.Fatalf("expected ErrCancelled from ExtendWindow, got %v", err)\n\t}\n}\n'''
        write(path, text)

    path = "services/dsh/tests/dispatch-controller-core.test.mjs"
    text = read(path)
    marker = 'test("resolves cancelled tracking as terminal"'
    if marker not in text:
        insertion = '''\n\n  test("resolves cancelled tracking as terminal", () => {\n    const state = resolveTrackingSuccess({\n      ...assignment,\n      status: "cancelled",\n      delivery: { ...assignment.delivery, status: "cancelled" },\n    });\n    assert.equal(state.kind, "cancelled");\n    assert.equal(nextDeliveryStatus("cancelled"), null);\n  });'''
        text = text.replace('\n  test("validates proof of delivery reference"', insertion + '\n\n  test("validates proof of delivery reference"', 1)
        write(path, text)


def cleanup_temporary_journey_files() -> None:
    paths = [
        ".github/workflows/cancellation-journey-contract.yml",
        ".github/workflows/cancellation-journey-format.yml",
        ".github/workflows/cancellation-journey-recheck.yml",
        ".github/workflows/cancellation-journey-source.yml",
        ".github/cancellation-journey-contract-trigger",
        ".github/cancellation-journey-format-trigger",
        ".github/cancellation-journey-recheck-trigger",
        ".github/cancellation-journey-source-trigger",
        ".github/cancellation-journey-final-trigger",
    ]
    for relative in paths:
        (ROOT / relative).unlink(missing_ok=True)


def main() -> None:
    patch_dispatch_backend()
    patch_dispatch_frontend()
    patch_pickup_model_and_service()
    write_pickup_migration()
    patch_wlt_contract()
    patch_dsh_pickup_contract()
    add_regression_tests()
    cleanup_temporary_journey_files()
    print("Cancellation/refund/reconciliation source closure patch applied.")


if __name__ == "__main__":
    main()
