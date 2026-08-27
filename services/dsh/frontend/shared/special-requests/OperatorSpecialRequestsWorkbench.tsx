'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, StateView, Text, TextField, type StateTone } from '@bthwani/ui-kit';
import { WebControlPanelDecisionRow, WebControlPanelKpiStrip } from '@bthwani/ui-kit/web';
import { buildOperationsHref } from '../operations/operations-registry';
import type { OperationsFocusParams } from '../operations/operations.types';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../operations/operations.types';
import { useOperatorSpecialRequestsController } from './use-special-requests-controller';
import type {
  DshSpecialRequestResponse,
  DshUpdateSpecialRequest,
  SpecialRequestDetailBundle,
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

type FailureCopy = { title: string; description: string; tone: StateTone };

type OperatorMutableStatus = NonNullable<DshUpdateSpecialRequest['status']>;

type OperatorForm = {
  status: OperatorMutableStatus;
  workflowStage: string;
  proposedAmountMinorUnits: string;
  proposedCurrency: string;
  proposalReason: string;
  assignedOperatorId: string;
  rejectionReason: string;
  captainId: string;
  informationQuestion: string;
};

const OPERATOR_STATUSES: readonly OperatorMutableStatus[] = [
  'under_review',
  'needs_customer_input',
  'approved',
  'cancelled',
  'rejected',
];

const DISPATCH_OWNED_STATUSES = new Set<string>(['assigned', 'in_progress', 'completed']);
const DISPATCH_OWNED_STAGES = new Set<string>([
  'captain_assignment',
  'out_for_delivery',
  'proof_of_delivery',
  'delivered',
  'assigned',
  'captain_enroute_to_pickup',
  'arrived_at_pickup',
  'item_received',
  'in_progress',
  'arrived_at_dropoff',
  'proof_review',
  'completed',
]);

const OPERATOR_STATUS_TRANSITIONS: Readonly<Record<string, readonly OperatorMutableStatus[]>> = {
  submitted: ['under_review', 'cancelled'],
  under_review: ['needs_customer_input', 'rejected', 'cancelled'],
  needs_customer_input: ['under_review', 'cancelled'],
  approved: ['cancelled'],
};

function isDispatchOwnedRequest(request: DshSpecialRequestResponse): boolean {
  return DISPATCH_OWNED_STATUSES.has(request.status);
}

function isTransitionLocked(request: DshSpecialRequestResponse): boolean {
  return isDispatchOwnedRequest(request) || request.status === 'completed' || request.status === 'cancelled' || request.status === 'rejected';
}

function operatorStatusOptions(request: DshSpecialRequestResponse): readonly OperatorMutableStatus[] {
  const currentStatus = request.status === 'submitted' ? 'under_review' : request.status;
  const options = new Set<OperatorMutableStatus>([
    ...(OPERATOR_STATUS_TRANSITIONS[request.status] ?? []),
    ...(OPERATOR_STATUSES.includes(currentStatus as OperatorMutableStatus) ? [currentStatus as OperatorMutableStatus] : []),
  ]);
  return OPERATOR_STATUSES.filter((status) => options.has(status));
}

const FAILURE_COPY: Readonly<Record<'error' | 'offline' | 'forbidden' | 'conflict', FailureCopy>> = {
  error: { title: 'خطأ في تحميل الطلبات', description: 'تعذر تحميل طلبات هذه الخدمة.', tone: 'danger' },
  offline: { title: 'غير متصل', description: 'تأكد من اتصالك بالإنترنت.', tone: 'warning' },
  forbidden: { title: 'الوصول مرفوض', description: 'لا تملك الصلاحية اللازمة.', tone: 'danger' },
  conflict: { title: 'تعارض في البيانات', description: 'أعد القراءة قبل متابعة الإجراء.', tone: 'warning' },
};

function formFromRequest(request: DshSpecialRequestResponse): OperatorForm {
  return {
    status: request.status === 'submitted' ? 'under_review' : request.status,
    workflowStage: request.workflowStage ?? '',
    proposedAmountMinorUnits: request.wltQuoteAmountMinorUnits === null || request.wltQuoteAmountMinorUnits === undefined
      ? ''
      : String(request.wltQuoteAmountMinorUnits),
    proposedCurrency: request.wltQuoteCurrency ?? 'YER',
    proposalReason: '',
    assignedOperatorId: request.assignedOperatorId ?? '',
    rejectionReason: request.rejectionReason ?? '',
    captainId: '',
    informationQuestion: '',
  };
}

function parsePositiveMinorUnits(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('قيمة العرض يجب أن تكون عددًا صحيحًا موجبًا بالوحدة الصغرى.');
  }
  return parsed;
}

