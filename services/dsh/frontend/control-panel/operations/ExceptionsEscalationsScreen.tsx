'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Text } from '@bthwani/ui-kit';
import {
  CpBadge,
  CpButton,
  CpDetailPanel,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpSelect,
  CpStatePanel,
  CpStateView,
} from '@bthwani/control-panel/components';
import { OperationsRoomFrame } from '@bthwani/control-panel/shell';
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
  resolveDeliveryExceptionCancelOrder,
  resolveDeliveryExceptionReassignCaptain,
  resolveDeliveryExceptionRetrySameCaptain,
  resolveDeliveryExceptionReturnToStore,
  type DshDeliveryException,
} from '../../shared/dispatch';
import {
  FINANCIAL_CLOSURE_LABELS,
  cancelOrder,
  fetchOrderCancellation,
  type DshOrderCancellation,
} from '../../shared/orders';
import { listCaptains, type Captain } from '../../shared/workforce';
import { buildOperationsHref } from './operations.registry';

export type ExceptionsEscalationsScreenProps = {
  readonly hubHref: string;
  readonly subGroup?: string;
};

type WorkspaceState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | {
      readonly kind: 'ready';
      readonly readiness: readonly DshReadinessEscalation[];
      readonly delivery: readonly DshDeliveryException[];
      readonly returns: readonly DshDeliveryException[];
    };

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
  handoff_shortage: 'نقص في محتوى عهدة المتجر والكابتن',
  handoff_mismatch: 'محتوى العهدة لا يطابق الطلب',
  other: 'سبب آخر',
};

function isHandoffException(item: DshDeliveryException): boolean {
  return item.reasonCode === 'handoff_shortage' || item.reasonCode === 'handoff_mismatch';
}

function exceptionTone(severity: DshDeliveryException['severity']): 'danger' | 'warning' | 'neutral' {
  if (severity === 'critical') return 'danger';
  if (severity === 'high') return 'warning';
  return 'neutral';
}

function financialTone(
  status: DshOrderCancellation['financialClosureStatus'],
): 'danger' | 'warning' | 'success' | 'neutral' | 'info' {
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
  return item.deliveryStatusAtReport === 'driver_assigned'
    || item.deliveryStatusAtReport === 'driver_arrived_store';
}

function canReturnToStore(item: DshDeliveryException): boolean {
  return item.deliveryStatusAtReport === 'picked_up'
    || item.deliveryStatusAtReport === 'arrived_customer';
}

const PAGE_TITLE = 'الاستثناءات والتصعيدات';

