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
import {
  fetchDshRuntimeOrders,
  type DshRuntimeOrderRow,
} from '../../shared/operations/dsh-operational-runtime-adapter';
import { resolveRuntimeOrderStatusTone } from '../shared/ControlPanelDshDecisionBoard';
import { buildOperationsHref } from './operations.registry';

export type LiveOrdersScreenProps = {
  state?: 'ready' | 'loading' | 'error' | 'empty';
  hubHref: string;
  subGroup?: string;
  onRetry?: () => void;
};

const FULFILLMENT_MODE_IDS = [
  'bthwani_delivery',
  'partner_delivery',
  'pickup',
] as const;

type FulfillmentMode = (typeof FULFILLMENT_MODE_IDS)[number];

type RuntimeState = {
  readonly orders: readonly DshRuntimeOrderRow[];
  readonly total: number;
  readonly loaded: boolean;
  readonly offline: boolean;
  readonly error: string | null;
};

function isFulfillmentMode(value?: string): value is FulfillmentMode {
  return FULFILLMENT_MODE_IDS.some((mode) => mode === value);
}

function filterOrders(
  orders: readonly DshRuntimeOrderRow[],
  subGroup?: string,
): readonly DshRuntimeOrderRow[] {
  if (isFulfillmentMode(subGroup)) {
    return orders.filter((order) => order.fulfillmentMode === subGroup);
  }
  if (subGroup === 'unassigned') {
    return orders.filter(
      (order) => order.fulfillmentMode === 'bthwani_delivery'
        && !order.captainId
        && !['delivered', 'cancelled'].includes(order.status),
    );
  }
  if (subGroup === 'proofs') {
    return orders.filter((order) => Boolean(order.podMediaKey));
  }
  return orders;
}

