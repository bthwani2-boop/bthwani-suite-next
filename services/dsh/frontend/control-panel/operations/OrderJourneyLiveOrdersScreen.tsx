'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Box, Button, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelKpiStrip,
  WebControlPanelQueue,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import styles from '../shared/control-panel-surface.module.css';
import { FINANCIAL_CLOSURE_LABELS } from '../../shared/orders';
import { useOperatorOrderWorkboard } from '../../shared/operations/use-operator-order-workboard';
import type { OperatorOrderWorkboardRow } from '../../shared/operations';
import { resolveRuntimeOrderStatusTone } from '../shared/ControlPanelDshDecisionBoard';
import { buildOperationsHref } from './operations.registry';
import { OrderJourneyOperatorIntervention } from './OrderJourneyOperatorIntervention';

export type OrderJourneyLiveOrdersScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: { orderId?: string };
};

function isCancelled(status: string): boolean {
  return status === 'cancelled'
    || status.startsWith('cancelled_')
    || status === 'failed_payment'
    || status === 'failed_dispatch';
}

function filterOrders(
  orders: readonly OperatorOrderWorkboardRow[],
  subGroup?: string,
): readonly OperatorOrderWorkboardRow[] {
  if (subGroup === 'bthwani_delivery' || subGroup === 'partner_delivery' || subGroup === 'pickup') {
    return orders.filter((order) => order.fulfillmentMode === subGroup);
  }
  if (subGroup === 'unassigned') {
    return orders.filter((order) =>
      order.fulfillmentMode === 'bthwani_delivery'
      && order.status === 'ready_for_pickup'
      && !order.captainId,
    );
  }
  if (subGroup === 'proofs') return orders.filter((order) => Boolean(order.podMediaKey));
  if (subGroup === 'cancelled') return orders.filter((order) => isCancelled(order.status));
  if (subGroup === 'refunds') return orders.filter((order) => order.financialClosureStatus === 'refund_requested');
  if (subGroup === 'financial-failures') return orders.filter((order) => order.financialClosureStatus === 'failed');
  return orders;
}

function modeLabel(mode: OperatorOrderWorkboardRow['fulfillmentMode']): string {
  if (mode === 'partner_delivery') return 'توصيل المتجر';
  if (mode === 'pickup') return 'استلام ذاتي';
  return 'توصيل بثواني';
}

function financialTone(status: OperatorOrderWorkboardRow['financialClosureStatus']): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  if (status === 'refund_requested') return 'info';
  if (status === 'session_expired' || status === 'refund_completed' || status === 'no_action') return 'success';
  return 'neutral';
}

