'use client';

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
  resolveDeliveryExceptionReturnToStore,
} from '../../shared/dispatch';
import type { DshDeliveryException } from '../../shared/dispatch';
import {
  FINANCIAL_CLOSURE_LABELS,
  cancelOrder,
  fetchOrderCancellation,
  type DshOrderCancellation,
} from '../../shared/orders';
import { listCaptains } from '../../shared/workforce';
import type { Captain } from '../../shared/workforce';
import { buildOperationsHref } from './operations.registry';

export type ExceptionsEscalationsScreenProps = { readonly hubHref: string; readonly subGroup?: string };

type WorkspaceState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly readiness: readonly DshReadinessEscalation[]; readonly delivery: readonly DshDeliveryException[]; readonly returns: readonly DshDeliveryException[] };

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

function financialTone(status: DshOrderCancellation['financialClosureStatus']): 'danger' | 'warning' | 'success' | 'neutral' | 'info' {
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  if (status === 'refund_requested') return 'info';
  if (status === 'session_expired' || status === 'refund_completed' || status === 'no_action') return 'success';
  return 'neutral';
}

function isNotFound(error: unknown): boolean {
  const typed = error as { status?: number; body?: { code?: string } };
  return typed.status === 404 || typed.body?.code === 'NOT_FOUND';
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
  const [selectedReturnId, setSelectedReturnId] = React.useState<string | null>(null);
  const [returnCancellations, setReturnCancellations] = React.useState<Readonly<Record<string, DshOrderCancellation | null>>>({});
  const [selectedReplacementCaptainId, setSelectedReplacementCaptainId] = React.useState('');
  const [note, setNote] = React.useState('');
  const [actionState, setActionState] = React.useState<ActionState>({ kind: 'idle' });

  const load = React.useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const [readiness, open, acknowledged, resolved] = await Promise.all([
        fetchOperatorEscalations(),
        fetchOperatorDeliveryExceptions('open'),
        fetchOperatorDeliveryExceptions('acknowledged'),
        fetchOperatorDeliveryExceptions('resolved'),
      ]);
      const returns = resolved.filter((item) => item.resolutionAction === 'return_to_store');
      const cancellationEntries = await Promise.all(returns.map(async (item) => {
        try {
          return [item.orderId, await fetchOrderCancellation('operator', item.orderId)] as const;
        } catch (error) {
          if (isNotFound(error)) return [item.orderId, null] as const;
          throw error;
        }
      }));
      setReturnCancellations(Object.fromEntries(cancellationEntries));
      setState({
        kind: 'ready',
        readiness,
        delivery: [...open, ...acknowledged],
        returns,
      });
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
  }, [selectedReadinessId, selectedDeliveryId, selectedReturnId]);

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

  const resolveReturn = React.useCallback(async (item: DshDeliveryException) => {
    if (note.trim().length < 5) {
      setActionState({ kind: 'error', id: item.id, message: 'اكتب سبب الإرجاع وخطوات التسليم للمتجر.' });
      return;
    }
    setActionState({ kind: 'submitting', id: item.id });
    try {
      await resolveDeliveryExceptionReturnToStore(item.id, item.version, note.trim());
      setSelectedDeliveryId(null);
      await load();
    } catch (error) {
      setActionState({ kind: 'error', id: item.id, message: error instanceof Error ? error.message : 'تعذر بدء إرجاع الطلب.' });
    }
  }, [load, note]);

  const cancelReturnedOrder = React.useCallback(async (item: DshDeliveryException) => {
    if (!item.returnedAt) {
      setActionState({ kind: 'error', id: item.id, message: 'لا يمكن الإلغاء المالي قبل استلام المتجر للمرتجع.' });
      return;
    }
    if (note.trim().length < 5) {
      setActionState({ kind: 'error', id: item.id, message: 'اكتب سبب الإلغاء المالي بعد فحص المرتجع.' });
      return;
    }
    setActionState({ kind: 'submitting', id: item.id });
    try {
      const response = await cancelOrder('operator', item.orderId, {
        reasonCode: 'operational_failure',
        reasonNote: `إلغاء بعد استلام المرتجع: ${note.trim()}`,
        correlationId: `returned-delivery-exception-${item.id}`,
      });
      setReturnCancellations((current) => ({ ...current, [item.orderId]: response.cancellation }));
      await load();
    } catch (error) {
      setActionState({ kind: 'error', id: item.id, message: error instanceof Error ? error.message : 'تعذر تنفيذ الإلغاء المالي الحاكم.' });
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
  const selectedReturn = state.returns.find((item) => item.id === selectedReturnId) ?? null;
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
        <Badge label={`مرتجعات في الطريق: ${state.returns.filter((item) => !item.returnArrivedAt).length}`} tone="warning" />
        <Badge label={`بانتظار المتجر: ${state.returns.filter((item) => Boolean(item.returnArrivedAt) && !item.returnedAt).length}`} tone="warning" />
        <Badge label={`مرتجعات مستلمة: ${state.returns.filter((item) => Boolean(item.returnedAt)).length}`} tone="neutral" />
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

      <Box gap={3}>
        <Text role="titleSm" align="start">رحلات الإرجاع إلى المتجر</Text>
        {state.returns.length === 0 ? (
          <StateView tone="neutral" title="لا توجد رحلات إرجاع" />
        ) : state.returns.map((item) => {
          const cancellation = returnCancellations[item.orderId];
          return (
            <Card key={`return-${item.id}`} padding={4} gap={2}>
              <Text role="bodyStrong" align="start">الطلب: {item.orderId}</Text>
              <Text role="caption" tone="muted" align="start">الكابتن: {item.captainId}</Text>
              <Badge label={item.returnedAt ? 'استلم المتجر المرتجع' : item.returnArrivedAt ? 'وصل المرتجع وينتظر تأكيد المتجر' : 'في طريق العودة إلى المتجر'} tone={item.returnedAt ? 'success' : 'warning'} />
              <Text role="bodySm" align="start">{item.resolutionNote}</Text>
              {cancellation ? (
                <>
                  <Badge label={FINANCIAL_CLOSURE_LABELS[cancellation.financialClosureStatus]} tone={financialTone(cancellation.financialClosureStatus)} />
                  {cancellation.financialReference ? <Text role="caption" align="start">المرجع المالي: {cancellation.financialReference}</Text> : null}
                  {cancellation.financialFailure ? <Text role="caption" tone="danger" align="start">{cancellation.financialFailure}</Text> : null}
                </>
              ) : item.returnedAt ? (
                <Badge label="بانتظار قرار الإلغاء المالي" tone="warning" />
              ) : null}
              <Box gap={2} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {item.returnedAt ? <Button label={cancellation ? 'فتح الإغلاق المالي' : 'بدء الإغلاق المالي'} tone="secondary" size="sm" onPress={() => { setSelectedDeliveryId(null); setSelectedReadinessId(null); setSelectedReturnId(item.id); }} /> : null}
                <Button label="فتح الطلب الحي" tone="ghost" size="sm" onPress={() => router.push(buildOperationsHref('live-orders', { subGroup: 'queue', orderId: item.orderId }))} />
              </Box>
            </Card>
          );
        })}
      </Box>

      {selectedReturn ? (
        <Card padding={4} gap={3}>
          <Text role="titleSm" align="start">إغلاق المرتجع ماليًا</Text>
          <Text role="bodySm" align="start">الطلب: {selectedReturn.orderId}</Text>
          {returnCancellations[selectedReturn.orderId] ? (
            <>
              <Badge
                label={FINANCIAL_CLOSURE_LABELS[returnCancellations[selectedReturn.orderId]!.financialClosureStatus]}
                tone={financialTone(returnCancellations[selectedReturn.orderId]!.financialClosureStatus)}
              />
              {returnCancellations[selectedReturn.orderId]!.financialReference ? (
                <Text role="caption">المرجع المالي: {returnCancellations[selectedReturn.orderId]!.financialReference}</Text>
              ) : null}
              {returnCancellations[selectedReturn.orderId]!.financialFailure ? (
                <Text role="caption" tone="danger">{returnCancellations[selectedReturn.orderId]!.financialFailure}</Text>
              ) : null}
              <Button label="تحديث نتيجة WLT" tone="secondary" onPress={() => void load()} />
            </>
          ) : (
            <>
              <Text role="bodySm" tone="muted">لن ينشئ DSH استردادًا مباشرًا. سيُنشئ أمر الإلغاء سجلًا واحدًا وOutbox واحدًا، ثم يقرر WLT تحرير الجلسة أو طلب الاسترداد.</Text>
              <TextField label="سبب الإلغاء بعد فحص المرتجع" value={note} onChangeText={setNote} placeholder="سجل حالة المرتجع وسبب عدم إعادة التنفيذ" multiline />
              {actionState.kind === 'error' && actionState.id === selectedReturn.id ? <Text role="caption" tone="danger">{actionState.message}</Text> : null}
              <Button label="إلغاء الطلب وبدء الإغلاق المالي" tone="danger" disabled={actionState.kind === 'submitting' || note.trim().length < 5} onPress={() => void cancelReturnedOrder(selectedReturn)} />
            </>
          )}
          <Button label="إغلاق التفاصيل" tone="ghost" onPress={() => setSelectedReturnId(null)} />
        </Card>
      ) : null}

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
            {(selectedDelivery.deliveryStatusAtReport === 'picked_up' || selectedDelivery.deliveryStatusAtReport === 'arrived_customer') ? <Button label="حل: إرجاع الطلب إلى المتجر" tone="secondary" disabled={actionState.kind === 'submitting'} onPress={() => void resolveReturn(selectedDelivery)} /> : null}
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
