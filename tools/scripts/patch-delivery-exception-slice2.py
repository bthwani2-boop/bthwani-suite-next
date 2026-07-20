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
    if text.count(old) != 1:
        raise RuntimeError(f"{label}: anchor count={text.count(old)}")
    write(path, text.replace(old, new, 1))


def patch_migration() -> None:
    path = "services/dsh/database/migrations/dsh-092_delivery_exception_lifecycle.sql"
    text = read(path)
    if "acknowledged_by_actor_id TEXT" not in text:
        text = text.replace(
            "    acknowledged_at TIMESTAMPTZ,\n    resolved_at TIMESTAMPTZ,",
            "    acknowledged_at TIMESTAMPTZ,\n    acknowledged_by_actor_id TEXT,\n    resolved_at TIMESTAMPTZ,",
            1,
        )
    alter = """
ALTER TABLE dsh_delivery_exceptions
    ADD COLUMN IF NOT EXISTS acknowledged_by_actor_id TEXT;

"""
    if alter.strip() not in text:
        text = text.replace(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_delivery_exceptions_active_assignment",
            alter + "CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_delivery_exceptions_active_assignment",
            1,
        )
    write(path, text)


def patch_backend() -> None:
    path = "services/dsh/backend/internal/dispatch/delivery_exceptions.go"
    text = read(path)
    if "AcknowledgedByActorID" not in text:
        text = text.replace(
            "\tAcknowledgedAt         *time.Time\n\tResolvedAt",
            "\tAcknowledgedAt         *time.Time\n\tAcknowledgedByActorID *string\n\tResolvedAt",
            1,
        )

    block = r'''
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

func getDeliveryExceptionForUpdate(tx *sql.Tx, id string) (*DeliveryException, error) {
	row := tx.QueryRow(`SELECT `+deliveryExceptionColumns+` FROM dsh_delivery_exceptions e WHERE e.id=$1::uuid FOR UPDATE`, id)
	item, err := scanDeliveryException(row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return item, err
}

'''
    if "func AcknowledgeDeliveryException" not in text:
        anchor = "func ensureNoOpenDeliveryException"
        if anchor not in text:
            raise RuntimeError("backend resolution insertion anchor missing")
        text = text.replace(anchor, block + anchor, 1)

    text = text.replace(
        "\te.acknowledged_at, e.resolved_at, e.resolved_by_actor_id, e.resolution_action,",
        "\te.acknowledged_at, e.acknowledged_by_actor_id, e.resolved_at, e.resolved_by_actor_id, e.resolution_action,",
        1,
    )
    text = text.replace(
        "\t\t&item.AcknowledgedAt, &item.ResolvedAt, &item.ResolvedByActorID, &item.ResolutionAction,",
        "\t\t&item.AcknowledgedAt, &item.AcknowledgedByActorID, &item.ResolvedAt, &item.ResolvedByActorID, &item.ResolutionAction,",
        1,
    )
    write(path, text)


def patch_http() -> None:
    path = "services/dsh/backend/internal/http/dispatch.go"
    text = read(path)
    if "handleAcknowledgeDeliveryException" not in text:
        anchor = "// GET /dsh/client/orders/{orderId}/tracking"
        block = r'''// POST /dsh/operator/delivery-exceptions/{exceptionId}/acknowledge
func (s *protectedStoreServer) handleAcknowledgeDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		ExpectedVersion int `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	item, err := dispatch.AcknowledgeDeliveryException(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, actor.ID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

// POST /dsh/operator/delivery-exceptions/{exceptionId}/resolve
func (s *protectedStoreServer) handleResolveDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Action          string `json:"action"`
		Note            string `json:"note"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.Action != "retry_same_captain" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "only retry_same_captain is enabled in this journey slice")
		return
	}
	item, err := dispatch.ResolveDeliveryExceptionRetrySameCaptain(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.Note, actor.ID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

'''
        text = text.replace(anchor, block + anchor, 1)
    if '"acknowledgedByActorId"' not in text:
        text = text.replace(
            '"acknowledgedAt": item.AcknowledgedAt,',
            '"acknowledgedAt": item.AcknowledgedAt,\n\t\t"acknowledgedByActorId": item.AcknowledgedByActorID,',
            1,
        )
    write(path, text)

    path = "services/dsh/backend/internal/http/server.go"
    text = read(path)
    anchor = '\tmux.HandleFunc("GET /dsh/operator/delivery-exceptions", protected.handleListOperatorDeliveryExceptions)\n'
    new = anchor + '\tmux.HandleFunc("POST /dsh/operator/delivery-exceptions/{exceptionId}/acknowledge", protected.handleAcknowledgeDeliveryException)\n\tmux.HandleFunc("POST /dsh/operator/delivery-exceptions/{exceptionId}/resolve", protected.handleResolveDeliveryException)\n'
    if "handleAcknowledgeDeliveryException" not in text:
        if anchor not in text:
            raise RuntimeError("server operator exception route anchor missing")
        text = text.replace(anchor, new, 1)
    write(path, text)


