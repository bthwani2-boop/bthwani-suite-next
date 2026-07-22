'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, StateView, Text, type StateTone } from '@bthwani/ui-kit';
import { WebControlPanelKpiStrip, WebControlPanelDecisionRow } from '@bthwani/ui-kit/web';
import { buildOperationsHref } from '../operations/operations-registry';
import type { OperationsFocusParams } from '../operations/operations.types';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../operations/operations.types';
import { useOperatorSpecialRequestsController } from './use-special-requests-controller';
import type {
  DshSpecialRequestResponse,
  DshUpdateSpecialRequest,
  SpecialRequestStatus,
} from './special-requests.types';

export type OperatorSpecialRequestsWorkbenchProps = {
  requestType: 'SHEIN_ASSISTED_PURCHASE' | 'AWNAK_ERRAND';
  title: string;
  stageLabels: Readonly<Record<string, string>>;
  stageOrder: readonly string[];
  hubHref?: string;
  subGroup?: string;
  focusParams?: OperationsFocusParams;
};

type FailureCopy = {
  title: string;
  description: string;
  tone: StateTone;
};

type OperatorForm = {
  status: SpecialRequestStatus;
  workflowStage: string;
  estimatedAmountMinorUnits: string;
  currency: string;
  assignedOperatorId: string;
  rejectionReason: string;
  captainId: string;
};

const OPERATOR_STATUSES: readonly SpecialRequestStatus[] = [
  'under_review',
  'needs_customer_input',
  'approved',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'rejected',
];

const FAILURE_COPY: Readonly<Record<'error' | 'offline' | 'forbidden' | 'conflict', FailureCopy>> = {
  error: {
    title: 'خطأ في تحميل الطلبات',
    description: 'تعذر تحميل طلبات هذه الخدمة.',
    tone: 'danger',
  },
  offline: {
    title: 'غير متصل',
    description: 'تأكد من اتصالك بالإنترنت.',
    tone: 'warning',
  },
  forbidden: {
    title: 'الوصول مرفوض',
    description: 'لا تملك الصلاحية اللازمة.',
    tone: 'danger',
  },
  conflict: {
    title: 'تعارض في البيانات',
    description: 'أعد القراءة قبل متابعة الإجراء.',
    tone: 'warning',
  },
};

function formFromRequest(request: DshSpecialRequestResponse): OperatorForm {
  return {
    status: request.status,
    workflowStage: request.workflowStage ?? '',
    estimatedAmountMinorUnits: request.estimatedAmountMinorUnits === null || request.estimatedAmountMinorUnits === undefined
      ? ''
      : String(request.estimatedAmountMinorUnits),
    currency: request.currency ?? 'YER',
    assignedOperatorId: request.assignedOperatorId ?? '',
    rejectionReason: request.rejectionReason ?? '',
    captainId: '',
  };
}

function parsePositiveMinorUnits(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('قيمة العرض يجب أن تكون عددًا صحيحًا موجبًا بالوحدة الصغرى.');
  }
  return parsed;
}