function DetailValue({ label, value }: { readonly label: string; readonly value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  return <Text role="bodySm">{label}: {String(value)}</Text>;
}

function ExecutionEvidence({ detail }: { readonly detail: SpecialRequestDetailBundle | undefined }) {
  const execution = detail?.execution;
  const financial = detail?.financial;
  const exception = execution?.latestException;
  const payment = financial?.paymentSession;
  return (
    <Box gap={2} padding={3} background="surfaceMuted" radiusToken="md">
      <Text role="titleSm">التنفيذ والأدلة والاستثناءات</Text>
      <DetailValue label="الكابتن" value={execution?.captainId} />
      <DetailValue label="حالة الإسناد" value={execution?.assignmentStatus} />
      <DetailValue label="حالة التوصيل" value={execution?.deliveryStatus} />
      <DetailValue label="طريقة إثبات التسليم" value={execution?.podMethod} />
      <DetailValue label="مرجع إثبات التسليم" value={execution?.podReference} />
      <DetailValue label="ملاحظة التنفيذ" value={execution?.deliveryNote} />
      {exception ? (
        <Box gap={1} padding={2} background="warningSurface" radiusToken="sm">
          <Text role="titleSm">آخر استثناء</Text>
          <DetailValue label="السبب" value={exception.reasonCode} />
          <DetailValue label="التفاصيل" value={exception.note} />
          <DetailValue label="الشدة" value={exception.severity} />
          <DetailValue label="الحالة" value={exception.status} />
          <DetailValue label="قرار المعالجة" value={exception.resolutionAction} />
          <DetailValue label="ملاحظة القرار" value={exception.resolutionNote} />
        </Box>
      ) : <Text role="bodySm" tone="secondary">لا يوجد استثناء مسجل.</Text>}
      <Text role="titleSm">القراءة المالية من WLT</Text>
      <DetailValue label="حالة القراءة" value={financial?.readState} />
      <DetailValue label="حالة جلسة الدفع" value={payment?.status} />
      <DetailValue label="مرجع المزود" value={payment?.providerReference} />
      <DetailValue label="القيمة" value={payment?.amountMinorUnits} />
      <DetailValue label="العملة" value={payment?.currency} />
      <DetailValue label="قابلية التسوية" value={financial?.settlementApplicability} />
      <DetailValue label="سبب قرار التسوية" value={financial?.settlementReason} />
    </Box>
  );
}

export function OperatorSpecialRequestsWorkbench({
  requestType,
  title,
  stageLabels,
  stageOrder,
  focusParams,
}: OperatorSpecialRequestsWorkbenchProps) {
  const router = useRouter();
  const {
    requests,
    detailsByRequestId,
    loadState,
    getOne,
    reload,
    update,
    assignDispatch,
    requestInformation,
  } = useOperatorSpecialRequestsController({ requestType, autoLoad: true });
  const [selectedRequest, setSelectedRequest] = React.useState<DshSpecialRequestResponse | null>(null);
  const [form, setForm] = React.useState<OperatorForm | null>(null);
  const [pendingAction, setPendingAction] = React.useState<'transition' | 'information' | 'quote' | 'dispatch' | null>(null);
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
    if (isTransitionLocked(selectedRequest)) {
      setFeedback('هذه الحالة يملكها Dispatch أو هي نهائية؛ تُقرأ هنا ولا تُعدّل عبر انتقال عام.');
      return;
    }
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
      applyReadback(await update(selectedRequest.id, input), 'تم تطبيق الانتقال وقراءة النسخة المحدثة من DSH.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'تعذر تطبيق الانتقال التشغيلي.');
    } finally {
      setPendingAction(null);
    }
  }, [applyReadback, form, selectedRequest, update]);

  const handleRequestInformation = React.useCallback(async () => {
    if (!selectedRequest || !form) return;
    const question = form.informationQuestion.trim();
    if (question.length < 5) {
      setFeedback('سؤال المعلومات الإضافية يجب أن يحتوي على خمسة أحرف على الأقل.');
      return;
    }
    setPendingAction('information');
    setFeedback(null);
    try {
      applyReadback(
        await requestInformation(selectedRequest, question),
        'تم إرسال السؤال للعميل ونقل الطلب إلى مرحلة المعلومات الإضافية.',
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'تعذر طلب المعلومات الإضافية.');
    } finally {
      setPendingAction(null);
    }
  }, [applyReadback, form, requestInformation, selectedRequest]);

  const handleQuote = React.useCallback(async () => {
    if (!selectedRequest || !form) return;
    setPendingAction('quote');
    setFeedback(null);
    try {
      const amount = parsePositiveMinorUnits(form.proposedAmountMinorUnits);
      const currency = form.proposedCurrency.trim().toUpperCase();
      if (!currency) throw new Error('رمز العملة مطلوب.');
      const proposalReason = form.proposalReason.trim();
      if (proposalReason.length < 5) throw new Error('سبب العرض مطلوب ويجب أن يحتوي على خمسة أحرف على الأقل.');
      applyReadback(await update(selectedRequest.id, {
        expectedVersion: selectedRequest.version,
        status: 'needs_customer_input',
        workflowStage: 'customer_approval',
        quotePolicyId: 'special-request-standard',
        proposedAmountMinorUnits: amount,
        proposedCurrency: currency,
        proposalReason,
      }), 'تم إرسال العرض للعميل وأصبحت الموافقة والدفع متاحين من تطبيق العميل.');
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
      applyReadback(await assignDispatch(selectedRequest.id, captainId), 'تم إنشاء إسناد الكابتن وقراءة حالة الطلب المحدثة.');
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
    return <StateView title={errorState.title} description={errorState.description} tone={errorState.tone} actionLabel="إعادة المحاولة" onActionPress={reload} />;
  }

  const selectedDetail = selectedRequest ? detailsByRequestId[selectedRequest.id] : undefined;
  const exchange = selectedDetail?.informationExchange;
  const transitionLocked = selectedRequest ? isTransitionLocked(selectedRequest) : true;
  const quoteEligible = selectedRequest?.status === 'under_review' || selectedRequest?.status === 'needs_customer_input';
  const operatorStages = stageOrder.filter((stage) => !DISPATCH_OWNED_STAGES.has(stage));

  return (
    <Box gap={3}>
      <Box gap={1}>
        <Text role="titleMd">{title}</Text>
        <Text role="bodySm" tone="secondary">البيانات والحالات والأدلة مقروءة من الملاك السياديين DSH وDispatch وWLT.</Text>
      </Box>
      <WebControlPanelKpiStrip items={summaryKpi} />

      {loadState === 'loading' && requests.length === 0 ? (
        <StateView title="جاري تحميل الطلبات" description="تتم قراءة قائمة الطلبات الخاصة من DSH." tone="info" loading />
      ) : requests.length === 0 ? (
        <StateView title="لا توجد طلبات" description="لا توجد طلبات خاصة في هذا القسم حاليًا." actionLabel="تحديث" onActionPress={reload} />
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
                  'special-ops',
                  {
                    requestId: item.id,
                    panel: 'detail',
                    subGroup: requestType === 'SHEIN_ASSISTED_PURCHASE' ? 'shein' : 'awnak',
                  },
                )),
              }}
            />
          ))}
        </Box>
      )}

      {selectedRequest && form && focusParams?.panel === 'detail' ? (
        <Box gap={3} padding={4} background="brandSurface" radiusToken="md">
          <Text role="titleSm">المفتش: {selectedRequest.id}</Text>
          <DetailValue label="العميل" value={selectedRequest.clientId} />
          <DetailValue label="الحالة" value={stageLabels[selectedRequest.workflowStage || ''] ?? selectedRequest.workflowStage ?? selectedRequest.status} />
          <DetailValue label="الإسناد" value={selectedRequest.dispatchAssignmentId || 'غير مسند'} />
          <DetailValue label="النسخة" value={selectedRequest.version} />

          {requestType === 'SHEIN_ASSISTED_PURCHASE' ? (
            <Box gap={1}>
              <DetailValue label="رابط المنتج" value={selectedRequest.productUrl} />
              <DetailValue label="الكمية" value={selectedRequest.quantity} />
              <DetailValue label="المقاس" value={selectedRequest.size} />
              <DetailValue label="اللون" value={selectedRequest.color} />
              <DetailValue label="دفعة الشراء" value={selectedRequest.purchaseBatchId} />
              <DetailValue label="مرجع الاستلام" value={selectedRequest.inboundReference} />
            </Box>
          ) : (
            <Box gap={1}>
              <DetailValue label="النوع" value={selectedRequest.itemType} />
              <DetailValue label="مرجع الاستلام" value={selectedRequest.pickupAddressReference} />
              <DetailValue label="مرجع التسليم" value={selectedRequest.dropoffAddressReference} />
              <DetailValue label="متطلبات المناولة" value={selectedRequest.handlingRequirements} />
            </Box>
          )}

          <Box gap={2} padding={3} background="surfaceMuted" radiusToken="md">
            <Text role="titleSm">طلب معلومات إضافية</Text>
            {exchange ? (
              <Box gap={1}>
                <DetailValue label="السؤال" value={exchange.question} />
                <DetailValue label="رد العميل" value={exchange.response} />
                <DetailValue label="حالة الجولة" value={exchange.status} />
              </Box>
            ) : <Text role="bodySm" tone="secondary">لم تُفتح جولة معلومات لهذا الطلب.</Text>}
            <TextField
              label="السؤال المطلوب من العميل"
              value={form.informationQuestion}
              onChangeText={(value) => updateForm('informationQuestion', value)}
              multiline
              numberOfLines={4}
              maxLength={2000}
              disabled={pendingAction !== null || exchange?.status === 'pending'}
            />
            <Button
              label={pendingAction === 'information' ? 'جارٍ إرسال السؤال...' : 'طلب المعلومات من العميل'}
              tone="secondary"
              loading={pendingAction === 'information'}
              disabled={pendingAction !== null || exchange?.status === 'pending' || form.informationQuestion.trim().length < 5}
              onPress={() => void handleRequestInformation()}
            />
          </Box>

          <Box gap={2}>
            {transitionLocked ? (
              <Text role="bodySm" tone="secondary">الحالة الحالية يملكها Dispatch/WLT أو أُغلقت نهائيًا؛ لا يوجد تعديل lifecycle عام من لوحة العمليات.</Text>
            ) : (
              <>
                <label>
                  الحالة التشغيلية
                  <select value={form.status} onChange={(event) => updateForm('status', event.target.value as OperatorMutableStatus)} disabled={pendingAction !== null}>
                    {operatorStatusOptions(selectedRequest).map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label>
                  مرحلة سير العمل
                  <select value={form.workflowStage} onChange={(event) => updateForm('workflowStage', event.target.value)} disabled={pendingAction !== null}>
                    <option value="">بدون تغيير صريح</option>
                    {operatorStages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage] ?? stage}</option>)}
                  </select>
                </label>
                <TextField label="المشغّل المسؤول" value={form.assignedOperatorId} onChangeText={(value) => updateForm('assignedOperatorId', value)} disabled={pendingAction !== null} />
                <TextField label="سبب الرفض التشغيلي" value={form.rejectionReason} onChangeText={(value) => updateForm('rejectionReason', value)} disabled={pendingAction !== null} />
                <Button label={pendingAction === 'transition' ? 'جارٍ تطبيق الانتقال...' : 'تطبيق الانتقال وقراءة النتيجة'} tone="primary" loading={pendingAction === 'transition'} disabled={pendingAction !== null} onPress={() => void handleTransition()} />
              </>
            )}
          </Box>

          <Box gap={2}>
            <Text role="titleSm">طلب تسعير WLT وموافقة العميل</Text>
            <TextField label="القيمة المقترحة بالوحدة الصغرى" value={form.proposedAmountMinorUnits} keyboardType="numeric" onChangeText={(value) => updateForm('proposedAmountMinorUnits', value)} disabled={pendingAction !== null} />
            <TextField label="العملة المقترحة" value={form.proposedCurrency} autoCapitalize="characters" onChangeText={(value) => updateForm('proposedCurrency', value)} disabled={pendingAction !== null} />
            <TextField label="سبب الاقتراح" value={form.proposalReason} multiline numberOfLines={3} maxLength={2000} onChangeText={(value) => updateForm('proposalReason', value)} disabled={pendingAction !== null} />
            <Button label={pendingAction === 'quote' ? 'جارٍ إرسال العرض...' : 'إرسال العرض للعميل'} tone="primary" loading={pendingAction === 'quote'} disabled={pendingAction !== null || !quoteEligible || exchange?.status === 'pending'} onPress={() => void handleQuote()} />
          </Box>

          <Box gap={2}>
            <Text role="titleSm">إسناد الكابتن</Text>
            <TextField label="معرّف الكابتن" value={form.captainId} onChangeText={(value) => updateForm('captainId', value)} disabled={pendingAction !== null || Boolean(selectedRequest.dispatchAssignmentId)} />
            <Button
              label={selectedRequest.dispatchAssignmentId ? 'تم إنشاء الإسناد' : pendingAction === 'dispatch' ? 'جارٍ إنشاء الإسناد...' : 'إسناد الطلب للكابتن'}
              tone={selectedRequest.dispatchAssignmentId ? 'success' : 'primary'}
              loading={pendingAction === 'dispatch'}
              disabled={pendingAction !== null || Boolean(selectedRequest.dispatchAssignmentId)}
              onPress={() => void handleDispatch()}
            />
          </Box>

          <ExecutionEvidence detail={selectedDetail} />
          <DetailValue label="الإجراءات المتاحة" value={selectedRequest.allowedActions?.join('، ') || 'تتحقق عند التنفيذ من الباك إند'} />
          <DetailValue label="أسباب الحظر" value={selectedRequest.blockingReasons?.join('، ') || 'لا يوجد سبب حظر معلن'} />
          {feedback ? <Text role="bodySm" tone="secondary">{feedback}</Text> : null}
        </Box>
      ) : null}
    </Box>
  );
}
