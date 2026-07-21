'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Box, Button, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelKpiStrip,
  WebControlPanelQueue,
} from '@bthwani/ui-kit/web';
import styles from '../shared/control-panel-surface.module.css';
import { FINANCIAL_CLOSURE_LABELS } from '../../shared/orders';
import { OrderTruthReadbackSummary } from '../../shared/order-truth';
import { useOperatorOrderWorkboard } from '../../shared/operations/use-operator-order-workboard';
import type { OperationsFocusParams, OperatorOrderWorkboardRow } from '../../shared/operations';
import { resolveRuntimeOrderStatusTone } from '../shared/ControlPanelDshDecisionBoard';
import { buildOperationsHref } from './operations.registry';
import { OrderJourneyOperatorIntervention } from './OrderJourneyOperatorIntervention';

export type OrderJourneyLiveOrdersScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: OperationsFocusParams;
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
      <OrderTruthReadbackSummary
        actor="operator"
        title="حقيقة الطلبات السيادية"
        {...(subGroup === 'cancelled' ? { status: 'cancelled_by_operator' } : {})}
        limit={10}
        onOpenOrder={setSelectedOrderId}
      />

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
                      id: 'assign-captain',
                      label: 'إسناد كابتن',
                      onPress: () => router.push(buildOperationsHref('dispatch-capacity', { orderId: order.id, panel: 'dispatch' })),
                    },
                  }
                : {})}
            />
          ))}
        </WebControlPanelQueue>

        <Box gap={3}>
          <Box gap={2}>
            <Text role="label">القرار التشغيلي التالي</Text>
            <Text role="bodySm" tone={unassigned > 0 ? 'warning' : 'muted'}>
              {unassigned > 0
                ? 'ابدأ بإسناد الطلبات الجاهزة بلا كابتن، ثم راقب الإثبات والإغلاق المالي.'
                : 'راقب الحالات النشطة والإثباتات والاستردادات دون إنشاء حقيقة محلية.'}
            </Text>
            <Button
              label="فتح الإسناد"
              tone="secondary"
              onPress={() => router.push(buildOperationsHref('dispatch-capacity', { subGroup: 'pending' }))}
            />
          </Box>

          {selected ? (
            <OrderJourneyOperatorIntervention order={selected} onChanged={workboard.refresh} />
          ) : (
            <StateView stateId="empty" title="اختر طلبًا" description="اختر صفًا لعرض التدخلات المحكومة والنتيجة المالية." />
          )}

          {selected ? (
            <Box gap={2}>
              <Text role="label">ملخص القراءة الراجعة</Text>
              <Badge label={selected.status} tone={resolveRuntimeOrderStatusTone(selected.status)} />
              <Text role="bodySm">الوضع: {modeLabel(selected.fulfillmentMode)}</Text>
              <Text role="bodySm">الإغلاق المالي: {FINANCIAL_CLOSURE_LABELS[selected.financialClosureStatus]}</Text>
              <Text role="bodySm">مرجع الإغلاق المالي: {selected.financialClosureReference || 'غير متاح'}</Text>
              {selected.podMediaKey ? <Text role="bodySm">إثبات التسليم: {selected.podMediaKey}</Text> : null}
              {selected.deliveryFailureReason ? <Text role="bodySm" tone="danger">سبب التعثر: {selected.deliveryFailureReason}</Text> : null}
              <Button label="فتح التفاصيل" tone="secondary" onPress={() => router.push(buildOperationsHref('live-orders', { orderId: selected.id, panel: 'detail' }))} />
            </Box>
          ) : null}
        </Box>
      </div>
    </Box>
  );
}

export default OrderJourneyLiveOrdersScreen;