def patch_contract() -> None:
    path = "services/dsh/contracts/dsh.openapi.yaml"
    text = read(path)
    if "  /dsh/operator/delivery-exceptions/{exceptionId}/acknowledge:\n" not in text:
        paths = '''  /dsh/operator/delivery-exceptions/{exceptionId}/acknowledge:\n    parameters:\n      - name: exceptionId\n        in: path\n        required: true\n        schema: { type: string, format: uuid }\n    post:\n      operationId: acknowledgeDshOperatorDeliveryException\n      summary: Acknowledge an open delivery exception for operations review.\n      tags: [DshDispatch]\n      security: [{ bearerAuth: [] }]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { $ref: "#/components/schemas/DshAcknowledgeDeliveryExceptionRequest" }\n      responses:\n        "200":\n          description: Exception acknowledged.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshDeliveryExceptionResponse" }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "404": { $ref: "#/components/responses/NotFound" }\n        "409":\n          description: Version or lifecycle conflict.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshErrorResponse" }\n\n  /dsh/operator/delivery-exceptions/{exceptionId}/resolve:\n    parameters:\n      - name: exceptionId\n        in: path\n        required: true\n        schema: { type: string, format: uuid }\n    post:\n      operationId: resolveDshOperatorDeliveryException\n      summary: Resolve an exception by allowing the same captain to retry from the preserved stage.\n      tags: [DshDispatch]\n      security: [{ bearerAuth: [] }]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { $ref: "#/components/schemas/DshResolveDeliveryExceptionRequest" }\n      responses:\n        "200":\n          description: Exception resolved and delivery progression reopened.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshDeliveryExceptionResponse" }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "404": { $ref: "#/components/responses/NotFound" }\n        "409":\n          description: Version conflict or assignment no longer eligible for retry.\n          content:\n            application/json:\n              schema: { $ref: "#/components/schemas/DshErrorResponse" }\n\n'''
        text = text.replace("components:\n", paths + "components:\n", 1)

    if "    DshAcknowledgeDeliveryExceptionRequest:\n" not in text:
        schemas = '''    DshAcknowledgeDeliveryExceptionRequest:\n      type: object\n      additionalProperties: false\n      required: [expectedVersion]\n      properties:\n        expectedVersion: { type: integer, minimum: 1 }\n\n    DshResolveDeliveryExceptionRequest:\n      type: object\n      additionalProperties: false\n      required: [expectedVersion, action, note]\n      properties:\n        expectedVersion: { type: integer, minimum: 1 }\n        action:\n          type: string\n          enum: [retry_same_captain]\n        note: { type: string, minLength: 5, maxLength: 1000 }\n\n'''
        text = text.replace("  schemas:\n", "  schemas:\n" + schemas, 1)

    if "acknowledgedByActorId:" not in text:
        text = text.replace(
            "        acknowledgedAt: { type: string, format: date-time, nullable: true }",
            "        acknowledgedAt: { type: string, format: date-time, nullable: true }\n        acknowledgedByActorId: { type: string, nullable: true }",
            1,
        )
    write(path, text)