export function OperatorSpecialRequestsWorkbench({ requestType, title, stageLabels, stageOrder, focusParams }: OperatorSpecialRequestsWorkbenchProps) {
  const router = useRouter();
  const {
    requests,
    loadState,
    getOne,
    reload,
    update,
    assignDispatch,
  } = useOperatorSpecialRequestsController({ requestType, autoLoad: true });
  const [selectedRequest, setSelectedRequest] = React.useState<DshSpecialRequestResponse | null>(null);
  const [form, setForm] = React.useState<OperatorForm | null>(null);
  const [pendingAction, setPendingAction] = React.useState<'transition' | 'quote' | 'dispatch' | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!focusParams?.requestId) {
      setSelectedRequest(null);
      setForm(null);
      return () => { cancelled = true; };
    }
    void getOne(focusParams.requestId).then((result) => {
      if (!cancelled) {
        const request = result ?? null;
        setSelectedRequest(request);
        setForm(request ? formFromRequest(request) : null);
      }
    });
    return () => { cancelled = true; };
  }, [focusParams?.requestId, getOne]);

  const updateForm = React.useCallback((field: keyof OperatorForm, value: string) => {
    setForm((current) => current ? ({ ...current, [field]: value } as OperatorForm) : current);
    setFeedback(null);
  }, []);

  const applyReadback = React.useCallback((request: DshSpecialRequestResponse, message: string) => {
    setSelectedRequest(request);
    setForm(formFromRequest(request));
    setFeedback(message);
  }, []);

  const handleTransition = React.useCallback(async () => {
    if (!selectedRequest || !form) return;
    setPendingAction('transition');
    setFeedback(null);
    try {
      const input: DshUpdateSpecialRequest = {
        expectedVersion: selectedRequest.version,
        status: form.status,
        workflowStage: form.workflowStage || null,
        ...(form.assignedOperatorId.trim() ? { assignedOperatorId: form.assignedOperatorId.trim() } : {}),
        ...(form.rejectionReason.trim() ? { rejectionReason: form.rejectionReason.trim() } : {}),
      };
      const readback = await update(selectedRequest.id, input);
      applyReadback(readback, 'تم تطبيق الانتقال وقراءة النسخة المحدثة من DSH.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'تعذر تطبيق الانتقال التشغيلي.');
    } finally {
      setPendingAction(null);
    }
  }, [applyReadback, form, selectedRequest, update]);

  const handleQuote = React.useCallback(async () => {
    if (!selectedRequest || !form) return;
    setPendingAction('quote');
    setFeedback(null);
    try {
      const amount = parsePositiveMinorUnits(form.estimatedAmountMinorUnits);
      const currency = form.currency.trim().toUpperCase();
      if (!currency) throw new Error('رمز العملة مطلوب.');
      const readback = await update(selectedRequest.id, {
        expectedVersion: selectedRequest.version,
        status: 'needs_customer_input',
        workflowStage: 'customer_approval',
        estimatedAmountMinorUnits: amount,
        currency,
        quotePreparedAt: new Date().toISOString(),
      });
      applyReadback(readback, 'تم إرسال العرض للعميل وأصبحت الموافقة والدفع متاحين من تطبيق العميل.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'تعذر إرسال العرض للعميل.');
    } finally {
      setPendingAction(null);
    }
  }, [applyReadback, form, selectedRequest, update]);

  const handleDispatch = React.useCallback(async () => {
    if (!selectedRequest || !form) return;
    const captainId = form.captainId.trim();
    if (!captainId) {
      setFeedback('معرّف الكابتن مطلوب قبل الإسناد.');
      return;
    }
    setPendingAction('dispatch');
    setFeedback(null);
    try {
      const readback = await assignDispatch(selectedRequest.id, captainId);
      applyReadback(readback, 'تم إنشاء إسناد الكابتن وقراءة حالة الطلب المحدثة.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'تعذر إسناد الطلب إلى الكابتن.');
    } finally {
      setPendingAction(null);
    }
  }, [applyReadback, assignDispatch, form, selectedRequest]);

  const summaryKpi = stageOrder.map((stage) => ({
    id: stage,
    label: stageLabels[stage] ?? stage,
    value: String(requests.filter((request) => request.workflowStage === stage).length),
    tone: stage === 'exception' || stage === 'escalated' || stage === 'dispatch_pending'
      ? ('danger' as const)
      : stage === 'completed' || stage === 'delivered'
        ? ('success' as const)
        : ('neutral' as const),
  }));

  const rows = requests.map((request) => {
    const statusTone = request.status === 'completed'
      ? 'success'
      : request.status === 'cancelled' || request.status === 'rejected'
        ? 'danger'
        : 'warning';
    return {
      id: request.id,
      label: request.clientId ? `العميل: ${request.clientId}` : request.id,
      status: request.workflowStage || request.status,
      statusTone: DSH_CONTROL_PANEL_TONE_MAP[statusTone] ?? 'neutral',
      risk: request.blockingReasons?.length ? ('warning' as const) : ('neutral' as const),
      recommendation: 'مراجعة وتنفيذ',
      reason: request.customerNotes ?? 'لا توجد ملاحظات عميل',
      sla: `المالك: ${request.assignedOperatorId || 'غير مسند'} | أُنشئ: ${request.createdAt}`,
    };
  });

  if (loadState === 'error' || loadState === 'offline' || loadState === 'forbidden' || loadState === 'conflict') {
    const errorState = FAILURE_COPY[loadState];
    return (
      <StateView
        title={errorState.title}
        description={errorState.description}
        tone={errorState.tone}
        actionLabel="إعادة المحاولة"
        onActionPress={reload}
      />
    );
  }

  return (
    <Box gap={3}>
      <Box gap={1}>
        <Text role="titleMd">{title}</Text>
        <Text role="bodySm" tone="secondary">البيانات والحالات مقروءة من خدمة الطلبات الخاصة السيادية.</Text>
      </Box>

      <WebControlPanelKpiStrip items={summaryKpi} />

      {loadState === 'loading' && requests.length === 0 ? (
        <StateView
          title="جاري تحميل الطلبات"
          description="تتم قراءة قائمة الطلبات الخاصة من DSH."
          tone="info"
          loading
        />
      ) : requests.length === 0 ? (
        <StateView
          title="لا توجد طلبات"
          description="لا توجد طلبات خاصة في هذا القسم حاليًا."
          actionLabel="تحديث"
          onActionPress={reload}
        />
      ) : (
        <Box gap={2}>
          {rows.map((item) => (
            <WebControlPanelDecisionRow
              key={item.id}
              entityId={item.id}
              entityLabel={item.label}
              status={stageLabels[item.status] ?? item.status}
              statusTone={item.statusTone}
              risk={item.risk}
              recommendation={item.recommendation}
              reason={item.reason}
              sla={item.sla}
              primaryAction={{
                id: 'inspect',
                label: item.recommendation,
                onAction: () => router.push(buildOperationsHref(
                  requestType === 'SHEIN_ASSISTED_PURCHASE' ? 'sheinproxy' : 'awnak-operations',
                  { requestId: item.id, panel: 'detail' },
                )),
              }}
            />
          ))}
        </Box>
      )}

      {selectedRequest && form && focusParams?.panel === 'detail' ? (
        <Box gap={2} padding={4} background="brandSurface" radiusToken="md">
          <Text role="titleSm">المفتش: {selectedRequest.id}</Text>
          <Text role="bodySm">العميل: {selectedRequest.clientId}</Text>
          <Text role="bodySm">مرجع WLT: {selectedRequest.wltPaymentSessionId || 'غير متوفر'}</Text>
          <Text role="bodySm">الحالة: {stageLabels[selectedRequest.workflowStage || ''] ?? selectedRequest.workflowStage ?? selectedRequest.status}</Text>
          <Text role="bodySm">الإسناد: {selectedRequest.dispatchAssignmentId || 'غير مسند'}</Text>
          <Text role="bodySm">النسخة: {selectedRequest.version}</Text>

          {requestType === 'SHEIN_ASSISTED_PURCHASE' ? (
            <Box gap={1}>
              <Text role="bodySm">رابط المنتج: {selectedRequest.productUrl || '—'}</Text>
              <Text role="bodySm">الكمية: {selectedRequest.quantity || '—'} | المقاس: {selectedRequest.size || '—'} | اللون: {selectedRequest.color || '—'}</Text>
              <Text role="bodySm">دليل الشراء: {selectedRequest.purchaseBatchId || '—'}</Text>
              <Text role="bodySm">مرجع الاستلام: {selectedRequest.inboundReference || '—'}</Text>
            </Box>
          ) : (
            <Box gap={1}>
              <Text role="bodySm">النوع: {selectedRequest.itemType || '—'}</Text>
              <Text role="bodySm">مرجع الاستلام: {selectedRequest.pickupAddressReference || '—'}</Text>
              <Text role="bodySm">مرجع التسليم: {selectedRequest.dropoffAddressReference || '—'}</Text>
              <Text role="bodySm">متطلبات المناولة: {selectedRequest.handlingRequirements || '—'}</Text>
            </Box>
          )}

          <Box gap={2}>
            <label>
              الحالة التشغيلية
              <select
                value={form.status}
                onChange={(event) => updateForm('status', event.target.value as SpecialRequestStatus)}
                disabled={pendingAction !== null}
              >
                {OPERATOR_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              مرحلة سير العمل
              <select
                value={form.workflowStage}
                onChange={(event) => updateForm('workflowStage', event.target.value)}
                disabled={pendingAction !== null}
              >
                <option value="">بدون تغيير صريح</option>
                {stageOrder.map((stage) => (
                  <option key={stage} value={stage}>{stageLabels[stage] ?? stage}</option>
                ))}
              </select>
            </label>
            <label>
              المشغّل المسؤول
              <input
                value={form.assignedOperatorId}
                onChange={(event) => updateForm('assignedOperatorId', event.target.value)}
                disabled={pendingAction !== null}
              />
            </label>
            <label>
              سبب الرفض أو الملاحظة الحاكمة
              <input
                value={form.rejectionReason}
                onChange={(event) => updateForm('rejectionReason', event.target.value)}
                disabled={pendingAction !== null}
              />
            </label>
            <button type="button" onClick={() => void handleTransition()} disabled={pendingAction !== null}>
              {pendingAction === 'transition' ? 'جارٍ تطبيق الانتقال...' : 'تطبيق الانتقال وقراءة النتيجة'}
            </button>
          </Box>

          <Box gap={2}>
            <Text role="titleSm">عرض السعر وموافقة العميل</Text>
            <label>
              القيمة بالوحدة الصغرى
              <input
                type="number"
                min={1}
                value={form.estimatedAmountMinorUnits}
                onChange={(event) => updateForm('estimatedAmountMinorUnits', event.target.value)}
                disabled={pendingAction !== null}
              />
            </label>
            <label>
              العملة
              <input
                value={form.currency}
                onChange={(event) => updateForm('currency', event.target.value)}
                disabled={pendingAction !== null}
              />
            </label>
            <button type="button" onClick={() => void handleQuote()} disabled={pendingAction !== null}>
              {pendingAction === 'quote' ? 'جارٍ إرسال العرض...' : 'إرسال العرض للعميل'}
            </button>
          </Box>

          <Box gap={2}>
            <Text role="titleSm">إسناد الكابتن</Text>
            <label>
              معرّف الكابتن
              <input
                value={form.captainId}
                onChange={(event) => updateForm('captainId', event.target.value)}
                disabled={pendingAction !== null || Boolean(selectedRequest.dispatchAssignmentId)}
              />
            </label>
            <button
              type="button"
              onClick={() => void handleDispatch()}
              disabled={pendingAction !== null || Boolean(selectedRequest.dispatchAssignmentId)}
            >
              {selectedRequest.dispatchAssignmentId
                ? 'تم إنشاء الإسناد'
                : pendingAction === 'dispatch'
                  ? 'جارٍ إنشاء الإسناد...'
                  : 'إسناد الطلب للكابتن'}
            </button>
          </Box>

          <Text role="bodySm">الإجراءات المتاحة: {selectedRequest.allowedActions?.join('، ') || 'تتحقق عند التنفيذ من الباك إند'}</Text>
          <Text role="bodySm">أسباب الحظر: {selectedRequest.blockingReasons?.join('، ') || 'لا يوجد سبب حظر معلن'}</Text>
          <Text role="bodySm">الاستثناء: {selectedRequest.rejectionReason || 'لا يوجد'}</Text>
          {feedback ? <p role="status">{feedback}</p> : null}
        </Box>
      ) : null}
    </Box>
  );
}
