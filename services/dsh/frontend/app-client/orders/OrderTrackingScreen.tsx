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
  PREPARATION_SLA_LABELS,
  useOrderCancellationController,
  type ClientCancellationReasonCode,
  type DshFinancialClosureStatus,
} from '../../shared/orders';
import {
  bidiIsolate,
  buildOrderTruthAccessibilityLabel,
  formatMinorUnits,
  orderEventLabel,
  toOrderTruthSummary,
  type OrderTruth,
} from '../../shared/order-truth';
import { DELIVERY_STATUS_LABELS } from '../../shared/dispatch';
import type { DshPartnerDeliveryTaskStatus } from '../../shared/partner-delivery/partner-delivery.types';
import { ClientPreparationDecisionPanel } from './ClientPreparationDecisionPanel';
import { useClientOrderJourneyController } from './useClientOrderJourneyController';

const PARTNER_DELIVERY_STATUS_LABELS: Readonly<Record<DshPartnerDeliveryTaskStatus, string>> = {
  unassigned: 'بانتظار تعيين سائق من المتجر',
  assigned: 'تم تعيين سائق من المتجر',
  departed: 'السائق في الطريق إليك',
  arrived: 'السائق وصل إلى موقعك',
  proof_pending: 'بانتظار إثبات التسليم',
  completed: 'تم تسليم الطلب',
  cancelled: 'تم إلغاء توصيل الشريك',
  exception: 'تعذر إتمام التوصيل، راجع الدعم',
};

type Props = {
  readonly orderId: string;
  readonly onBack?: () => void;
};

const FULFILLMENT_LABELS: Readonly<Record<OrderTruth['fulfillmentMode'], string>> = {
  bthwani_delivery: 'توصيل بثواني',
  partner_delivery: 'توصيل المتجر',
  pickup: 'استلام ذاتي',
};

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status.startsWith('cancelled_') || status.startsWith('failed_')) return 'danger';
  if (status === 'delivered' || status === 'ready_for_pickup' || status === 'returned_to_store') return 'success';
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

function OrderTimeline({ order }: { readonly order: OrderTruth }) {
  const summary = toOrderTruthSummary(order);
  if (order.statusTimeline.length === 0) {
    return (
      <Surface tone="raised" gap={2}>
        <Text role="titleSm">سجل حالة الطلب</Text>
        <Text role="bodyStrong">{summary.statusLabel}</Text>
        <Text role="bodySm" tone="muted">لم تُعد أحداث إضافية في القراءة الحالية.</Text>
      </Surface>
    );
  }

  return (
    <Surface tone="raised" gap={3}>
      <Text role="titleSm">سجل حالة الطلب</Text>
      {order.statusTimeline.map((event, index) => {
        const current = index === order.statusTimeline.length - 1;
        return (
          <View key={event.id} style={styles.timelineRow}>
            <Icon
              name={current ? 'radio-button-on' : 'checkmark-circle'}
              size={18}
              tone={current ? 'action' : 'success'}
            />
            <View style={styles.timelineText}>
              <Text role={current ? 'bodyStrong' : 'bodySm'}>{orderEventLabel(event)}</Text>
              <Text role="caption" tone="muted">
                {new Date(event.createdAt).toLocaleString('ar-YE')} · الإصدار {event.orderVersion}
              </Text>
            </View>
          </View>
        );
      })}
    </Surface>
  );
}

