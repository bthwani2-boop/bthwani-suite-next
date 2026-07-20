'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelKpiStrip,
  WebControlPanelQueue,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import styles from '../shared/control-panel-surface.module.css';
import { useOperatorOrderWorkboard } from '../../shared/operations/use-operator-order-workboard';
import type { OperatorOrderWorkboardRow } from '../../shared/operations/order-workboard.api';
import { resolveRuntimeOrderStatusTone } from '../shared/ControlPanelDshDecisionBoard';
import { buildOperationsHref } from './operations.registry';
import { OrderJourneyOperatorIntervention } from './OrderJourneyOperatorIntervention';

export type OrderJourneyLiveOrdersScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: { orderId?: string };
};

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

  if (workboard.state.kind === 'loading') {
    return <StateView stateId="loading" title="جاري تحميل رحلة الطلبات" description="تتم قراءة الطلب والإسناد والتوصيل والإثبات من DSH." />;
  }
  if (workboard.state.kind === 'error') {
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

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={[
        { id: 'visible', label: 'المعروض', value: String(visible.length), tone: 'neutral' },
        { id: 'unassigned', label: 'جاهزة بلا كابتن', value: String(unassigned), tone: unassigned > 0 ? 'warning' : 'success' },
        { id: 'active', label: 'قيد التوصيل', value: String(active), tone: 'info' },
        { id: 'proofs', label: 'إثباتات', value: String(orders.filter((order) => Boolean(order.podMediaKey)).length), tone: 'neutral' },
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
              reason={`${modeLabel(order.fulfillmentMode)} · ${order.totalPrice.toLocaleString('ar-YE')} ر.ي`}
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
              <Button label="إغلاق التفاصيل" tone="secondary" onPress={() => setSelectedOrderId(null)} />
            </Box>
            <OrderJourneyOperatorIntervention order={selected} onChanged={workboard.refresh} />
          </Box>
        ) : (
          <WebControlPanelRecommendation
            title="حقيقة الطلب الموحدة"
            reason="اختر طلبًا لعرض الطلب والإسناد والتوصيل والإثبات دون استنتاج حقول غير موجودة."
            confidence="high"
            auditTag="ORDER_JOURNEY_WORKBOARD"
          />
        )}
      </div>
    </Box>
  );
}

export default OrderJourneyLiveOrdersScreen;
