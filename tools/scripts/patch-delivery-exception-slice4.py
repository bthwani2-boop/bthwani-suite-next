from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def patch_migration() -> None:
    path = "services/dsh/database/migrations/dsh-092_delivery_exception_lifecycle.sql"
    text = read(path)
    block = '''
ALTER TABLE dsh_delivery_exceptions
    ADD COLUMN IF NOT EXISTS replacement_assignment_id UUID REFERENCES dsh_assignments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS replacement_captain_id TEXT;

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
                 AND NULLIF(BTRIM(replacement_captain_id), '') IS NOT NULL)
                OR
                (resolution_action <> 'reassign_captain'
                 AND replacement_assignment_id IS NULL
                 AND replacement_captain_id IS NULL)
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
        )
    );

'''
    if "replacement_assignment_id UUID" not in text:
        text = text.replace(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_delivery_exceptions_active_assignment",
            block + "CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_delivery_exceptions_active_assignment",
            1,
        )
    write(path, text)


def patch_backend() -> None:
    path = "services/dsh/backend/internal/dispatch/delivery_exceptions.go"
    text = read(path)
    if "ReplacementAssignmentID" not in text:
        text = text.replace(
            "\tResolutionNote         *string\n\tVersion",
            "\tResolutionNote         *string\n\tReplacementAssignmentID *string\n\tReplacementCaptainID    *string\n\tVersion",
            1,
        )

    block = r'''
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

'''
    if "func ResolveDeliveryExceptionReassignCaptain" not in text:
        anchor = "func getDeliveryExceptionForUpdate"
        if anchor not in text:
            raise RuntimeError("reassignment backend anchor not found")
        text = text.replace(anchor, block + anchor, 1)

    text = text.replace(
        "\te.resolution_note, e.version, e.created_at, e.updated_at`",
        "\te.resolution_note, e.replacement_assignment_id::text, e.replacement_captain_id, e.version, e.created_at, e.updated_at`",
        1,
    )
    text = text.replace(
        "\t\t&item.ResolutionNote, &item.Version, &item.CreatedAt, &item.UpdatedAt,",
        "\t\t&item.ResolutionNote, &item.ReplacementAssignmentID, &item.ReplacementCaptainID, &item.Version, &item.CreatedAt, &item.UpdatedAt,",
        1,
    )
    write(path, text)


def patch_http() -> None:
    path = "services/dsh/backend/internal/http/dispatch.go"
    text = read(path)
    old = '''\tvar body struct {\n\t\tExpectedVersion int    `json:"expectedVersion"`\n\t\tAction          string `json:"action"`\n\t\tNote            string `json:"note"`\n\t}\n'''
    new = '''\tvar body struct {\n\t\tExpectedVersion int    `json:"expectedVersion"`\n\t\tAction          string `json:"action"`\n\t\tNote            string `json:"note"`\n\t\tNewCaptainID    string `json:"newCaptainId"`\n\t}\n'''
    if new not in text:
        if old not in text:
            raise RuntimeError("resolve body anchor not found")
        text = text.replace(old, new, 1)
    old = '''\tif body.Action != "retry_same_captain" {\n\t\tstore.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "only retry_same_captain is enabled in this journey slice")\n\t\treturn\n\t}\n\titem, err := dispatch.ResolveDeliveryExceptionRetrySameCaptain(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.Note, actor.ID)'''
    new = '''\tvar item *dispatch.DeliveryException\n\tvar err error\n\tswitch body.Action {\n\tcase "retry_same_captain":\n\t\titem, err = dispatch.ResolveDeliveryExceptionRetrySameCaptain(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.Note, actor.ID)\n\tcase "reassign_captain":\n\t\titem, err = dispatch.ResolveDeliveryExceptionReassignCaptain(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.NewCaptainID, body.Note, actor.ID)\n\tdefault:\n\t\tstore.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "unsupported delivery exception resolution action")\n\t\treturn\n\t}'''
    if new not in text:
        if old not in text:
            raise RuntimeError("resolve action anchor not found")
        text = text.replace(old, new, 1)
    if '"replacementAssignmentId"' not in text:
        text = text.replace(
            '"resolutionNote": item.ResolutionNote,',
            '"resolutionNote": item.ResolutionNote,\n\t\t"replacementAssignmentId": item.ReplacementAssignmentID,\n\t\t"replacementCaptainId": item.ReplacementCaptainID,',
            1,
        )
    write(path, text)


