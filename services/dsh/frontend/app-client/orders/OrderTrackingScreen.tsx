import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Badge,
  Box,
  Button,
  Icon,
  MobileScrollView,
  StateView,
  Surface,
  Text,
  TextField,
  TopBar,
  colorRoles,
  spacing,
} from '@bthwani/ui-kit';
import {
  CLIENT_CANCELLATION_REASONS,
  FINANCIAL_CLOSURE_LABELS,
  ORDER_STATUS_LABELS,
  isOrderCancellationStatus,
  useOrderCancellationController,
  type ClientCancellationReasonCode,
  type DshFinancialClosureStatus,
  type DshOrderStatus,
} from '../../shared/orders';
import { DELIVERY_STATUS_LABELS } from '../../shared/dispatch';
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
  if (isOrderCancellationStatus(status)) return 'danger';
  if (status === 'delivered' || status === 'ready_for_pickup') return 'success';
  if (status === 'pending') return 'warning';
  return 'info';
}

function financialTone(status: DshFinancialClosureStatus): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  if (status === 'refund_requested') return 'info';
  if (status === 'session_expired' || status === 'refund_completed' || status === 'no_action') return 'success';
  return 'neutral';
}

function OrderTimeline({ status }: { readonly status: DshOrderStatus }) {
  if (status === 'returning_to_store' || status === 'return_arrived_store' || status === 'returned_to_store') {
    return (
      <Surface tone={status === 'returned_to_store' ? 'raised' : 'warning'} gap={2}>
        <Text role="bodyStrong">{ORDER_STATUS_LABELS[status]}</Text>
        <Text role="bodySm">{status === 'returned_to_store' ? 'استلم المتجر المرتجع وتراجع العمليات الإغلاق المالي المناسب.' : status === 'return_arrived_store' ? 'وصل المرتجع إلى المتجر وينتظر تأكيد الاستلام من الشريك.' : 'تعذر إكمال التسليم واعتمدت العمليات إعادة الطلب إلى المتجر.'}</Text>
      </Surface>
    );
  }
  if (isOrderCancellationStatus(status)) {
    return (
      <Surface tone="danger" gap={2}>
        <Text role="bodyStrong">{ORDER_STATUS_LABELS[status]}</Text>
        <Text role="bodySm">توقفت العمليات التابعة للطلب، وتتم متابعة الأثر المالي بصورة مستقلة داخل WLT.</Text>
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

function ClientCancellationPanel({
  orderId,
  status,
  onOrderChanged,
}: {
  readonly orderId: string;
  readonly status: DshOrderStatus;
  readonly onOrderChanged: () => void | Promise<void>;
}) {
  const [reasonCode, setReasonCode] = React.useState<ClientCancellationReasonCode>('changed_mind');
  const [reasonNote, setReasonNote] = React.useState('');
  const controller = useOrderCancellationController({
    surface: 'client',
    orderId,
    onCancelled: onOrderChanged,
  });
  const canCancel = status === 'pending' || status === 'store_accepted';
  const cancellation =
    controller.state.kind === 'ready'
      ? controller.state.cancellation
      : controller.state.kind === 'submitting'
        ? controller.state.cancellation
        : undefined;

  if (cancellation) {
    return (
      <Surface tone="raised" gap={3}>
        <Text role="titleSm">قرار الإلغاء والاسترداد</Text>
        <View style={styles.detailRow}>
          <Text role="bodySm" tone="muted">سبب الإلغاء</Text>
          <Text role="bodyStrong">{cancellation.reasonCode}</Text>
        </View>
        {cancellation.reasonNote ? (
          <Text role="bodySm" tone="muted">{cancellation.reasonNote}</Text>
        ) : null}
        <Badge
          label={FINANCIAL_CLOSURE_LABELS[cancellation.financialClosureStatus]}
          tone={financialTone(cancellation.financialClosureStatus)}
        />
        {cancellation.financialReference ? (
          <View style={styles.detailRow}>
            <Text role="bodySm" tone="muted">المرجع المالي</Text>
            <Text role="caption">{cancellation.financialReference}</Text>
          </View>
        ) : null}
        {cancellation.financialFailure ? (
          <Text role="bodySm" tone="danger">{cancellation.financialFailure}</Text>
        ) : null}
        <Button
          label={controller.state.kind === 'submitting' ? 'جارٍ تحديث القرار المالي…' : 'تحديث حالة الاسترداد'}
          tone="secondary"
          disabled={controller.state.kind === 'submitting'}
          onPress={() => void controller.refresh()}
        />
      </Surface>
    );
  }

  if (controller.state.kind === 'requires_review') {
    return (
      <Surface tone="warning" gap={3}>
        <Text role="titleSm">الإلغاء يحتاج مراجعة العمليات</Text>
        <Text role="bodySm">{controller.state.message}</Text>
        <Text role="caption" tone="muted">لا يتم إلغاء الطلب أو تغيير حالته المالية قبل اعتماد العمليات.</Text>
      </Surface>
    );
  }

  if (!canCancel) {
    return (
      <Surface tone="raised" gap={2}>
        <Text role="bodyStrong">قرار الإلغاء</Text>
        <Text role="bodySm" tone="muted">
          بدأ تجهيز الطلب أو تنفيذه؛ أي طلب إلغاء الآن يحتاج مراجعة العمليات ولا يُنفذ مباشرة من التطبيق.
        </Text>
      </Surface>
    );
  }

  const submitting = controller.state.kind === 'submitting';
  const selectedReason = CLIENT_CANCELLATION_REASONS.find((option) => option.code === reasonCode);
  const noteRequired = reasonCode === 'other';

  return (
    <Surface tone="raised" gap={3}>
      <Text role="titleSm">إلغاء الطلب</Text>
      <Text role="bodySm" tone="muted">
        الإلغاء متاح قبل بدء التجهيز. يقرر WLT لاحقًا تحرير جلسة الدفع أو إنشاء طلب استرداد وفق الحالة المالية الحقيقية.
      </Text>
      <Box gap={2}>
        {CLIENT_CANCELLATION_REASONS.map((reason) => (
          <Button
            key={reason.code}
            label={reason.label}
            tone={reasonCode === reason.code ? 'brand' : 'secondary'}
            size="sm"
            fullWidth={false}
            disabled={submitting}
            onPress={() => setReasonCode(reason.code as ClientCancellationReasonCode)}
          />
        ))}
      </Box>
      {selectedReason ? <Text role="caption" tone="muted">{selectedReason.description}</Text> : null}
      <TextField
        label={noteRequired ? 'التوضيح المطلوب' : 'ملاحظة اختيارية'}
        placeholder="اكتب معلومات تساعد العمليات على فهم القرار"
        value={reasonNote}
        onChangeText={setReasonNote}
      />
      {controller.state.kind === 'error' ? (
        <Text role="bodySm" tone="danger">{controller.state.message}</Text>
      ) : null}
      <Button
        label={submitting ? 'جارٍ تثبيت الإلغاء…' : 'تأكيد إلغاء الطلب'}
        tone="danger"
        disabled={submitting || (noteRequired && !reasonNote.trim())}
        onPress={() => void controller.submit({ reasonCode, reasonNote })}
      />
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
      <View style={styles.errorRoot}>
        <StateView
          tone="danger"
          title="تعذر فتح رحلة الطلب"
          description={state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void reload()}
        />
        {onBack ? <Button label="العودة للطلبات" tone="secondary" onPress={onBack} /> : null}
      </View>
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
      <TopBar title="رحلة الطلب" onBack={onBack} />
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
        <ClientCancellationPanel orderId={order.id} status={order.status} onOrderChanged={reload} />

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

        <Button label="تحديث الحالة" tone="secondary" onPress={() => void reload()} />
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
  errorRoot: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[4],
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