export function LiveOrdersScreen({
  state = 'ready',
  subGroup,
  onRetry,
}: LiveOrdersScreenProps) {
  const router = useRouter();
  const [retryCount, setRetryCount] = React.useState(0);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [runtimeState, setRuntimeState] = React.useState<RuntimeState>({
    orders: [],
    total: 0,
    loaded: false,
    offline: false,
    error: null,
  });

  const retry = React.useCallback(() => {
    setSelectedOrderId(null);
    setRetryCount((count) => count + 1);
    onRetry?.();
  }, [onRetry]);

  React.useEffect(() => {
    let cancelled = false;
    setRuntimeState((current) => ({
      ...current,
      loaded: false,
      offline: false,
      error: null,
    }));

    void fetchDshRuntimeOrders({ limit: 100 }, undefined, 'operator').then((result) => {
      if (cancelled) return;
      if (result.kind === 'ok') {
        setRuntimeState({
          orders: result.orders,
          total: result.total,
          loaded: true,
          offline: false,
          error: null,
        });
        return;
      }
      if (result.kind === 'offline') {
        setRuntimeState({
          orders: [],
          total: 0,
          loaded: false,
          offline: true,
          error: 'لم يتم ضبط عنوان DSH Runtime أو تعذر الوصول إليه.',
        });
        return;
      }
      setRuntimeState({
        orders: [],
        total: 0,
        loaded: false,
        offline: false,
        error: result.message,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  if (state === 'loading' || (!runtimeState.loaded && !runtimeState.error)) {
    return (
      <StateView
        stateId="loading"
        title="جاري تحميل الطلبات الحية"
        description="تتم قراءة قائمة الطلبات مباشرة من DSH Runtime."
      />
    );
  }

  if (state === 'error' || runtimeState.error) {
    return (
      <StateView
        stateId={runtimeState.offline ? 'offline' : 'recoverableError'}
        title={runtimeState.offline ? 'DSH Runtime غير متصل' : 'تعذر تحميل الطلبات الحية'}
        description={runtimeState.error ?? 'تعذر الاتصال بخدمة العمليات.'}
        actionLabel="إعادة المحاولة"
        onActionPress={retry}
      />
    );
  }

  const visibleOrders = filterOrders(runtimeState.orders, subGroup);
  const selectedOrder = runtimeState.orders.find((order) => order.id === selectedOrderId) ?? null;
  const unassignedCount = runtimeState.orders.filter(
    (order) => order.fulfillmentMode === 'bthwani_delivery'
      && !order.captainId
      && !['delivered', 'cancelled'].includes(order.status),
  ).length;
  const proofCount = runtimeState.orders.filter((order) => Boolean(order.podMediaKey)).length;

  const summaryKpi = [
    {
      id: 'visible',
      label: 'المعروض في التبويب',
      value: String(visibleOrders.length),
      tone: 'neutral' as const,
    },
    {
      id: 'unassigned',
      label: 'غير مسندة',
      value: String(unassignedCount),
      tone: unassignedCount > 0 ? ('warning' as const) : ('success' as const),
    },
    {
      id: 'proofs',
      label: 'إثباتات مسجلة',
      value: String(proofCount),
      tone: 'neutral' as const,
    },
    {
      id: 'source',
      label: 'مصدر البيانات',
      value: 'DSH Runtime',
      tone: 'success' as const,
    },
  ];

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={summaryKpi} />

      <div className={styles.surfaceSplitGrid}>
        <WebControlPanelQueue
          title="الطلبات المباشرة"
          meta={`${visibleOrders.length} من ${runtimeState.total}`}
        >
          {visibleOrders.length === 0 ? (
            <StateView
              stateId="empty"
              title="لا توجد طلبات مطابقة"
              description="لم تُرجع DSH طلبات تطابق التبويب الحالي."
              actionLabel="تحديث"
              onActionPress={retry}
            />
          ) : (
            visibleOrders.map((order) => {
              const dispatchAction = order.fulfillmentMode === 'bthwani_delivery' && !order.captainId
                ? {
                    id: `${order.id}-dispatch`,
                    label: 'إسناد كابتن',
                    onAction: () => router.push(
                      buildOperationsHref('dispatch-capacity', {
                        orderId: order.id,
                        subGroup: 'pending',
                      }),
                    ),
                  }
                : undefined;
              const exceptionAction = order.deliveryFailureReason
                ? {
                    id: `${order.id}-exception`,
                    label: 'فتح الاستثناء',
                    onAction: () => router.push(
                      buildOperationsHref('exceptions', {
                        orderId: order.id,
                        subGroup: 'active',
                        panel: 'exception',
                      }),
                    ),
                  }
                : undefined;

              return (
                <WebControlPanelDecisionRow
                  key={order.id}
                  entityId={order.id}
                  entityLabel={`متجر: ${order.storeId} — عميل: ${order.clientId}`}
                  status={order.status}
                  statusTone={resolveRuntimeOrderStatusTone(order.status)}
                  reason={order.deliveryFailureReason ?? `نمط التنفيذ: ${order.fulfillmentMode}`}
                  sla={`آخر تحديث: ${new Date(order.updatedAt).toLocaleString('ar-SA')}`}
                  onInspect={() => setSelectedOrderId(order.id)}
                  {...(dispatchAction ? { primaryAction: dispatchAction } : {})}
                  {...(exceptionAction ? { secondaryAction: exceptionAction } : {})}
                />
              );
            })
          )}
        </WebControlPanelQueue>

        <Box gap={3}>
          {selectedOrder ? (
            <Box gap={2} padding={4} background="brandSurface" radiusToken="md">
              <Text role="titleSm">تفاصيل الطلب {selectedOrder.id}</Text>
              <Text role="bodySm">المتجر: {selectedOrder.storeId}</Text>
              <Text role="bodySm">العميل: {selectedOrder.clientId}</Text>
              <Text role="bodySm">نمط التنفيذ: {selectedOrder.fulfillmentMode}</Text>
              <Text role="bodySm">الحالة: {selectedOrder.status}</Text>
              <Text role="bodySm">الكابتن: {selectedOrder.captainId ?? 'غير مسند'}</Text>
              <Text role="bodySm">
                حالة الكابتن: {selectedOrder.captainLifecycleStatus ?? 'غير متوفرة'}
              </Text>
              <Text role="bodySm">
                إثبات التسليم: {selectedOrder.podMediaKey ?? 'لا يوجد'}
              </Text>
              <Text role="bodySm" tone={selectedOrder.deliveryFailureReason ? 'danger' : 'muted'}>
                سبب فشل التسليم: {selectedOrder.deliveryFailureReason ?? 'لا يوجد'}
              </Text>
              <Box gap={2}>
                <Button
                  label="إغلاق التفاصيل"
                  tone="secondary"
                  onPress={() => setSelectedOrderId(null)}
                />
                {selectedOrder.deliveryFailureReason ? (
                  <Button
                    label="فتح غرفة الاستثناء"
                    onPress={() => router.push(
                      buildOperationsHref('exceptions', {
                        orderId: selectedOrder.id,
                        subGroup: 'active',
                        panel: 'exception',
                      }),
                    )}
                  />
                ) : null}
              </Box>
            </Box>
          ) : (
            <WebControlPanelRecommendation
              title="تفاصيل الطلب"
              reason="اختر طلبًا من القائمة لعرض الحقيقة التشغيلية المسجلة في DSH دون تضمين شاشات تطبيقات أخرى داخل لوحة التحكم."
              confidence="high"
              auditTag="LIVE_ORDER_RUNTIME_DETAIL"
            />
          )}
        </Box>
      </div>
    </Box>
  );
}

export default LiveOrdersScreen;