function ClientCancellationPanel({
  orderId,
  allowedActions,
  onOrderChanged,
}: {
  readonly orderId: string;
  readonly allowedActions: readonly string[];
  readonly onOrderChanged: () => void | Promise<void>;
}) {
  const [reasonCode, setReasonCode] = React.useState<ClientCancellationReasonCode>('changed_mind');
  const [reasonNote, setReasonNote] = React.useState('');
  const controller = useOrderCancellationController({
    surface: 'client',
    orderId,
    onCancelled: onOrderChanged,
  });
  const canCancel = allowedActions.includes('cancel_if_policy_allows');
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
        {cancellation.reasonNote ? <Text role="bodySm" tone="muted">{cancellation.reasonNote}</Text> : null}
        <Badge
          label={FINANCIAL_CLOSURE_LABELS[cancellation.financialClosureStatus]}
          tone={financialTone(cancellation.financialClosureStatus)}
        />
        {cancellation.financialReference ? (
          <View style={styles.detailRow}>
            <Text role="bodySm" tone="muted">المرجع المالي</Text>
            <Text role="caption">{bidiIsolate(cancellation.financialReference)}</Text>
          </View>
        ) : null}
        {cancellation.financialFailure ? <Text role="bodySm" tone="danger">{cancellation.financialFailure}</Text> : null}
        <Button
          label={controller.state.kind === 'submitting' ? 'جارٍ تحديث القرار المالي…' : 'تحديث حالة الاسترداد'}
          accessibilityLabel="تحديث حالة الاسترداد من المصدر المالي"
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
          لا يعرض الخادم إجراء إلغاء مباشر لهذا الطلب. أي متابعة إضافية تتم عبر العمليات وفق السياسة.
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
        صلاحية الإلغاء معروضة من allowedActions. يقرر WLT تحرير الدفع أو الاسترداد بصورة مستقلة.
      </Text>
      <Box gap={2}>
        {CLIENT_CANCELLATION_REASONS.map((reason) => (
          <Button
            key={reason.code}
            label={reason.label}
            accessibilityLabel={`اختيار سبب الإلغاء: ${reason.label}`}
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
      {controller.state.kind === 'error' ? <Text role="bodySm" tone="danger">{controller.state.message}</Text> : null}
      <Button
        label={submitting ? 'جارٍ تثبيت الإلغاء…' : 'تأكيد إلغاء الطلب'}
        accessibilityLabel="تأكيد إلغاء الطلب وفق السياسة"
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
    return <StateView title="جارٍ تحميل رحلة الطلب" description="نقرأ حقيقة الطلب والتجهيز والمشكلات والتتبع من مصادر DSH المقيدة بالحساب." loading />;
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

  const {
    order,
    preparation,
    preparationIssues,
    openPreparationIssueCount,
    pendingCustomerDecisionCount,
    assignment,
    partnerDeliveryTask,
  } = state;
  const summary = toOrderTruthSummary(order);
  const deliveryStatus = assignment?.delivery?.status;
  const accessibilityLabel = buildOrderTruthAccessibilityLabel(order);
  const estimatedReadyLabel = preparation.estimatedReadyAt
    ? new Date(preparation.estimatedReadyAt).toLocaleString('ar-YE')
    : 'لم يحدد بعد';

  return (
    <View style={styles.root}>
      <TopBar title="رحلة الطلب" onBack={onBack} />
      <MobileScrollView fill padding={4} gap={4} contentContainerStyle={styles.content}>
        <Surface tone="action" gap={3}>
          <View style={styles.summaryHeader}>
            <Text role="titleMd" style={styles.actionText}>{bidiIsolate(order.orderNumber)}</Text>
            <Badge label={summary.statusLabel} tone={statusTone(order.status)} />
          </View>
          <Text role="bodySm" style={styles.actionText}>{FULFILLMENT_LABELS[order.fulfillmentMode]}</Text>
          <Text role="caption" style={styles.actionText}>
            {`${order.items.length} أصناف · ${formatMinorUnits(order.totalMinorUnits, order.currency)}`}
          </Text>
          <Text role="caption" style={styles.actionText}>
            {`المالك الحالي: ${summary.currentOwnerLabel} · الإصدار: ${order.version}`}
          </Text>
        </Surface>

        <OrderTimeline order={order} />

        <Surface tone="raised" gap={3}>
          <Box layoutDirection="row" justify="space-between" align="center">
            <Text role="titleSm">تجهيز الطلب</Text>
            <Badge
              label={PREPARATION_SLA_LABELS[preparation.preparationSlaState]}
              tone={preparation.preparationSlaState === 'overdue' ? 'danger' : preparation.preparationSlaState === 'due_soon' ? 'warning' : 'info'}
            />
          </Box>
          <View style={styles.detailRow}>
            <Text role="bodySm" tone="muted">موعد الجاهزية المتوقع</Text>
            <Text role="bodyStrong">{estimatedReadyLabel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text role="bodySm" tone="muted">المشكلات المفتوحة</Text>
            <Text role="bodyStrong">{openPreparationIssueCount}</Text>
          </View>
          {preparation.preparationDelayReason ? (
            <Text role="bodySm" tone="warning">{`سبب تعديل الموعد: ${preparation.preparationDelayReason}`}</Text>
          ) : null}
        </Surface>

        <ClientPreparationDecisionPanel
          orderId={order.id}
          orderItems={order.items}
          issues={preparationIssues}
          pendingCustomerDecisionCount={pendingCustomerDecisionCount}
          onUpdated={reload}
        />

        <ClientCancellationPanel orderId={order.id} allowedActions={order.allowedActions} onOrderChanged={reload} />

        <Surface tone="raised" gap={3}>
          <Text role="titleSm">إسقاط الدفع للقراءة فقط</Text>
          <View style={styles.detailRow}>
            <Text role="bodySm" tone="muted">الحالة</Text>
            <Text role="bodyStrong">{order.paymentStatusProjection}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text role="bodySm" tone="muted">مرجع WLT المعتم</Text>
            <Text role="caption">{bidiIsolate(order.wltPaymentRefId)}</Text>
          </View>
          <Text role="caption" tone="muted">لا ينفذ هذا السطح خصمًا أو استردادًا أو تسوية.</Text>
        </Surface>

        <Surface tone="raised" gap={3}>
          <Text role="titleSm">تفاصيل التوصيل</Text>
          {order.fulfillmentMode === 'partner_delivery' ? (
            partnerDeliveryTask ? (
              <>
                <View style={styles.detailRow}>
                  <Text role="bodySm" tone="muted">حالة توصيل الشريك</Text>
                  <Text role="bodyStrong">{PARTNER_DELIVERY_STATUS_LABELS[partnerDeliveryTask.status]}</Text>
                </View>
                {partnerDeliveryTask.departedAt ? (
                  <View style={styles.detailRow}>
                    <Text role="bodySm" tone="muted">وقت الانطلاق</Text>
                    <Text role="bodyStrong">{new Date(partnerDeliveryTask.departedAt).toLocaleString('ar-YE')}</Text>
                  </View>
                ) : null}
                {partnerDeliveryTask.arrivedAt ? (
                  <View style={styles.detailRow}>
                    <Text role="bodySm" tone="muted">وقت الوصول</Text>
                    <Text role="bodyStrong">{new Date(partnerDeliveryTask.arrivedAt).toLocaleString('ar-YE')}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.emptyDispatch}>
                <Icon name="time-outline" size={24} tone="muted" />
                <Text role="bodyStrong">بانتظار تعيين سائق من المتجر</Text>
              </View>
            )
          ) : assignment ? (
            <>
              <View style={styles.detailRow}>
                <Text role="bodySm" tone="muted">الكابتن</Text>
                <Text role="bodyStrong">{bidiIsolate(assignment.captainId)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text role="bodySm" tone="muted">حالة المهمة</Text>
                <Text role="bodyStrong">{deliveryStatus ? DELIVERY_STATUS_LABELS[deliveryStatus] : 'بانتظار قبول المهمة'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text role="bodySm" tone="muted">وقت الإسناد</Text>
                <Text role="bodyStrong">{new Date(assignment.createdAt).toLocaleString('ar-YE')}</Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyDispatch}>
              <Icon name="time-outline" size={24} tone="muted" />
              <Text role="bodyStrong">لم يتم إسناد كابتن بعد</Text>
              <Text role="bodySm" tone="muted">
                هذا طبيعي ما دام الطلب لدى المتجر أو كان نوع التنفيذ الاستلام الذاتي.
              </Text>
            </View>
          )}
        </Surface>

        <Surface tone="raised" gap={3}>
          <Text role="titleSm">أصناف الطلب المثبتة</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.detailRow}>
              <Text role="bodySm">{item.productName}</Text>
              <Text role="bodyStrong">{`×${item.quantity} · ${formatMinorUnits(item.lineTotalMinorUnits, order.currency)}`}</Text>
            </View>
          ))}
        </Surface>

        <Surface tone="raised" gap={2}>
          <Text role="titleSm">مرجع التدقيق</Text>
          <Text role="caption">{bidiIsolate(order.correlationId)}</Text>
        </Surface>

        <Button
          label="تحديث الحالة"
          accessibilityLabel={`${accessibilityLabel}، تحديث الحالة`}
          tone="secondary"
          onPress={() => void reload()}
        />
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
    gap: spacing[2],
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