def patch_contract() -> None:
    path = "services/dsh/contracts/dsh.openapi.yaml"
    text = read(path)
    text = text.replace("          enum: [retry_same_captain]", "          enum: [retry_same_captain, reassign_captain]", 1)
    anchor = "        note: { type: string, minLength: 5, maxLength: 1000 }\n"
    addition = anchor + "        newCaptainId:\n          type: string\n          minLength: 1\n          description: Required only when action is reassign_captain.\n"
    if "description: Required only when action is reassign_captain." not in text:
        if anchor not in text:
            raise RuntimeError("resolve request schema anchor not found")
        text = text.replace(anchor, addition, 1)
    if "replacementAssignmentId:" not in text:
        text = text.replace(
            "        resolutionNote: { type: string, nullable: true }",
            "        resolutionNote: { type: string, nullable: true }\n        replacementAssignmentId: { type: string, format: uuid, nullable: true }\n        replacementCaptainId: { type: string, nullable: true }",
            1,
        )
    write(path, text)


def patch_frontend_api() -> None:
    path = "services/dsh/frontend/shared/dispatch/dispatch.api.ts"
    text = read(path)
    if "resolveDeliveryExceptionReassignCaptain" not in text:
        anchor = "export async function fetchClientOrderTracking"
        block = '''export async function resolveDeliveryExceptionReassignCaptain(\n  id: string,\n  expectedVersion: number,\n  newCaptainId: string,\n  note: string,\n): Promise<DshDeliveryException> {\n  const data = await request<{ exception: DshDeliveryException }>(\n    `/dsh/operator/delivery-exceptions/${encodeURIComponent(id)}/resolve`,\n    { method: "POST", body: { expectedVersion, action: "reassign_captain", newCaptainId, note } },\n  );\n  return data.exception;\n}\n\n'''
        if anchor not in text:
            raise RuntimeError("operator reassignment API anchor not found")
        text = text.replace(anchor, block + anchor, 1)
    write(path, text)


def write_screen() -> None:
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
  resolveDeliveryExceptionReassignCaptain,
  resolveDeliveryExceptionRetrySameCaptain,
} from '../../shared/dispatch/dispatch.api';
import type { DshDeliveryException } from '../../shared/dispatch/dispatch.types';
import { listCaptains } from '../../shared/workforce/workforce.api';
import type { Captain } from '../../shared/workforce/workforce.types';
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

function isEligibleCaptain(captain: Captain): boolean {
  const profile = captain.captainProfile;
  return captain.workforceKind === 'captain'
    && captain.engagementStatus === 'active'
    && profile?.licenseStatus === 'valid'
    && Boolean(profile.vehicleType?.trim())
    && Boolean(profile.vehicleIdentifier?.trim())
    && Boolean(profile.serviceZoneId?.trim());
}

function canReassign(item: DshDeliveryException): boolean {
  return item.deliveryStatusAtReport === 'driver_assigned' || item.deliveryStatusAtReport === 'driver_arrived_store';
}