export function OrderJourneyLiveOrdersScreen({
  subGroup,
  focusParams,
}: OrderJourneyLiveOrdersScreenProps) {
  const router = useRouter();
  const workboard = useOperatorOrderWorkboard();
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(
    focusParams?.orderId ?? null,
  );

  React.useEffect(() => {
    if (focusParams?.orderId) setSelectedOrderId(focusParams.orderId);
  }, [focusParams?.orderId]);

  if (workboard.state.kind === 'loading' && workboard.state.orders.length === 0) {
    return <StateView stateId="loading" title="جاري تحميل رحلة الطلبات" description="تتم قراءة الطلب والإسناد والإلغاء والنتيجة المالية من DSH وWLT." />;
  }
  if (workboard.state.kind === 'error' && workboard.state.orders.length === 0) {
    return (
      <StateView
        stateId="recoverableError"
        title="تعذر تحميل رحلة الطلبات"
        description={workboard.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={workboard.refresh}
      />
    );
  }

  const orders = workboard.state.orders;
  const visible = filterOrders(orders, subGroup);
  const selected = orders.find((order) => order.id === selectedOrderId) ?? null;
  const unassigned = orders.filter((order) =>
    order.fulfillmentMode === 'bthwani_delivery'
    && order.status === 'ready_for_pickup'
    && !order.captainId,
  ).length;
  const active = orders.filter((order) =>
    ['driver_assigned', 'driver_arrived_store', 'picked_up', 'arrived_customer'].includes(order.status),
  ).length;
  const pendingFinancial = orders.filter((order) => order.financialClosureStatus === 'pending').length;
  const requestedRefunds = orders.filter((order) => order.financialClosureStatus === 'refund_requested').length;
  const financialFailures = orders.filter((order) => order.financialClosureStatus === 'failed').length;

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={[
        { id: 'visible', label: 'المعروض', value: String(visible.length), tone: 'neutral' },
        { id: 'unassigned', label: 'جاهزة بلا كابتن', value: String(unassigned), tone: unassigned > 0 ? 'warning' : 'success' },
        { id: 'active', label: 'قيد التوصيل', value: String(active), tone: 'neutral' },
        { id: 'financial-pending', label: 'إغلاق مالي جارٍ', value: String(pendingFinancial), tone: pendingFinancial > 0 ? 'warning' : 'success' },
        { id: 'refunds', label: 'استردادات مطلوبة', value: String(requestedRefunds), tone: requestedRefunds > 0 ? 'warning' : 'neutral' },
        { id: 'financial-failures', label: 'تعثر مالي', value: String(financialFailures), tone: financialFailures > 0 ? 'danger' : 'success' },
      ]} />

      <div className={styles.surfaceSplitGrid}>
        <WebControlPanelQueue title="الطلبات المباشرة" meta={`${visible.length} من ${workboard.state.total}`}>
          {visible.length === 0 ? (
            <StateView stateId="empty" title="لا توجد طلبات مطابقة" description="لا توجد صفوف مطابقة للتصفية الحالية." actionLabel="تحديث" onActionPress={workboard.refresh} />
          ) : visible.map((order) => (
            <WebControlPanelDecisionRow
              key={order.id}
              entityId={order.id}
              entityLabel={`متجر: ${order.storeId} — عميل: ${order.clientId}`}
              status={order.status}
              statusTone={resolveRuntimeOrderStatusTone(order.status)}
              reason={isCancelled(order.status)
                ? `${order.cancellationReasonCode ?? 'cancelled'} · ${FINANCIAL_CLOSURE_LABELS[order.financialClosureStatus]}`
                : `${modeLabel(order.fulfillmentMode)} · ${order.totalPrice.toLocaleString('ar-YE')} ر.ي`}
              sla={`آخر تحديث: ${new Date(order.updatedAt).toLocaleString('ar-YE')}`}
              onInspect={() => setSelectedOrderId(order.id)}
              {...(order.fulfillmentMode === 'bthwani_delivery' && order.status === 'ready_for_pickup' && !order.captainId
                ? {
                    primaryAction: {
                      id: `${order.id}-dispatch`,
                      label: 'إسناد كابتن',
                      onAction: () => router.push(buildOperationsHref('dispatch-capacity', { orderId: order.id, subGroup: 'pending' })),
                    },
                  }
                : {})}
            />
          ))}
        </WebControlPanelQueue>

        {selected ? (
          <Box gap={3}>
            <Box gap={2} padding={4} background="brandSurface" radiusToken="md">
              <Text role="titleSm">الطلب {selected.id}</Text>
              <Text role="bodySm">الحالة: {selected.status}</Text>
              <Text role="bodySm">النمط: {modeLabel(selected.fulfillmentMode)}</Text>
              <Text role="bodySm">الإجمالي: {selected.totalPrice.toLocaleString('ar-YE')} ر.ي</Text>
              <Text role="bodySm">الكابتن: {selected.captainId ?? 'غير مسند'}</Text>
              <Text role="bodySm">مرحلة التوصيل: {selected.captainLifecycleStatus ?? 'لم تبدأ'}</Text>
              <Text role="bodySm">الإثبات: {selected.podMediaKey ?? 'لا يوجد'}</Text>
              {selected.cancellationReasonCode ? (
                <>
                  <Text role="bodySm">سبب الإلغاء: {selected.cancellationReasonCode}</Text>
                  <Text role="bodySm">فاعل الإلغاء: {selected.cancelledByRole ?? 'غير محدد'}</Text>
                  {selected.cancellationNote ? <Text role="caption">{selected.cancellationNote}</Text> : null}
                  <Badge
                    label={FINANCIAL_CLOSURE_LABELS[selected.financialClosureStatus]}
                    tone={financialTone(selected.financialClosureStatus)}
                  />
                  {selected.financialClosureReference ? <Text role="caption">المرجع المالي: {selected.financialClosureReference}</Text> : null}
                  {selected.financialClosureFailure ? <Text role="bodySm" tone="danger">{selected.financialClosureFailure}</Text> : null}
                </>
              ) : null}
              <Button label="إغلاق التفاصيل" tone="secondary" onPress={() => setSelectedOrderId(null)} />
            </Box>
            <OrderJourneyOperatorIntervention order={selected} onChanged={workboard.refresh} />
          </Box>
        ) : (
          <WebControlPanelRecommendation
            title="حقيقة الطلب الموحدة"
            reason="اختر طلبًا لعرض الطلب والإسناد والإلغاء وقرار WLT المالي دون استنتاج حقول غير موجودة."
            confidence="high"
            auditTag="ORDER_CANCELLATION_REFUND_WORKBOARD"
          />
        )}
      </div>
    </Box>
  );
}

export default OrderJourneyLiveOrdersScreen;
