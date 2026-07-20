import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  Icon,
  MobileScrollView,
  StateView,
  Surface,
  Text,
  TopBar,
  colorRoles,
  spacing,
} from '@bthwani/ui-kit';
import { ORDER_STATUS_LABELS, type DshOrderStatus } from '../../shared/orders';
import { DELIVERY_STATUS_LABELS } from '../../shared/dispatch/dispatch.types';
import { useClientOrderJourneyController } from './useClientOrderJourneyController';

type Props = {
  readonly orderId: string;
  readonly onBack?: () => void;
};

const STATUS_ORDER: readonly DshOrderStatus[] = [
  'pending',
  'store_accepted',
  'preparing',
  'ready_for_pickup',
  'driver_assigned',
  'driver_arrived_store',
  'picked_up',
  'arrived_customer',
  'delivered',
];

const FULFILLMENT_LABELS = {
  bthwani_delivery: 'توصيل بثواني',
  partner_delivery: 'توصيل المتجر',
  pickup: 'استلام ذاتي',
} as const;

function statusTone(status: DshOrderStatus): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'cancelled') return 'danger';
  if (status === 'delivered' || status === 'ready_for_pickup') return 'success';
  if (status === 'pending') return 'warning';
  return 'info';
}

function OrderTimeline({ status }: { readonly status: DshOrderStatus }) {
  if (status === 'cancelled') {
    return (
      <Surface tone="danger" gap={2}>
        <Text role="bodyStrong">تم إلغاء الطلب</Text>
        <Text role="bodySm">راجع سبب الإلغاء في تفاصيل الطلب أو تواصل مع الدعم عند الحاجة.</Text>
      </Surface>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(status);
  return (
    <Surface tone="raised" gap={3}>
      <Text role="titleSm">مراحل الطلب</Text>
      {STATUS_ORDER.map((step, index) => {
        const completed = currentIndex >= index;
        const current = currentIndex === index;
        return (
          <View key={step} style={styles.timelineRow}>
            <Icon
              name={completed ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              tone={completed ? 'success' : 'muted'}
            />
            <View style={styles.timelineText}>
              <Text role={current ? 'bodyStrong' : 'bodySm'}>
                {ORDER_STATUS_LABELS[step]}
              </Text>
              {current ? <Text role="caption" tone="muted">الحالة الحالية</Text> : null}
            </View>
          </View>
        );
      })}
    </Surface>
  );
}

export function OrderTrackingScreen({ orderId, onBack }: Props) {
  const { state, reload } = useClientOrderJourneyController(orderId);

  if (state.kind === 'loading') {
    return <StateView title="جارٍ تحميل رحلة الطلب" description="نقرأ حالة الطلب والتتبع المباشر من DSH." loading />;
  }

  if (state.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر فتح رحلة الطلب"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={reload}
        secondaryActionLabel={onBack ? 'العودة للطلبات' : undefined}
        onSecondaryActionPress={onBack}
      />
    );
  }

  const { order, assignment } = state;
  const items = order.items ?? [];
  const totalPrice = items.reduce(
    (sum, item) => sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
    0,
  );
  const deliveryStatus = assignment?.delivery?.status;

  return (
    <View style={styles.root}>
      <TopBar title="رحلة الطلب" onBackPress={onBack} />
      <MobileScrollView fill padding={4} gap={4} contentContainerStyle={styles.content}>
        <Surface tone="action" gap={3}>
          <View style={styles.summaryHeader}>
            <Text role="titleMd" style={styles.actionText}>{`#${order.id.slice(-6).toUpperCase()}`}</Text>
            <Badge label={ORDER_STATUS_LABELS[order.status]} tone={statusTone(order.status)} />
          </View>
          <Text role="bodySm" style={styles.actionText}>
            {FULFILLMENT_LABELS[order.fulfillmentMode]}
          </Text>
          <Text role="caption" style={styles.actionText}>
            {`${items.length} أصناف · ${totalPrice.toLocaleString('ar-YE')} ر.ي`}
          </Text>
        </Surface>

        <OrderTimeline status={order.status} />

        <Surface tone="raised" gap={3}>
          <Text role="titleSm">تفاصيل التوصيل</Text>
          {assignment ? (
            <>
              <View style={styles.detailRow}>
                <Text role="bodySm" tone="muted">الكابتن</Text>
                <Text role="bodyStrong">{assignment.captainId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text role="bodySm" tone="muted">حالة المهمة</Text>
                <Text role="bodyStrong">
                  {deliveryStatus ? DELIVERY_STATUS_LABELS[deliveryStatus] : 'بانتظار قبول المهمة'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text role="bodySm" tone="muted">وقت الإسناد</Text>
                <Text role="bodyStrong">
                  {new Date(assignment.createdAt).toLocaleString('ar-YE')}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyDispatch}>
              <Icon name="time-outline" size={24} tone="muted" />
              <Text role="bodyStrong">لم يتم إسناد كابتن بعد</Text>
              <Text role="bodySm" tone="muted">
                هذا طبيعي ما دام الطلب لدى المتجر أو كان نوع التنفيذ توصيل المتجر أو الاستلام الذاتي.
              </Text>
            </View>
          )}
        </Surface>

        <Surface tone="raised" gap={3}>
          <Text role="titleSm">أصناف الطلب</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.detailRow}>
              <Text role="bodySm">{item.productName}</Text>
              <Text role="bodyStrong">{`×${item.quantity}`}</Text>
            </View>
          ))}
        </Surface>

        <Button label="تحديث الحالة" tone="secondary" onPress={reload} />
        {onBack ? <Button label="العودة للطلبات" tone="ghost" onPress={onBack} /> : null}
      </MobileScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  content: {
    paddingBottom: spacing[12],
  },
  summaryHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionText: {
    color: colorRoles.surfaceBase,
    textAlign: 'right',
  },
  timelineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[3],
  },
  timelineText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  detailRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
  },
  emptyDispatch: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
});