export function ExceptionsEscalationsScreen({ hubHref }: ExceptionsEscalationsScreenProps) {
  const router = useRouter();
  const [state, setState] = React.useState<WorkspaceState>({ kind: 'loading' });
  const [captains, setCaptains] = React.useState<readonly Captain[]>([]);
  const [captainsState, setCaptainsState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [captainsError, setCaptainsError] = React.useState('');
  const [selectedReadinessId, setSelectedReadinessId] = React.useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = React.useState<string | null>(null);
  const [selectedReplacementCaptainId, setSelectedReplacementCaptainId] = React.useState('');
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

  const loadCaptains = React.useCallback(async () => {
    setCaptainsState('loading');
    setCaptainsError('');
    try {
      const result = await listCaptains({ status: 'active', limit: 200 });
      setCaptains(result.filter(isEligibleCaptain));
      setCaptainsState('ready');
    } catch (error) {
      setCaptains([]);
      setCaptainsState('error');
      setCaptainsError(error instanceof Error ? error.message : 'تعذر تحميل الكباتن المؤهلين من Workforce.');
    }
  }, []);

  React.useEffect(() => { void load(); void loadCaptains(); }, [load, loadCaptains]);
  React.useEffect(() => {
    setNote('');
    setSelectedReplacementCaptainId('');
    setActionState({ kind: 'idle' });
  }, [selectedReadinessId, selectedDeliveryId]);

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

  const resolveReassign = React.useCallback(async (item: DshDeliveryException) => {
    if (!selectedReplacementCaptainId || note.trim().length < 5) {
      setActionState({ kind: 'error', id: item.id, message: 'اختر كابتنًا مؤهلًا واكتب قرارًا تشغيليًا واضحًا.' });
      return;
    }
    setActionState({ kind: 'submitting', id: item.id });
    try {
      await resolveDeliveryExceptionReassignCaptain(item.id, item.version, selectedReplacementCaptainId, note.trim());
      setSelectedDeliveryId(null);
      await load();
    } catch (error) {
      setActionState({ kind: 'error', id: item.id, message: error instanceof Error ? error.message : 'تعذر إعادة إسناد المهمة.' });
    }
  }, [load, note, selectedReplacementCaptainId]);

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
  const replacementCaptains = selectedDelivery ? captains.filter((captain) => captain.actorId !== selectedDelivery.captainId) : [];

  return (
    <Box gap={4}>
      <Box gap={2} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Box gap={1}>
          <Text role="titleMd" align="start">الاستثناءات والتصعيدات</Text>
          <Text role="caption" tone="muted" align="start">طابور حقيقي من DSH، والكباتن البدلاء من Workforce فقط.</Text>
        </Box>
        <Box gap={2} style={{ flexDirection: 'row' }}>
          <Button label="تحديث" tone="secondary" onPress={() => { void load(); void loadCaptains(); }} />
          <Button label="العودة لمركز العمليات" tone="ghost" onPress={() => router.push(hubHref)} />
        </Box>
      </Box>

      {captainsState === 'error' ? <StateView tone="warning" title="تعذر تحميل الكباتن البدلاء" description={captainsError} actionLabel="إعادة المحاولة" onActionPress={loadCaptains} /> : null}

      <Box gap={2} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Badge label={`استثناءات توصيل نشطة: ${state.delivery.length}`} tone={state.delivery.length ? 'warning' : 'success'} />
        <Badge label={`كباتن مؤهلون: ${captainsState === 'ready' ? captains.length : '—'}`} tone={captains.length ? 'success' : 'warning'} />
        <Badge label={`تصعيدات جاهزية: ${state.readiness.filter((item) => item.status !== 'resolved').length}`} tone="neutral" />
      </Box>

      <Box gap={4} style={{ flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box gap={3} style={{ flex: 1, minWidth: 340 }}>
          <Text role="titleSm" align="start">استثناءات التوصيل الحاكمة</Text>
          {state.delivery.length === 0 ? <StateView tone="success" title="لا توجد استثناءات توصيل نشطة" /> : state.delivery.map((item) => (
            <Card key={item.id} padding={4} gap={2}>
              <Box gap={2} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box gap={1} style={{ flex: 1 }}>
                  <Text role="bodyStrong" align="start">{DELIVERY_EXCEPTION_REASON_LABELS[item.reasonCode]}</Text>
                  <Text role="caption" tone="muted" align="start">الطلب: {item.orderId} · الكابتن: {item.captainId}</Text>
                  <Text role="caption" tone="muted" align="start">المرحلة المحفوظة: {item.deliveryStatusAtReport}</Text>
                  {item.note ? <Text role="bodySm" align="start">{item.note}</Text> : null}
                </Box>
                <Box gap={1} style={{ alignItems: 'flex-end' }}>
                  <Badge label={item.severity} tone={exceptionTone(item.severity)} />
                  <Badge label={item.status === 'open' ? 'جديد' : 'قيد المراجعة'} tone={item.status === 'open' ? 'danger' : 'warning'} />
                </Box>
              </Box>
              <Box gap={2} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Button label="فتح القرار" tone="secondary" size="sm" onPress={() => { setSelectedReadinessId(null); setSelectedDeliveryId(item.id); }} />
                <Button label="فتح الطلب الحي" tone="ghost" size="sm" onPress={() => router.push(buildOperationsHref('live-orders', { subGroup: 'queue', orderId: item.orderId }))} />
              </Box>
            </Card>
          ))}
        </Box>

        <Box gap={3} style={{ flex: 1, minWidth: 340 }}>
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
          <Text role="bodySm" align="start">إعادة المحاولة ترفع الحظر فقط. إعادة الإسناد متاحة قبل الاستلام وتلغي الإسناد القديم ذريًا.</Text>
          <TextField label="قرار العمليات" value={note} onChangeText={setNote} placeholder="سجل سبب القرار وخطوات التحقق" multiline />
          {canReassign(selectedDelivery) ? (
            <>
              <label htmlFor="replacement-captain-select" style={{ fontWeight: 700 }}>الكابتن البديل المؤهل</label>
              <select
                id="replacement-captain-select"
                value={selectedReplacementCaptainId}
                onChange={(event) => setSelectedReplacementCaptainId(event.target.value)}
                disabled={captainsState !== 'ready' || actionState.kind === 'submitting'}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: 8, background: 'var(--bthwani-control-panel-surface-base)' }}
              >
                <option value="">اختر كابتنًا بديلًا</option>
                {replacementCaptains.map((captain) => (
                  <option key={captain.actorId} value={captain.actorId}>{`${captain.fullNameAr} · ${captain.captainProfile?.vehicleType ?? ''} · ${captain.captainProfile?.serviceZoneId ?? ''}`}</option>
                ))}
              </select>
            </>
          ) : <Text role="caption" tone="muted">بعد استلام الطلب لا يُسمح بإعادة الإسناد؛ استخدم رحلة الإرجاع أو الإلغاء الحاكمة.</Text>}
          {actionState.kind === 'error' && actionState.id === selectedDelivery.id ? <Text role="caption" tone="danger">{actionState.message}</Text> : null}
          <Box gap={2} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {selectedDelivery.status === 'open' ? <Button label="اعتماد وبدء المراجعة" tone="secondary" disabled={actionState.kind === 'submitting'} onPress={() => void acknowledge(selectedDelivery)} /> : null}
            <Button label="حل: إعادة المحاولة مع الكابتن نفسه" tone="primary" disabled={actionState.kind === 'submitting'} onPress={() => void resolveRetry(selectedDelivery)} />
            {canReassign(selectedDelivery) ? <Button label="حل: إعادة الإسناد للكابتن البديل" tone="secondary" disabled={!selectedReplacementCaptainId || actionState.kind === 'submitting'} onPress={() => void resolveReassign(selectedDelivery)} /> : null}
            <Button label="إغلاق التفاصيل" tone="ghost" onPress={() => setSelectedDeliveryId(null)} />
          </Box>
        </Card>
      ) : null}

      {selectedReadiness ? (
        <Card padding={4} gap={3}>
          <Text role="titleSm" align="start">إجراء على تصعيد الجاهزية {selectedReadiness.id}</Text>
          <TextField label="ملاحظات المراجعة أو الحل" value={note} onChangeText={setNote} placeholder="اكتب نتيجة تشغيلية قابلة للتدقيق" multiline />
          {actionState.kind === 'error' && actionState.id === selectedReadiness.id ? <Text role="caption" tone="danger">{actionState.message}</Text> : null}
          <Box gap={2} style={{ flexDirection: 'row' }}>
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


def patch_tsconfig() -> None:
    path = "apps/control-panel/runtime/tsconfig.delivery-exception-journey.json"
    text = read(path)
    if '"../../../services/dsh/frontend/shared/workforce/**/*.ts"' not in text:
        text = text.replace(
            '"../../../services/dsh/frontend/shared/field-readiness/**/*.ts",',
            '"../../../services/dsh/frontend/shared/field-readiness/**/*.ts",\n    "../../../services/dsh/frontend/shared/workforce/**/*.ts",',
            1,
        )
    write(path, text)


def write_db_test() -> None:
    write(
        "services/dsh/backend/internal/dispatch/delivery_reassignment_db_test.go",
        r'''package dispatch

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestDeliveryExceptionReassignsBeforePickupAtomicallyDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-reassign-" + suffix
	storeID := "reassign-store-" + suffix
	oldCaptainID := "reassign-old-captain-" + suffix
	newCaptainID := "reassign-new-captain-" + suffix
	clientID := uuid.NewString()

	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Reassign Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash)
		VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('r',64)) RETURNING id::text`, tenantID, clientID, storeID, "reassign-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("insert checkout: %v", err)
	}
	var orderID string
	if err := db.QueryRow(`
		INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id)
		VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'driver_arrived_store',$5) RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "reassign-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatalf("insert order: %v", err)
	}
	var oldAssignmentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at)
		VALUES($1::uuid,$2,'operator-1','accepted',NOW()+INTERVAL '90 seconds',NOW()) RETURNING id::text`, orderID, oldCaptainID).Scan(&oldAssignmentID); err != nil {
		t.Fatalf("insert assignment: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status) VALUES($1::uuid,$2::uuid,$3,'driver_arrived_store')`, oldAssignmentID, orderID, oldCaptainID); err != nil {
		t.Fatalf("insert delivery: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	item, err := ReportDeliveryException(db, oldAssignmentID, oldCaptainID, ReportDeliveryExceptionInput{
		ReasonCode: ExceptionVehicleBreakdown,
		Note: "تعطلت المركبة قبل استلام الطلب",
		CorrelationID: "reassign-command-" + suffix,
	})
	if err != nil {
		t.Fatalf("report exception: %v", err)
	}
	resolved, err := ResolveDeliveryExceptionReassignCaptain(db, item.ID, item.Version, newCaptainID, "تم التحقق من العطل وإعادة الإسناد", "operator-1")
	if err != nil {
		t.Fatalf("resolve reassign: %v", err)
	}
	if resolved.Status != DeliveryExceptionResolved || resolved.ReplacementAssignmentID == nil || resolved.ReplacementCaptainID == nil || *resolved.ReplacementCaptainID != newCaptainID {
		t.Fatalf("unexpected reassignment result: %+v", resolved)
	}

	var oldAssignmentStatus, oldDeliveryStatus, orderStatus string
	if err := db.QueryRow(`SELECT status FROM dsh_assignments WHERE id=$1::uuid`, oldAssignmentID).Scan(&oldAssignmentStatus); err != nil { t.Fatal(err) }
	if err := db.QueryRow(`SELECT status FROM dsh_deliveries WHERE assignment_id=$1::uuid`, oldAssignmentID).Scan(&oldDeliveryStatus); err != nil { t.Fatal(err) }
	if err := db.QueryRow(`SELECT status FROM dsh_orders WHERE id=$1::uuid`, orderID).Scan(&orderStatus); err != nil { t.Fatal(err) }
	if oldAssignmentStatus != "cancelled" || oldDeliveryStatus != "cancelled" || orderStatus != "driver_assigned" {
		t.Fatalf("atomic statuses mismatch: assignment=%s delivery=%s order=%s", oldAssignmentStatus, oldDeliveryStatus, orderStatus)
	}

	var replacementStatus, replacementDeliveryStatus, replacementCaptain string
	if err := db.QueryRow(`SELECT a.status,d.status,a.captain_id FROM dsh_assignments a JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, *resolved.ReplacementAssignmentID).Scan(&replacementStatus, &replacementDeliveryStatus, &replacementCaptain); err != nil { t.Fatal(err) }
	if replacementStatus != "offered" || replacementDeliveryStatus != "assigned" || replacementCaptain != newCaptainID {
		t.Fatalf("replacement assignment mismatch: %s %s %s", replacementStatus, replacementDeliveryStatus, replacementCaptain)
	}

	oldInbox, err := ListCaptainAssignments(db, oldCaptainID, 50)
	if err != nil { t.Fatal(err) }
	newInbox, err := ListCaptainAssignments(db, newCaptainID, 50)
	if err != nil { t.Fatal(err) }
	if len(oldInbox) != 0 || len(newInbox) != 1 || newInbox[0].ID != *resolved.ReplacementAssignmentID {
		t.Fatalf("captain inboxes not switched atomically: old=%+v new=%+v", oldInbox, newInbox)
	}

	replayed, err := ResolveDeliveryExceptionReassignCaptain(db, item.ID, item.Version, newCaptainID, "تم التحقق من العطل وإعادة الإسناد", "operator-1")
	if err != nil || replayed.ReplacementAssignmentID == nil || *replayed.ReplacementAssignmentID != *resolved.ReplacementAssignmentID {
		t.Fatalf("expected idempotent resolved reassignment, got %+v err=%v", replayed, err)
	}
}

func TestDeliveryExceptionRejectsReassignmentAfterPickupDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-reassign-blocked-" + suffix
	storeID := "reassign-blocked-store-" + suffix
	captainID := "reassign-blocked-captain-" + suffix
	clientID := uuid.NewString()
	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Blocked Reassign Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil { t.Fatal(err) }
	var checkoutIntentID string
	if err := db.QueryRow(`INSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('b',64)) RETURNING id::text`, tenantID, clientID, storeID, "blocked-payment-"+suffix).Scan(&checkoutIntentID); err != nil { t.Fatal(err) }
	var orderID string
	if err := db.QueryRow(`INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id) VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'picked_up',$5) RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "blocked-payment-"+suffix).Scan(&orderID); err != nil { t.Fatal(err) }
	var assignmentID string
	if err := db.QueryRow(`INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at) VALUES($1::uuid,$2,'operator-1','accepted',NOW()+INTERVAL '90 seconds',NOW()) RETURNING id::text`, orderID, captainID).Scan(&assignmentID); err != nil { t.Fatal(err) }
	if _, err := db.Exec(`INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status) VALUES($1::uuid,$2::uuid,$3,'picked_up')`, assignmentID, orderID, captainID); err != nil { t.Fatal(err) }
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID); _, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID); _, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID) })
	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{ReasonCode: ExceptionVehicleBreakdown, Note: "تعطل بعد استلام الطلب", CorrelationID: "blocked-reassign-" + suffix})
	if err != nil { t.Fatal(err) }
	if _, err := ResolveDeliveryExceptionReassignCaptain(db, item.ID, item.Version, "other-captain", "محاولة إعادة إسناد غير مسموحة", "operator-1"); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected reassignment conflict after pickup, got %v", err)
	}
}
''',
    )


def main() -> None:
    patch_migration()
    patch_backend()
    patch_http()
    patch_contract()
    patch_frontend_api()
    write_screen()
    patch_tsconfig()
    write_db_test()
    print("Governed delivery-exception reassignment slice applied.")


if __name__ == "__main__":
    main()
