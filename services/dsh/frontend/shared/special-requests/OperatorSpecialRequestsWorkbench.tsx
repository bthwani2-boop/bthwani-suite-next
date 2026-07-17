'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, StateView } from '@bthwani/ui-kit';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
} from '@bthwani/ui-kit/web';
import { buildOperationsHref } from '../operations/operations-registry';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../ControlPanelDshDecisionBoard';
import { useOperatorSpecialRequestsController } from './use-special-requests-controller';
// Removed styles import that violated boundary
export type OperatorSpecialRequestsWorkbenchProps = {
  requestType: 'SHEIN_ASSISTED_PURCHASE' | 'AWNAK_ERRAND';
  title: string;
  stageLabels: Record<string, string>;
  stageOrder: readonly string[];
  hubHref?: string;
  subGroup?: string;
  focusParams?: any;
};

export function OperatorSpecialRequestsWorkbench({
  requestType,
  title,
  stageLabels,
  stageOrder,
  focusParams,
}: OperatorSpecialRequestsWorkbenchProps) {
  const router = useRouter();
  
  const { requests, loadState, getOne } = useOperatorSpecialRequestsController({
    requestType,
    autoLoad: true,
  });

  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);

  React.useEffect(() => {
    if (focusParams?.requestId) {
      getOne(focusParams.requestId).then((res) => {
        if (res) setSelectedRequest(res);
      });
    } else {
      setSelectedRequest(null);
    }
  }, [focusParams?.requestId, getOne]);

  const summaryKpi = stageOrder.map((stage) => ({
    id: stage,
    label: stageLabels[stage] ?? stage,
    value: String(requests.filter((r) => r.workflowStage === stage).length),
    tone: (stage === 'exception' || stage === 'escalated' || stage === 'dispatch_pending') ? ('danger' as const)
      : (stage === 'completed' || stage === 'delivered') ? ('success' as const)
      : ('neutral' as const),
  }));

  const rows = requests.map((r) => {
    const statusTone = r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'warning';
    return {
      id: r.id,
      label: r.clientId ? `العميل: ${r.clientId}` : r.id,
      status: r.workflowStage || r.status,
      statusTone: DSH_CONTROL_PANEL_TONE_MAP[statusTone] ?? 'neutral',
      risk: 'neutral' as const,
      recommendation: 'مراجعة',
      reason: r.customerNotes ?? '',
      sla: `المالك: ${r.assignedOperatorId || 'غير مسند'} | SLA: ${r.createdAt}`,
    };
  });

  if (loadState === 'error') {
    return (
      <StateView
        stateId="recoverableError"
        title="خطأ في تحميل الطلبات"
        description="تعذر تحميل طلبات هذه الخدمة."
        actionLabel="إعادة المحاولة"
      />
    );
  }

  return (
    <Box gap={3}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{title}</h2>
      </div>

      <WebControlPanelKpiStrip items={summaryKpi} />

      {loadState === 'loading' && !requests.length ? (
        <p>جاري التحميل...</p>
      ) : requests.length === 0 ? (
        <StateView
          stateId="empty"
          title="لا توجد طلبات"
          description="لا يوجد طلبات خاصة في هذا القسم حالياً."
          actionLabel="تحديث"
        />
      ) : (
        <Box gap={2} style={{}}>
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
                onAction: () =>
                  router.push(
                    buildOperationsHref(requestType === 'SHEIN_ASSISTED_PURCHASE' ? 'sheinproxy' : 'awnak-operations', {
                      requestId: item.id,
                    })
                  ),
              }}
              secondaryAction={{
                id: 'details',
                label: 'عرض التفاصيل',
                onAction: () =>
                  router.push(
                    buildOperationsHref(requestType === 'SHEIN_ASSISTED_PURCHASE' ? 'sheinproxy' : 'awnak-operations', {
                      panel: 'detail',
                      requestId: item.id,
                    })
                  ),
              }}
            />
          ))}
        </Box>
      )}

      {selectedRequest && focusParams?.panel === 'detail' && (
        <Box padding={4} background="brandSurface" radiusToken="md">
          <h3>المفتش (Inspector): {selectedRequest.id}</h3>
          <p>السياق: {selectedRequest.clientId}</p>
          <p>مرجع WLT: {selectedRequest.wltPaymentSessionId || 'غير متوفر'}</p>
          <p>الحالة التشغيلية: {selectedRequest.workflowStage || selectedRequest.status}</p>
          <p>مرحلة التنفيذ: {selectedRequest.dispatchAssignmentId ? `مسند للكابتن: ${selectedRequest.dispatchAssignmentId}` : 'غير مسند'}</p>
          <p>النسخة: {selectedRequest.version}</p>
          
          {requestType === 'SHEIN_ASSISTED_PURCHASE' && (
            <>
              <p>رابط المنتج: {selectedRequest.productUrl || '—'}</p>
              <p>الكمية: {selectedRequest.quantity || '—'} | المقاس: {selectedRequest.size || '—'} | اللون: {selectedRequest.color || '—'}</p>
              <p>ملاحظات المتغير: {selectedRequest.variantNotes || '—'}</p>
              <p>مرجع التوصيل: {selectedRequest.deliveryAddressReference || '—'}</p>
              <p>دليل الشراء (Batch): {selectedRequest.purchaseBatchId || '—'}</p>
              <p>مرجع الاستلام (Inbound): {selectedRequest.inboundReference || '—'}</p>
            </>
          )}

          {requestType === 'AWNAK_ERRAND' && (
            <>
              <p>النوع: {selectedRequest.itemType || '—'}</p>
              <p>مرجع الاستلام: {selectedRequest.pickupAddressReference || '—'}</p>
              <p>مرجع التسليم: {selectedRequest.dropoffAddressReference || '—'}</p>
              <p>متطلبات المناولة: {selectedRequest.handlingRequirements || '—'}</p>
              <p>الجدولة: {selectedRequest.scheduleMode || '—'} {selectedRequest.scheduledAt || ''}</p>
            </>
          )}

          <p>الإجراءات المتاحة: {selectedRequest.allowedActions?.join(', ') || 'لا يوجد'}</p>
          <p>أسباب الحظر: {selectedRequest.blockingReasons?.join(', ') || 'لا يوجد'}</p>
          <p>الأخطاء/الاستثناءات: {selectedRequest.rejectionReason || 'لا يوجد'}</p>
        </Box>
      )}
    </Box>
  );
}