def patch_frontend_api() -> None:
    path = "services/dsh/frontend/shared/dispatch/dispatch.api.ts"
    text = read(path)
    if "fetchOperatorDeliveryExceptions" not in text:
        anchor = "export async function fetchClientOrderTracking"
        block = '''export async function fetchOperatorDeliveryExceptions(status: "open" | "acknowledged" | "resolved"): Promise<readonly DshDeliveryException[]> {\n  const data = await request<{ exceptions: DshDeliveryException[] }>(\n    `/dsh/operator/delivery-exceptions?status=${encodeURIComponent(status)}`,\n  );\n  return data.exceptions ?? [];\n}\n\nexport async function acknowledgeDeliveryException(id: string, expectedVersion: number): Promise<DshDeliveryException> {\n  const data = await request<{ exception: DshDeliveryException }>(\n    `/dsh/operator/delivery-exceptions/${encodeURIComponent(id)}/acknowledge`,\n    { method: "POST", body: { expectedVersion } },\n  );\n  return data.exception;\n}\n\nexport async function resolveDeliveryExceptionRetrySameCaptain(\n  id: string,\n  expectedVersion: number,\n  note: string,\n): Promise<DshDeliveryException> {\n  const data = await request<{ exception: DshDeliveryException }>(\n    `/dsh/operator/delivery-exceptions/${encodeURIComponent(id)}/resolve`,\n    { method: "POST", body: { expectedVersion, action: "retry_same_captain", note } },\n  );\n  return data.exception;\n}\n\n'''
        if anchor not in text:
            raise RuntimeError("dispatch operator API anchor missing")
        text = text.replace(anchor, block + anchor, 1)
    write(path, text)


