'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, StateView, Text } from '@bthwani/ui-kit';
import { WebControlPanelKpiStrip, WebControlPanelDecisionRow } from '@bthwani/ui-kit/web';
import { buildOperationsHref } from '../operations/operations-registry';
import type { OperationsFocusParams } from '../operations/operations.types';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../operations/operations.types';
import { useOperatorSpecialRequestsController } from './use-special-requests-controller';
import type { DshSpecialRequestResponse } from './special-requests.types';

export type OperatorSpecialRequestsWorkbenchProps = {
  requestType: 'SHEIN_ASSISTED_PURCHASE' | 'AWNAK_ERRAND';
  title: string;
  stageLabels: Readonly<Record<string, string>>;
  stageOrder: readonly string[];
  hubHref?: string;
  subGroup?: string;
  focusParams?: OperationsFocusParams;
};

export function OperatorSpecialRequestsWorkbench({ requestType, title, stageLabels, stageOrder, focusParams }: OperatorSpecialRequestsWorkbenchProps) {
  const router = useRouter();
  const { requests, loadState, getOne, reload } = useOperatorSpecialRequestsController({ requestType, autoLoad: true });
  const [selectedRequest, setSelectedRequest] = React.useState<DshSpecialRequestResponse | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!focusParams?.requestId) {
      setSelectedRequest(null);
      return () => { cancelled = true; };
    }
    void getOne(focusParams.requestId).then((result) => {
      if (!cancelled) setSelectedRequest(result ?? null);
    });
    return () => { cancelled = true; };
  }, [focusParams?.requestId, getOne]);

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
      recommendation: request.allowedActions?.length ? 'مراجعة الإجراءات' : 'عرض التفاصيل',
      reason: request.customerNotes ?? 'لا توجد ملاحظات عميل',
      sla: `المالك: ${request.assignedOperatorId || 'غير مسند'} | أُنشئ: ${request.createdAt}`,
    };
  });

  if (loadState === 'error' || loadState === 'offline' || loadState === 'forbidden' || loadState === 'conflict') {
    const errorMap = {
      error: { title: 'خطأ في تحميل الطلبات', description: 'تعذر تحميل طلبات هذه الخدمة.', stateId: 'recoverableError' },
      offline: { title: 'غير متصل', description: 'تأكد من اتصالك بالإنترنت.', stateId: 'offline' },
      forbidden: { title: 'الوصول مرفوض', description: 'لا تملك الصلاحية اللازمة.', stateId: 'recoverableError' },
      conflict: { title: 'تعارض في البيانات', description: 'أعد القراءة قبل متابعة الإجراء.', stateId: 'recoverableError' },
    } as const;
    const errorState = errorMap[loadState];
    return <StateView stateId={errorState.stateId} title={errorState.title} description={errorState.description} actionLabel="إعادة المحاولة" onActionPress={reload} />;
  }

  return (
    <Box gap={3}>
      <Box gap={1}>
        <Text role="titleMd">{title}</Text>
        <Text role="bodySm" tone="secondary">البيانات والحالات مقروءة من خدمة الطلبات الخاصة السيادية.</Text>
      </Box>

      <WebControlPanelKpiStrip items={summaryKpi} />

      {loadState === 'loading' && requests.length === 0 ? (
        <StateView stateId="loading" title="جاري تحميل الطلبات" description="تتم قراءة قائمة الطلبات الخاصة من DSH." />
      ) : requests.length === 0 ? (
        <StateView stateId="empty" title="لا توجد طلبات" description="لا توجد طلبات خاصة في هذا القسم حاليًا." actionLabel="تحديث" onActionPress={reload} />
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

      {selectedRequest && focusParams?.panel === 'detail' ? (
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

          <Text role="bodySm">الإجراءات المتاحة: {selectedRequest.allowedActions?.join('، ') || 'لا يوجد'}</Text>
          <Text role="bodySm">أسباب الحظر: {selectedRequest.blockingReasons?.join('، ') || 'لا يوجد'}</Text>
          <Text role="bodySm">الاستثناء: {selectedRequest.rejectionReason || 'لا يوجد'}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