export function ExceptionsEscalationsScreen({ hubHref }: ExceptionsEscalationsScreenProps) {
  const router = useRouter();
  const [state, setState] = React.useState<WorkspaceState>({ kind: 'loading' });
  const [captains, setCaptains] = React.useState<readonly Captain[]>([]);
  const [captainsState, setCaptainsState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [captainsError, setCaptainsError] = React.useState('');
  const [selectedReadinessId, setSelectedReadinessId] = React.useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = React.useState<string | null>(null);
  const [selectedReturnId, setSelectedReturnId] = React.useState<string | null>(null);
  const [selectedReplacementCaptainId, setSelectedReplacementCaptainId] = React.useState('');
  const [returnCancellations, setReturnCancellations] = React.useState<
    Readonly<Record<string, DshOrderCancellation | null>>
  >({});
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
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'تعذر تحميل الاستثناءات الحية من DSH.',
      });
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

  React.useEffect(() => {
    void load();
    void loadCaptains();
  }, [load, loadCaptains]);

  React.useEffect(() => {
    setNote('');
    setSelectedReplacementCaptainId('');
    setActionState({ kind: 'idle' });
  }, [selectedReadinessId, selectedDeliveryId, selectedReturnId]);

  const runDeliveryAction = React.useCallback(async (
    item: DshDeliveryException,
    action: () => Promise<unknown>,
    fallbackMessage: string,
  ) => {
    if (note.trim().length < 5) {
      setActionState({
        kind: 'error',
        id: item.id,
        message: 'اكتب قرارًا تشغيليًا واضحًا من خمسة أحرف على الأقل.',
      });
      return;
    }
    setActionState({ kind: 'submitting', id: item.id });
    try {
      await action();
      setSelectedDeliveryId(null);
      await load();
    } catch (error) {
      setActionState({
        kind: 'error',
        id: item.id,
        message: error instanceof Error ? error.message : fallbackMessage,
      });
    }
  }, [load, note]);

  const acknowledge = React.useCallback(async (item: DshDeliveryException) => {
    setActionState({ kind: 'submitting', id: item.id });
    try {
      await acknowledgeDeliveryException(item.id, item.version);
      setSelectedDeliveryId(null);
      await load();
    } catch (error) {
      setActionState({
        kind: 'error',
        id: item.id,
        message: error instanceof Error ? error.message : 'تعذر اعتماد الاستثناء.',
      });
    }
  }, [load]);

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
      setActionState({
        kind: 'error',
        id: item.id,
        message: error instanceof Error ? error.message : 'تعذر تنفيذ الإلغاء المالي الحاكم.',
      });
    }
  }, [load, note]);

  const resolveReadiness = React.useCallback(async (
    item: DshReadinessEscalation,
    status: 'acknowledged' | 'resolved',
  ) => {
    if (status === 'resolved' && note.trim().length < 5) {
      setActionState({ kind: 'error', id: item.id, message: 'اكتب نتيجة حل واضحة من خمسة أحرف على الأقل.' });
      return;
    }
    setActionState({ kind: 'submitting', id: item.id });
    try {
      await updateEscalation(item.id, {
        status,
        resolutionNote: note.trim() || 'تم استلام التصعيد وبدء المراجعة التشغيلية.',
      });
      setSelectedReadinessId(null);
      await load();
    } catch (error) {
      setActionState({
        kind: 'error',
        id: item.id,
        message: error instanceof Error ? error.message : 'تعذر حفظ التصعيد.',
      });
    }
  }, [load, note]);

  if (state.kind === 'loading') {
    return (
      <OperationsRoomFrame
        header={<CpPageHeader title={PAGE_TITLE} />}
        stateView={<CpStateView kind="loading" title="جارٍ تحميل الاستثناءات الحية من DSH" />}
      >
        {null}
      </OperationsRoomFrame>
    );
  }
  if (state.kind === 'error') {
    return (
      <OperationsRoomFrame
        header={<CpPageHeader title={PAGE_TITLE} />}
        stateView={(
          <CpStatePanel role="alert" title="تعذر تحميل مساحة الاستثناءات" description={state.message}>
            <CpRetryButton onClick={load}>إعادة المحاولة</CpRetryButton>
          </CpStatePanel>
        )}
      >
        {null}
      </OperationsRoomFrame>
    );
  }

  const selectedDelivery = state.delivery.find((item) => item.id === selectedDeliveryId) ?? null;
  const selectedReadiness = state.readiness.find((item) => item.id === selectedReadinessId) ?? null;
  const selectedReturn = state.returns.find((item) => item.id === selectedReturnId) ?? null;
  const replacementCaptains = selectedDelivery
    ? captains.filter((captain) => captain.actorId !== selectedDelivery.captainId)
    : [];
  const activeHandoffExceptions = state.delivery.filter(isHandoffException);
  const replacementCaptainOptions = [
    { value: '', label: 'اختر كابتنًا بديلًا' },
    ...replacementCaptains.map((captain) => ({
      value: captain.actorId,
      label: `${captain.fullNameAr} · ${captain.captainProfile?.vehicleType ?? ''} · ${captain.captainProfile?.serviceZoneId ?? ''}`,
    })),
  ];

  const detailPanel = selectedDelivery ? (
    <CpDetailPanel
      title={isHandoffException(selectedDelivery) ? 'قرار استثناء عهدة المتجر والكابتن' : 'قرار استثناء التوصيل'}
      onClose={() => setSelectedDeliveryId(null)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text role="bodySm" align="start">
          {isHandoffException(selectedDelivery)
            ? 'إعادة المحاولة ترفع حظر العهدة بعد التحقق. إعادة الإسناد تبطل محاولة العهدة الحالية فورًا وتفتح محاولة جديدة للكابتن البديل عند وصوله.'
            : 'إعادة المحاولة ترفع الحظر فقط. إعادة الإسناد متاحة قبل الاستلام وتلغي الإسناد القديم ذريًا.'}
        </Text>
        <div>
          <Text role="label">قرار العمليات</Text>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="سجل سبب القرار وخطوات التحقق"
            rows={4}
            dir="rtl"
          />
        </div>
        {canReassign(selectedDelivery) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text role="label">الكابتن البديل المؤهل</Text>
            <CpSelect
              value={selectedReplacementCaptainId}
              onChange={setSelectedReplacementCaptainId}
              options={replacementCaptainOptions}
              aria-label="الكابتن البديل المؤهل"
            />
          </div>
        ) : (
          <Text role="caption" tone="muted">
            بعد الاستلام لا يُسمح بإعادة الإسناد؛ استخدم رحلة الإرجاع أو الإلغاء الحاكمة.
          </Text>
        )}
        {actionState.kind === 'error' && actionState.id === selectedDelivery.id ? (
          <Text role="caption" tone="danger">{actionState.message}</Text>
        ) : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selectedDelivery.status === 'open' ? (
            <CpButton
              variant="secondary"
              disabled={actionState.kind === 'submitting'}
              onClick={() => void acknowledge(selectedDelivery)}
            >
              اعتماد وبدء المراجعة
            </CpButton>
          ) : null}
          <CpButton
            variant="primary"
            disabled={actionState.kind === 'submitting'}
            onClick={() => void runDeliveryAction(
              selectedDelivery,
              () => resolveDeliveryExceptionRetrySameCaptain(
                selectedDelivery.id,
                selectedDelivery.version,
                note.trim(),
              ),
              'تعذر حل الاستثناء.',
            )}
          >
            {isHandoffException(selectedDelivery)
              ? 'حل: السماح باستكمال العهدة مع الكابتن نفسه'
              : 'حل: إعادة المحاولة مع الكابتن نفسه'}
          </CpButton>
          {canReassign(selectedDelivery) ? (
            <CpButton
              variant="secondary"
              disabled={!selectedReplacementCaptainId || actionState.kind === 'submitting'}
              onClick={() => void runDeliveryAction(
                selectedDelivery,
                () => resolveDeliveryExceptionReassignCaptain(
                  selectedDelivery.id,
                  selectedDelivery.version,
                  selectedReplacementCaptainId,
                  note.trim(),
                ),
                'تعذر إعادة إسناد المهمة.',
              )}
            >
              حل: إعادة الإسناد للكابتن البديل
            </CpButton>
          ) : null}
          {canReassign(selectedDelivery) ? (
            <CpButton
              variant="danger"
              disabled={actionState.kind === 'submitting'}
              onClick={() => void runDeliveryAction(
                selectedDelivery,
                () => resolveDeliveryExceptionCancelOrder(
                  selectedDelivery.id,
                  selectedDelivery.version,
                  note.trim(),
                ),
                'تعذر إلغاء الطلب مباشرة.',
              )}
            >
              حل: إلغاء الطلب قبل الاستلام
            </CpButton>
          ) : null}
          {canReturnToStore(selectedDelivery) ? (
            <CpButton
              variant="secondary"
              disabled={actionState.kind === 'submitting'}
              onClick={() => void runDeliveryAction(
                selectedDelivery,
                () => resolveDeliveryExceptionReturnToStore(
                  selectedDelivery.id,
                  selectedDelivery.version,
                  note.trim(),
                ),
                'تعذر بدء إرجاع الطلب.',
              )}
            >
              حل: إرجاع الطلب إلى المتجر
            </CpButton>
          ) : null}
        </div>
      </div>
    </CpDetailPanel>
  ) : selectedReturn ? (
    <CpDetailPanel title="إغلاق المرتجع ماليًا" onClose={() => setSelectedReturnId(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text role="bodySm" align="start">الطلب: {selectedReturn.orderId}</Text>
        {returnCancellations[selectedReturn.orderId] ? (
          <>
            <CpBadge tone={financialTone(returnCancellations[selectedReturn.orderId]!.financialClosureStatus)}>
              {FINANCIAL_CLOSURE_LABELS[returnCancellations[selectedReturn.orderId]!.financialClosureStatus]}
            </CpBadge>
            {returnCancellations[selectedReturn.orderId]!.financialReference ? (
              <Text role="caption">
                المرجع المالي: {returnCancellations[selectedReturn.orderId]!.financialReference}
              </Text>
            ) : null}
            {returnCancellations[selectedReturn.orderId]!.financialFailure ? (
              <Text role="caption" tone="danger">
                {returnCancellations[selectedReturn.orderId]!.financialFailure}
              </Text>
            ) : null}
            <CpButton variant="secondary" onClick={() => void load()}>تحديث نتيجة WLT</CpButton>
          </>
        ) : (
          <>
            <Text role="bodySm" tone="muted">
              لن ينشئ DSH استردادًا مباشرًا. ينشئ أمر الإلغاء سجلًا وOutbox واحدًا، ثم يقرر WLT تحرير الجلسة أو طلب الاسترداد.
            </Text>
            <div>
              <Text role="label">سبب الإلغاء بعد فحص المرتجع</Text>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="سجل حالة المرتجع وسبب عدم إعادة التنفيذ"
                rows={4}
                dir="rtl"
              />
            </div>
            {actionState.kind === 'error' && actionState.id === selectedReturn.id ? (
              <Text role="caption" tone="danger">{actionState.message}</Text>
            ) : null}
            <CpButton
              variant="danger"
              disabled={actionState.kind === 'submitting' || note.trim().length < 5}
              onClick={() => void cancelReturnedOrder(selectedReturn)}
            >
              إلغاء الطلب وبدء الإغلاق المالي
            </CpButton>
          </>
        )}
      </div>
    </CpDetailPanel>
  ) : selectedReadiness ? (
    <CpDetailPanel title={`إجراء على تصعيد الجاهزية ${selectedReadiness.id}`} onClose={() => setSelectedReadinessId(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <Text role="label">ملاحظات المراجعة أو الحل</Text>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="اكتب نتيجة تشغيلية قابلة للتدقيق"
            rows={4}
            dir="rtl"
          />
        </div>
        {actionState.kind === 'error' && actionState.id === selectedReadiness.id ? (
          <Text role="caption" tone="danger">{actionState.message}</Text>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedReadiness.status === 'open' ? (
            <CpButton variant="secondary" onClick={() => void resolveReadiness(selectedReadiness, 'acknowledged')}>
              تأكيد الاستلام
            </CpButton>
          ) : null}
          <CpButton variant="primary" onClick={() => void resolveReadiness(selectedReadiness, 'resolved')}>
            حل وإغلاق
          </CpButton>
        </div>
      </div>
    </CpDetailPanel>
  ) : (
    <CpStatePanel role="status" title="لا يوجد عنصر محدد" description="اختر استثناءً أو تصعيدًا أو رحلة إرجاع لعرض قرار العمليات." />
  );

  return (
    <OperationsRoomFrame
      header={(
        <CpPageHeader title={PAGE_TITLE}>
          <CpMutedInline tight>
            طابور حقيقي من DSH. استثناءات العهدة توقف تأكيد المتجر والتقاط الكابتن حتى قرار العمليات.
          </CpMutedInline>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <CpButton variant="secondary" onClick={() => { void load(); void loadCaptains(); }}>تحديث</CpButton>
            <CpButton variant="ghost" onClick={() => router.push(hubHref)}>العودة لمركز العمليات</CpButton>
          </div>
          {captainsState === 'error' ? (
            <div style={{ marginTop: 8 }}>
              <CpStatePanel role="alert" title="تعذر تحميل الكباتن البدلاء" description={captainsError}>
                <CpRetryButton onClick={loadCaptains}>إعادة المحاولة</CpRetryButton>
              </CpStatePanel>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <CpBadge tone={state.delivery.length ? 'warning' : 'success'}>استثناءات نشطة: {state.delivery.length}</CpBadge>
            <CpBadge tone={activeHandoffExceptions.length ? 'danger' : 'success'}>استثناءات عهدة: {activeHandoffExceptions.length}</CpBadge>
            <CpBadge tone={captains.length ? 'success' : 'warning'}>كباتن مؤهلون: {captainsState === 'ready' ? captains.length : '—'}</CpBadge>
            <CpBadge tone="warning">مرتجعات في الطريق: {state.returns.filter((item) => !item.returnArrivedAt).length}</CpBadge>
            <CpBadge tone="warning">بانتظار المتجر: {state.returns.filter((item) => Boolean(item.returnArrivedAt) && !item.returnedAt).length}</CpBadge>
            <CpBadge tone="neutral">تصعيدات جاهزية: {state.readiness.filter((item) => item.status !== 'resolved').length}</CpBadge>
          </div>
        </CpPageHeader>
      )}
      sidePanel={detailPanel}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 340 }}>
            <Text role="titleSm" align="start">استثناءات التوصيل والعهدة</Text>
            {state.delivery.length === 0 ? (
              <CpStatePanel role="status" title="لا توجد استثناءات نشطة" />
            ) : state.delivery.map((item) => (
              <Card key={item.id} padding={4} gap={2}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    <Text role="bodyStrong" align="start">{DELIVERY_EXCEPTION_REASON_LABELS[item.reasonCode]}</Text>
                    <Text role="caption" tone="muted" align="start">
                      الطلب: {item.orderId} · الكابتن: {item.captainId}
                    </Text>
                    <Text role="caption" tone="muted" align="start">
                      المرحلة المحفوظة: {item.deliveryStatusAtReport}
                    </Text>
                    {item.note ? <Text role="bodySm" align="start">{item.note}</Text> : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    {isHandoffException(item) ? <CpBadge tone="danger">عهدة متجر–كابتن</CpBadge> : null}
                    <CpBadge tone={exceptionTone(item.severity)}>{item.severity}</CpBadge>
                    <CpBadge tone={item.status === 'open' ? 'danger' : 'warning'}>
                      {item.status === 'open' ? 'جديد' : 'قيد المراجعة'}
                    </CpBadge>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <CpButton
                    variant="secondary"
                    onClick={() => {
                      setSelectedReadinessId(null);
                      setSelectedReturnId(null);
                      setSelectedDeliveryId(item.id);
                    }}
                  >
                    فتح القرار
                  </CpButton>
                  <CpButton
                    variant="ghost"
                    onClick={() => router.push(buildOperationsHref('live-orders', { subGroup: 'queue', orderId: item.orderId }))}
                  >
                    فتح الطلب الحي
                  </CpButton>
                </div>
              </Card>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 340 }}>
            <Text role="titleSm" align="start">تصعيدات الجاهزية</Text>
            {state.readiness.length === 0 ? (
              <CpStatePanel role="status" title="لا توجد تصعيدات جاهزية" />
            ) : state.readiness.map((item) => (
              <Card key={item.id} padding={4} gap={2}>
                <Text role="bodyStrong" align="start">{ESCALATION_CATEGORY_LABELS[item.category] ?? item.category}</Text>
                <Text role="caption" tone="muted" align="start">{item.description}</Text>
                <CpBadge tone={item.severity === 'critical' || item.severity === 'high' ? 'danger' : 'neutral'}>
                  {ESCALATION_SEVERITY_LABELS[item.severity] ?? item.severity}
                </CpBadge>
                {item.status !== 'resolved' ? (
                  <CpButton
                    variant="secondary"
                    onClick={() => {
                      setSelectedDeliveryId(null);
                      setSelectedReturnId(null);
                      setSelectedReadinessId(item.id);
                    }}
                  >
                    فتح التصعيد
                  </CpButton>
                ) : null}
              </Card>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Text role="titleSm" align="start">رحلات الإرجاع إلى المتجر</Text>
          {state.returns.length === 0 ? (
            <CpStatePanel role="status" title="لا توجد رحلات إرجاع" />
          ) : state.returns.map((item) => {
            const cancellation = returnCancellations[item.orderId];
            return (
              <Card key={`return-${item.id}`} padding={4} gap={2}>
                <Text role="bodyStrong" align="start">الطلب: {item.orderId}</Text>
                <Text role="caption" tone="muted" align="start">الكابتن: {item.captainId}</Text>
                <CpBadge tone={item.returnedAt ? 'success' : 'warning'}>
                  {item.returnedAt
                    ? 'استلم المتجر المرتجع'
                    : item.returnArrivedAt
                      ? 'وصل المرتجع وينتظر تأكيد المتجر'
                      : 'في طريق العودة إلى المتجر'}
                </CpBadge>
                <Text role="bodySm" align="start">{item.resolutionNote}</Text>
                {cancellation ? (
                  <>
                    <CpBadge tone={financialTone(cancellation.financialClosureStatus)}>
                      {FINANCIAL_CLOSURE_LABELS[cancellation.financialClosureStatus]}
                    </CpBadge>
                    {cancellation.financialReference ? (
                      <Text role="caption" align="start">المرجع المالي: {cancellation.financialReference}</Text>
                    ) : null}
                    {cancellation.financialFailure ? (
                      <Text role="caption" tone="danger" align="start">{cancellation.financialFailure}</Text>
                    ) : null}
                  </>
                ) : item.returnedAt ? <CpBadge tone="warning">بانتظار قرار الإلغاء المالي</CpBadge> : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {item.returnedAt ? (
                    <CpButton
                      variant="secondary"
                      onClick={() => {
                        setSelectedDeliveryId(null);
                        setSelectedReadinessId(null);
                        setSelectedReturnId(item.id);
                      }}
                    >
                      {cancellation ? 'فتح الإغلاق المالي' : 'بدء الإغلاق المالي'}
                    </CpButton>
                  ) : null}
                  <CpButton
                    variant="ghost"
                    onClick={() => router.push(buildOperationsHref('live-orders', { subGroup: 'queue', orderId: item.orderId }))}
                  >
                    فتح الطلب الحي
                  </CpButton>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </OperationsRoomFrame>
  );
}

export default ExceptionsEscalationsScreen;