def write_control_panel_screen() -> None:
    write(
        "services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx",
        ''''use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Box, Button, Card, StateView, Text, TextField } from '@bthwani/ui-kit';
import {
  ESCALATION_CATEGORY_LABELS,
  ESCALATION_SEVERITY_LABELS,
  fetchOperatorEscalations,
  updateEscalation,
  type DshReadinessEscalation,
} from '../../shared/field-readiness';
import {
  acknowledgeDeliveryException,
  fetchOperatorDeliveryExceptions,
  resolveDeliveryExceptionRetrySameCaptain,
} from '../../shared/dispatch/dispatch.api';
import type { DshDeliveryException } from '../../shared/dispatch/dispatch.types';
import { buildOperationsHref } from './operations.registry';

export type ExceptionsEscalationsScreenProps = { readonly hubHref: string; readonly subGroup?: string };

type WorkspaceState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly readiness: readonly DshReadinessEscalation[]; readonly delivery: readonly DshDeliveryException[] };

type ActionState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting'; readonly id: string }
  | { readonly kind: 'error'; readonly id: string; readonly message: string };

const DELIVERY_EXCEPTION_REASON_LABELS: Record<DshDeliveryException['reasonCode'], string> = {
  customer_unreachable: 'تعذر الوصول إلى العميل',
  recipient_refused: 'رفض المستلم',
  wrong_address: 'العنوان غير صحيح',
  unsafe_location: 'الموقع غير آمن',
  vehicle_breakdown: 'عطل المركبة',
  accident: 'حادث',
  damaged_order: 'تضرر الطلب',
  cash_collection_issue: 'تعذر تحصيل النقد',
  weather_or_road_block: 'طقس أو طريق مغلق',
  proof_unavailable: 'تعذر إثبات التسليم',
  other: 'سبب آخر',
};

function exceptionTone(severity: DshDeliveryException['severity']): 'danger' | 'warning' | 'neutral' {
  if (severity === 'critical') return 'danger';
  if (severity === 'high') return 'warning';
  return 'neutral';
}

export function ExceptionsEscalationsScreen({ hubHref }: ExceptionsEscalationsScreenProps) {
  const router = useRouter();
  const [state, setState] = React.useState<WorkspaceState>({ kind: 'loading' });
  const [selectedReadinessId, setSelectedReadinessId] = React.useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');
  const [actionState, setActionState] = React.useState<ActionState>({ kind: 'idle' });

  const load = React.useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const [readiness, open, acknowledged] = await Promise.all([
        fetchOperatorEscalations(),
        fetchOperatorDeliveryExceptions('open'),
        fetchOperatorDeliveryExceptions('acknowledged'),
      ]);
      setState({ kind: 'ready', readiness, delivery: [...open, ...acknowledged] });
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'تعذر تحميل الاستثناءات الحية من DSH.' });
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { setNote(''); setActionState({ kind: 'idle' }); }, [selectedReadinessId, selectedDeliveryId]);

  const acknowledge = React.useCallback(async (item: DshDeliveryException) => {
    setActionState({ kind: 'submitting', id: item.id });
    try {
      await acknowledgeDeliveryException(item.id, item.version);
      setSelectedDeliveryId(null);
      await load();
    } catch (error) {
      setActionState({ kind: 'error', id: item.id, message: error instanceof Error ? error.message : 'تعذر اعتماد الاستثناء.' });
    }
  }, [load]);

  const resolveRetry = React.useCallback(async (item: DshDeliveryException) => {
    if (note.trim().length < 5) {
      setActionState({ kind: 'error', id: item.id, message: 'اكتب قرارًا تشغيليًا واضحًا من خمسة أحرف على الأقل.' });
      return;
    }
    setActionState({ kind: 'submitting', id: item.id });
    try {
      await resolveDeliveryExceptionRetrySameCaptain(item.id, item.version, note.trim());
      setSelectedDeliveryId(null);
      await load();
    } catch (error) {
      setActionState({ kind: 'error', id: item.id, message: error instanceof Error ? error.message : 'تعذر حل الاستثناء.' });
    }
  }, [load, note]);

  const resolveReadiness = React.useCallback(async (item: DshReadinessEscalation, status: 'acknowledged' | 'resolved') => {
    if (status === 'resolved' && note.trim().length < 5) {
      setActionState({ kind: 'error', id: item.id, message: 'اكتب نتيجة حل واضحة من خمسة أحرف على الأقل.' });
      return;
    }
    setActionState({ kind: 'submitting', id: item.id });
    try {
      await updateEscalation(item.id, { status, resolutionNote: note.trim() || 'تم استلام التصعيد وبدء المراجعة التشغيلية.' });
      setSelectedReadinessId(null);
      await load();
    } catch (error) {
      setActionState({ kind: 'error', id: item.id, message: error instanceof Error ? error.message : 'تعذر حفظ التصعيد.' });
    }
  }, [load, note]);

  if (state.kind === 'loading') return <StateView loading title="جارٍ تحميل الاستثناءات الحية من DSH" />;
  if (state.kind === 'error') return <StateView tone="danger" title="تعذر تحميل مساحة الاستثناءات" description={state.message} actionLabel="إعادة المحاولة" onActionPress={load} />;

  const selectedDelivery = state.delivery.find((item) => item.id === selectedDeliveryId) ?? null;
  const selectedReadiness = state.readiness.find((item) => item.id === selectedReadinessId) ?? null;

  return (
    <Box gap={4}>
      <Box flexDirection="row" gap={2} flexWrap="wrap" justifyContent="space-between">
        <Box gap={1}>
          <Text role="titleMd" align="start">الاستثناءات والتصعيدات</Text>
          <Text role="caption" tone="muted" align="start">طابور حقيقي من DSH؛ لا توجد طلبات ملغاة أو بيانات محلية بديلة داخل هذه الشاشة.</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Button label="تحديث" tone="secondary" onPress={() => void load()} />
          <Button label="العودة لمركز العمليات" tone="ghost" onPress={() => router.push(hubHref)} />
        </Box>
      </Box>

      <Box flexDirection="row" gap={2} flexWrap="wrap">
        <Badge label={`استثناءات توصيل نشطة: ${state.delivery.length}`} tone={state.delivery.length ? 'warning' : 'success'} />
        <Badge label={`تصعيدات جاهزية: ${state.readiness.filter((item) => item.status !== 'resolved').length}`} tone="neutral" />
      </Box>

      <Box flexDirection="row" gap={4} alignItems="flex-start" flexWrap="wrap">
        <Box flex={1} minWidth={340} gap={3}>
          <Text role="titleSm" align="start">استثناءات التوصيل الحاكمة</Text>
          {state.delivery.length === 0 ? <StateView tone="success" title="لا توجد استثناءات توصيل نشطة" /> : state.delivery.map((item) => (
            <Card key={item.id} padding={4} gap={2}>
              <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Box gap={1} flex={1}>
                  <Text role="bodyStrong" align="start">{DELIVERY_EXCEPTION_REASON_LABELS[item.reasonCode]}</Text>
                  <Text role="caption" tone="muted" align="start">الطلب: {item.orderId} · الكابتن: {item.captainId}</Text>
                  <Text role="caption" tone="muted" align="start">المرحلة المحفوظة: {item.deliveryStatusAtReport}</Text>
                  {item.note ? <Text role="bodySm" align="start">{item.note}</Text> : null}
                </Box>
                <Box gap={1} alignItems="flex-end">
                  <Badge label={item.severity} tone={exceptionTone(item.severity)} />
                  <Badge label={item.status === 'open' ? 'جديد' : 'قيد المراجعة'} tone={item.status === 'open' ? 'danger' : 'warning'} />
                </Box>
              </Box>
              <Box flexDirection="row" gap={2} flexWrap="wrap">
                <Button label="فتح القرار" tone="secondary" size="sm" onPress={() => { setSelectedReadinessId(null); setSelectedDeliveryId(item.id); }} />
                <Button label="فتح الطلب الحي" tone="ghost" size="sm" onPress={() => router.push(buildOperationsHref('live-orders', { subGroup: 'queue', orderId: item.orderId }))} />
              </Box>
            </Card>
          ))}
        </Box>

        <Box flex={1} minWidth={340} gap={3}>
          <Text role="titleSm" align="start">تصعيدات الجاهزية</Text>
          {state.readiness.length === 0 ? <StateView tone="neutral" title="لا توجد تصعيدات جاهزية" /> : state.readiness.map((item) => (
            <Card key={item.id} padding={4} gap={2}>
              <Text role="bodyStrong" align="start">{ESCALATION_CATEGORY_LABELS[item.category] ?? item.category}</Text>
              <Text role="caption" tone="muted" align="start">{item.description}</Text>
              <Badge label={ESCALATION_SEVERITY_LABELS[item.severity] ?? item.severity} tone={item.severity === 'critical' || item.severity === 'high' ? 'danger' : 'neutral'} />
              {item.status !== 'resolved' ? <Button label="فتح التصعيد" tone="secondary" size="sm" onPress={() => { setSelectedDeliveryId(null); setSelectedReadinessId(item.id); }} /> : null}
            </Card>
          ))}
        </Box>
      </Box>

      {selectedDelivery ? (
        <Card padding={4} gap={3}>
          <Text role="titleSm" align="start">قرار استثناء التوصيل {selectedDelivery.id}</Text>
          <Text role="bodySm" align="start">يبقى الطلب في مرحلته الحالية. حل «إعادة المحاولة» يرفع الحظر فقط ولا ينشئ نجاحًا محليًا.</Text>
          <TextField label="قرار العمليات" value={note} onChangeText={setNote} placeholder="سجل سبب السماح بإعادة المحاولة" multiline />
          {actionState.kind === 'error' && actionState.id === selectedDelivery.id ? <Text role="caption" tone="danger">{actionState.message}</Text> : null}
          <Box flexDirection="row" gap={2} flexWrap="wrap">
            {selectedDelivery.status === 'open' ? <Button label="اعتماد وبدء المراجعة" tone="secondary" disabled={actionState.kind === 'submitting'} onPress={() => void acknowledge(selectedDelivery)} /> : null}
            <Button label="حل: إعادة المحاولة مع الكابتن نفسه" tone="primary" disabled={actionState.kind === 'submitting'} onPress={() => void resolveRetry(selectedDelivery)} />
            <Button label="إغلاق التفاصيل" tone="ghost" onPress={() => setSelectedDeliveryId(null)} />
          </Box>
        </Card>
      ) : null}

      {selectedReadiness ? (
        <Card padding={4} gap={3}>
          <Text role="titleSm" align="start">إجراء على تصعيد الجاهزية {selectedReadiness.id}</Text>
          <TextField label="ملاحظات المراجعة أو الحل" value={note} onChangeText={setNote} placeholder="اكتب نتيجة تشغيلية قابلة للتدقيق" multiline />
          {actionState.kind === 'error' && actionState.id === selectedReadiness.id ? <Text role="caption" tone="danger">{actionState.message}</Text> : null}
          <Box flexDirection="row" gap={2}>
            {selectedReadiness.status === 'open' ? <Button label="تأكيد الاستلام" tone="secondary" onPress={() => void resolveReadiness(selectedReadiness, 'acknowledged')} /> : null}
            <Button label="حل وإغلاق" tone="primary" onPress={() => void resolveReadiness(selectedReadiness, 'resolved')} />
            <Button label="إغلاق التفاصيل" tone="ghost" onPress={() => setSelectedReadinessId(null)} />
          </Box>
        </Card>
      ) : null}
    </Box>
  );
}

export default ExceptionsEscalationsScreen;
''',
    )


def write_tsconfig() -> None:
    write(
        "apps/control-panel/runtime/tsconfig.delivery-exception-journey.json",
        '''{
  "extends": "./tsconfig.json",
  "include": [
    "next-env.d.ts",
    "../../../services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx",
    "../../../services/dsh/frontend/control-panel/operations/operations.registry.ts",
    "../../../services/dsh/frontend/shared/dispatch/**/*.ts",
    "../../../services/dsh/frontend/shared/field-readiness/**/*.ts",
    "../../../services/dsh/frontend/shared/_kernel/**/*.ts",
    "../../../services/dsh/clients/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "dist", "build"]
}
''',
    )


def patch_db_test() -> None:
    path = "services/dsh/backend/internal/dispatch/delivery_exceptions_db_test.go"
    text = read(path)
    marker = '''\tif !found {\n\t\tt.Fatalf("reported exception missing from operator queue")\n\t}\n}'''
    replacement = '''\tif !found {\n\t\tt.Fatalf("reported exception missing from operator queue")\n\t}\n\n\tacknowledged, err := AcknowledgeDeliveryException(db, item.ID, item.Version, "operator-1")\n\tif err != nil {\n\t\tt.Fatalf("acknowledge delivery exception: %v", err)\n\t}\n\tif acknowledged.Status != DeliveryExceptionAcknowledged || acknowledged.AcknowledgedByActorID == nil {\n\t\tt.Fatalf("unexpected acknowledged state: %+v", acknowledged)\n\t}\n\n\tresolved, err := ResolveDeliveryExceptionRetrySameCaptain(db, item.ID, acknowledged.Version, "تم التواصل مع العميل والسماح بإعادة المحاولة", "operator-1")\n\tif err != nil {\n\t\tt.Fatalf("resolve delivery exception: %v", err)\n\t}\n\tif resolved.Status != DeliveryExceptionResolved || resolved.ResolutionAction == nil || *resolved.ResolutionAction != "retry_same_captain" {\n\t\tt.Fatalf("unexpected resolved state: %+v", resolved)\n\t}\n\n\tif _, err := SubmitPoD(db, assignmentID, captainID, PoDInput{Method: "photo", Reference: "retry-proof"}); err != nil {\n\t\tt.Fatalf("proof must reopen after operations resolution: %v", err)\n\t}\n\n\treplayedAfterResolution, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{\n\t\tReasonCode: ExceptionCustomerUnreachable,\n\t\tNote: "اتصل الكابتن عدة مرات دون استجابة",\n\t\tCorrelationID: correlationID,\n\t})\n\tif err != nil || replayedAfterResolution.ID != item.ID || replayedAfterResolution.Status != DeliveryExceptionResolved {\n\t\tt.Fatalf("expected state-independent idempotent replay, got %+v err=%v", replayedAfterResolution, err)\n\t}\n}'''
    if replacement not in text:
        if marker not in text:
            raise RuntimeError("DB test extension anchor missing")
        text = text.replace(marker, replacement, 1)
    write(path, text)


def main() -> None:
    patch_migration()
    patch_backend()
    patch_http()
    patch_contract()
    patch_frontend_api()
    write_control_panel_screen()
    write_tsconfig()
    patch_db_test()
    print("Delivery exception operator resolution slice applied.")


if __name__ == "__main__":
    main()
