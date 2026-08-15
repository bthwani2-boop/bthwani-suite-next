import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
  alpha,
  colorRoles,
  radius,
  spacing,
} from "@bthwani/ui-kit";
import {
  CLIENT_CANCELLATION_REASONS,
  FINANCIAL_CLOSURE_LABELS,
  PREPARATION_SLA_LABELS,
  useOrderCancellationController,
  type ClientCancellationReasonCode,
  type DshFinancialClosureStatus,
} from "../../shared/orders";
import {
  bidiIsolate,
  buildOrderTruthAccessibilityLabel,
  formatMinorUnits,
  orderEventLabel,
  toOrderTruthSummary,
  type OrderTruth,
} from "../../shared/order-truth";
import { DELIVERY_STATUS_LABELS } from "../../shared/dispatch";
import type { DshPartnerDeliveryTaskStatus } from "../../shared/partner-delivery/partner-delivery.types";
import { ClientLiveTrackingCard } from "./ClientLiveTrackingCard";
import { ClientPreparationDecisionPanel } from "./ClientPreparationDecisionPanel";
import { useClientOrderController } from "./useClientOrderController";
import { useStoreDetailController } from "../../shared/store";
import { Image } from "react-native";

const PARTNER_DELIVERY_STATUS_LABELS: Readonly<Record<DshPartnerDeliveryTaskStatus, string>> = {
  unassigned: "بانتظار تعيين سائق من المتجر",
  assigned: "تم تعيين سائق من المتجر",
  departed: "السائق في الطريق إليك",
  arrived: "السائق وصل إلى موقعك",
  proof_pending: "بانتظار إثبات التسليم",
  completed: "تم تسليم الطلب",
  cancelled: "تم إلغاء توصيل الشريك",
  exception: "تعذر إتمام التوصيل، راجع الدعم",
};

type Props = {
  readonly orderId: string;
  readonly onBack?: () => void;
  readonly onOpenPickup?: (orderId: string) => void;
  readonly onOpenOrderSupport?: (orderId: string, fulfillmentMode: OrderTruth["fulfillmentMode"]) => void;
  readonly onOpenNotifications?: () => void;
};

const FULFILLMENT_LABELS: Readonly<Record<OrderTruth["fulfillmentMode"], string>> = {
  bthwani_delivery: "توصيل بثواني",
  partner_delivery: "توصيل المتجر",
  pickup: "استلام ذاتي",
};

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status.startsWith("cancelled_") || status.startsWith("failed_")) return "danger";
  if (status === "delivered" || status === "ready_for_pickup" || status === "returned_to_store") return "success";
  if (status === "pending") return "warning";
  return "info";
}

function financialTone(status: DshFinancialClosureStatus): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "failed") return "danger";
  if (status === "pending") return "warning";
  if (status === "refund_requested") return "info";
  if (status === "session_expired" || status === "refund_completed" || status === "no_action") return "success";
  return "neutral";
}

function journeyTitle(order: OrderTruth): string {
  if (order.status === "delivered") return "تم تسليم طلبك";
  if (order.status === "ready_for_pickup") return "طلبك جاهز للاستلام";
  if (order.status === "cancelled" || order.status.startsWith("cancelled_")) return "تم إلغاء الطلب";
  if (order.status === "failed" || order.status.startsWith("failed_")) return "تعذر إكمال الطلب";
  if (order.status === "out_for_delivery" || order.status === "in_transit") return "جاري توصيل ومتابعة طلبك";
  if (order.status === "preparing" || order.status === "store_accepted") return "المتجر يجهز طلبك";
  return "تم استلام طلبك";
}

function journeyStepIndex(order: OrderTruth): number {
  if (order.status === "delivered" || order.status === "ready_for_pickup") return 3;
  if (order.status === "out_for_delivery" || order.status === "in_transit") return 2;
  if (order.status === "preparing" || order.status === "store_accepted") return 1;
  return 0;
}

function JourneySteps({ order }: { readonly order: OrderTruth }) {
  const activeIndex = journeyStepIndex(order);
  const steps = ["تم الاستلام", "قيد التجهيز", order.fulfillmentMode === "pickup" ? "جاهز للاستلام" : "في الطريق", "تم التسليم"];
  return (
    <View style={styles.journeySteps} accessibilityLabel={`تقدم الطلب: ${steps[activeIndex]}`}>
      {steps.map((label, index) => (
        <View key={label} style={styles.journeyStep}>
          <View style={[styles.journeyDot, index <= activeIndex && styles.journeyDotActive]}>
            <Text role="caption" style={index <= activeIndex ? styles.journeyDotTextActive : styles.journeyDotText}>{String(index + 1)}</Text>
          </View>
          <Text role="caption" style={[styles.journeyLabel, index === activeIndex && styles.journeyLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function OrderStoreHero({ order }: { readonly order: OrderTruth }) {
  const summary = toOrderTruthSummary(order);
  const storeController = useStoreDetailController(order.storeId);
  const store = storeController.state.kind === "success" ? storeController.state.store : null;

  return (
    <Surface tone="default" style={styles.storeHero}>
      {store?.heroImageSource ? (
        <Image source={store.heroImageSource} style={styles.storeHeroBg} />
      ) : null}
      <View style={styles.storeHeroOverlay}>
        <View style={styles.storeHeroHeader}>
          {store?.logoImageSource ? (
            <Image source={store.logoImageSource} style={styles.storeLogo} />
          ) : (
            <View style={styles.storeLogoPlaceholder}>
              <Text style={{ fontSize: 24 }}>{store?.placeholderEmoji ?? "🏪"}</Text>
            </View>
          )}
          <View style={styles.storeHeroInfo}>
            <Text role="titleMd" style={styles.storeHeroTitle}>
              {store?.displayName ?? "متابعة الطلب"}
            </Text>
            <Text role="caption" style={styles.storeHeroSubtitle}>
              الطلب {bidiIsolate(order.orderNumber)} · {order.items.length} أصناف · {formatMinorUnits(order.totalMinorUnits, order.currency)}
            </Text>
          </View>
        </View>
        <Surface tone={statusTone(order.status) === "neutral" ? "default" : statusTone(order.status) as any} style={styles.heroStatusCard}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              {(order.status === "out_for_delivery" || order.status === "in_transit") ? (
                <View style={{ backgroundColor: alpha(colorRoles.brandAction, 0.1), borderRadius: 16, padding: 4 }}>
                  <Icon name="pulse-outline" size={20} tone="brand" />
                </View>
              ) : null}
              <Text role="bodyStrong" style={{ color: colorRoles.surfaceBase }}>{journeyTitle(order)}</Text>
            </View>
            <Badge label={summary.statusLabel} tone={statusTone(order.status)} />
          </View>
          <Text role="bodySm" style={{ color: alpha(colorRoles.surfaceBase, 0.8), textAlign: "right", marginTop: 4 }}>
            {FULFILLMENT_LABELS[order.fulfillmentMode]}
          </Text>
          <JourneySteps order={order} />
        </Surface>
      </View>
    </Surface>
  );
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
              name={current ? "radio-button-on" : "checkmark-circle"}
              size={18}
              tone={current ? "action" : "success"}
            />
            <View style={styles.timelineText}>
              <Text role={current ? "bodyStrong" : "bodySm"}>{orderEventLabel(event)}</Text>
              <Text role="caption" tone="muted">
                {new Date(event.createdAt).toLocaleString("ar-YE")} · الإصدار {event.orderVersion}
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
  isCancelled,
  onOpenSupport,
}: {
  readonly orderId: string;
  readonly isCancelled: boolean;
  readonly onOpenSupport?: ((orderId: string) => void) | undefined;
}) {
  if (isCancelled) {
    return (
      <Surface tone="warning" gap={2}>
        <Text role="titleSm">حالة الطلب</Text>
        <Text role="bodyStrong" tone="danger">
          تم إلغاء هذا الطلب من قبل قسم العمليات.
        </Text>
        <Text role="caption" tone="muted">
          إذا كانت لديك أي استفسارات حول استرداد المبلغ أو تفاصيل الإلغاء، يرجى التواصل مع الدعم.
        </Text>
        {onOpenSupport ? (
          <Button
            label="مراسلة الدعم"
            tone="secondary"
            size="sm"
            onPress={() => onOpenSupport(orderId)}
          />
        ) : null}
      </Surface>
    );
  }

  return (
    <Surface tone="raised" gap={2}>
      <Text role="titleSm">إلغاء أو تعديل الطلب</Text>
      <Text role="bodySm" tone="muted">
        يدخل الطلب مرحلة التجهيز الفوري مع المتجر فور تأكيده. في حال رغبتك بإلغاء أو تعديل الطلب قبل التجهيز، يرجى التواصل مع فريق العمليات والدعم.
      </Text>
      {onOpenSupport ? (
        <Button
          label="طلب المساعدة أو الإلغاء عبر الدعم"
          tone="secondary"
          size="sm"
          onPress={() => onOpenSupport(orderId)}
        />
      ) : null}
    </Surface>
  );
}

export function OrderTrackingScreen({
  orderId,
  onBack,
  onOpenPickup,
  onOpenOrderSupport,
  onOpenNotifications,
}: Props) {
  const { state, reload } = useClientOrderController(orderId);

  if (state.kind === "loading") {
    return <StateView title="جارٍ تحميل رحلة الطلب" description="نقرأ حقيقة الطلب والتجهيز والمشكلات والتتبع من مصادر DSH المقيدة بالحساب." loading />;
  }

  if (state.kind === "error") {
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
    liveTracking,
    partnerDeliveryTask,
  } = state;
  const summary = toOrderTruthSummary(order);
  const deliveryStatus = assignment?.delivery?.status;
  const accessibilityLabel = buildOrderTruthAccessibilityLabel(order);
  const estimatedReadyLabel = preparation.estimatedReadyAt
    ? new Date(preparation.estimatedReadyAt).toLocaleString("ar-YE")
    : "لم يحدد بعد";

  return (
    <View style={styles.root}>
      <TopBar
        title="متابعة الطلب"
        onBack={onBack}
        rightSlot={
          onOpenNotifications ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الإشعارات"
              onPress={onOpenNotifications}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: alpha(colorRoles.shadowBase, 0.04),
              }}
            >
              <Icon name="notifications-outline" size={20} color={colorRoles.textPrimary} />
            </Pressable>
          ) : undefined
        }
      />
      <MobileScrollView fill padding={3} gap={3} contentContainerStyle={styles.content}>
        <OrderStoreHero order={order} />

        <OrderTimeline order={order} />

        {order.status === "delivered" ? (
          <Surface tone="raised" gap={2} style={{ borderColor: colorRoles.brandAction, borderWidth: 1.5 }}>
            <Box layoutDirection="row" justify="space-between" align="center">
              <Text role="titleSm">⭐ تم تسليم الطلب بنجاح</Text>
              <Badge label="مكتمل" tone="success" />
            </Box>
            <Text role="bodySm" tone="muted">
              {order.fulfillmentMode === "pickup"
                ? "شكراً لطلبك! يمكنك تقييم جودة منتجات المتجر وسرعة الاستلام."
                : "شكراً لطلبك! يمكنك تقييم أداء كابتن التوصيل وجودة المنتجات."}
            </Text>
          </Surface>
        ) : null}

        <Surface tone="raised" gap={3} style={{ borderColor: alpha(colorRoles.brandAction, 0.3), borderWidth: 1.5 }}>
          <Box layoutDirection="row" justify="space-between" align="center">
            <Box layoutDirection="row" gap={2} align="center">
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: alpha(colorRoles.brandAction, 0.12),
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Icon name="chatbubble-ellipses" size={18} tone="brand" />
              </View>
              <Text role="titleSm">
                {order.fulfillmentMode === "pickup"
                  ? "محادثة المتجر والعمليات"
                  : "محادثة الكابتن والعمليات"}
              </Text>
            </Box>
            <Badge
              label="محادثة مدمجة بالطلب"
              tone="brand"
            />
          </Box>
          <Text role="bodySm" tone="muted">
            {order.fulfillmentMode === "pickup"
              ? "محادثة مخصصة مع المتجر لمتابعة استلام وتجهيز طلبك، مع إشراف ومتابعة قسم العمليات (مراسلة الدعم بشأن الطلب)."
              : "محادثة مباشرة مع كابتن التوصيل لمتابعة الوصول وتأكيد العنوان، مع إشراف ومتابعة قسم العمليات (مراسلة الدعم بشأن الطلب)."}
          </Text>
          {onOpenOrderSupport ? (
            <Button
              label={
                order.fulfillmentMode === "pickup"
                  ? "مراسلة المتجر بخصوص الطلب"
                  : "مراسلة كابتن التوصيل"
              }
              accessibilityLabel={`${accessibilityLabel}، مراسلة الدعم بشأن الطلب ومتابعة الكابتن`}
              tone="primary"
              leading={<Icon name="chatbubbles-outline" size={18} color={colorRoles.textInverse} />}
              onPress={() => onOpenOrderSupport(order.id, order.fulfillmentMode)}
            />
          ) : null}
        </Surface>

        <Surface tone="raised" gap={2}>
          <Box layoutDirection="row" justify="space-between" align="center">
            <Text role="titleSm">تجهيز الطلب</Text>
            <Badge
              label={PREPARATION_SLA_LABELS[preparation.preparationSlaState]}
              tone={preparation.preparationSlaState === "overdue" ? "danger" : preparation.preparationSlaState === "due_soon" ? "warning" : "info"}
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

        <ClientCancellationPanel
          orderId={order.id}
          isCancelled={order.status.startsWith("cancelled_") || order.status.startsWith("failed_")}
          onOpenSupport={onOpenOrderSupport ? (id) => onOpenOrderSupport(id, order.fulfillmentMode) : undefined}
        />

        <Surface tone="raised" gap={2}>
          <Text role="titleSm">تفاصيل الدفع</Text>
          <View style={styles.detailRow}>
            <Text role="bodySm" tone="muted">إجمالي الطلب</Text>
            <Text role="bodyStrong">
              {(order.totalMinorUnits / 100).toLocaleString("ar-YE")} {order.currency}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text role="bodySm" tone="muted">حالة السداد</Text>
            <Text role="bodyStrong">{order.paymentStatusProjection || "مؤكد"}</Text>
          </View>
        </Surface>

        <Surface tone="raised" gap={3}>
          <Text role="titleSm">طريقة التنفيذ</Text>
          {order.fulfillmentMode === "pickup" ? (
            <View style={styles.pickupPanel}>
              <Icon name="storefront-outline" size={28} tone="action" />
              <Text role="bodyStrong">استلام الطلب من الفرع</Text>
              <Text role="bodySm" tone="muted" style={styles.centerText}>
                افتح جلسة الاستلام لقراءة الجاهزية، نافذة الحضور، ومحاولات التحقق من DSH.
              </Text>
              {onOpenPickup ? (
                <Button
                  label="فتح حالة الاستلام"
                  accessibilityLabel={`${accessibilityLabel}، فتح حالة الاستلام من الفرع`}
                  tone="primary"
                  onPress={() => onOpenPickup(order.id)}
                />
              ) : null}
            </View>
          ) : order.fulfillmentMode === "partner_delivery" ? (
            partnerDeliveryTask ? (
              <>
                <View style={styles.detailRow}>
                  <Text role="bodySm" tone="muted">حالة توصيل الشريك</Text>
                  <Text role="bodyStrong">{PARTNER_DELIVERY_STATUS_LABELS[partnerDeliveryTask.status]}</Text>
                </View>
                {partnerDeliveryTask.departedAt ? (
                  <View style={styles.detailRow}>
                    <Text role="bodySm" tone="muted">وقت الانطلاق</Text>
                    <Text role="bodyStrong">{new Date(partnerDeliveryTask.departedAt).toLocaleString("ar-YE")}</Text>
                  </View>
                ) : null}
                {partnerDeliveryTask.arrivedAt ? (
                  <View style={styles.detailRow}>
                    <Text role="bodySm" tone="muted">وقت الوصول</Text>
                    <Text role="bodyStrong">{new Date(partnerDeliveryTask.arrivedAt).toLocaleString("ar-YE")}</Text>
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
                <Text role="bodyStrong">{deliveryStatus ? DELIVERY_STATUS_LABELS[deliveryStatus] : "بانتظار قبول المهمة"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text role="bodySm" tone="muted">وقت الإسناد</Text>
                <Text role="bodyStrong">{new Date(assignment.createdAt).toLocaleString("ar-YE")}</Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyDispatch}>
              <Icon name="time-outline" size={24} tone="muted" />
              <Text role="bodyStrong">لم يتم إسناد كابتن بعد</Text>
              <Text role="bodySm" tone="muted">هذا طبيعي ما دام الطلب لدى المتجر.</Text>
            </View>
          )}
        </Surface>

        {order.fulfillmentMode === "bthwani_delivery" ? (
          <ClientLiveTrackingCard tracking={liveTracking} />
        ) : null}

        <Surface tone="raised" gap={2}>
          <Text role="titleSm">أصناف الطلب المثبتة</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.detailRow}>
              <Text role="bodySm">{item.productName}</Text>
              <Text role="bodyStrong">{`×${item.quantity} · ${formatMinorUnits(item.lineTotalMinorUnits, order.currency)}`}</Text>
            </View>
          ))}
        </Surface>

        <Surface tone="raised" gap={2}>
          <Text role="titleSm">رقم الطلب المرجعي</Text>
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
    justifyContent: "center",
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceWarm,
  },
  content: {
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  summaryHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  heroCopy: { flex: 1, alignItems: "flex-end", gap: spacing[1] },
  actionText: {
    color: colorRoles.surfaceBase,
    textAlign: "right",
  },
  journeySteps: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: spacing[1],
    paddingTop: spacing[2],
  },
  journeyStep: { flex: 1, alignItems: "center", gap: spacing[1] },
  journeyDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceBase,
  },
  journeyDotActive: { backgroundColor: colorRoles.brandAction, borderColor: colorRoles.brandAction },
  journeyDotText: { color: colorRoles.brandStructure },
  journeyDotTextActive: { color: colorRoles.surfaceBase },
  journeyLabel: { color: alpha(colorRoles.textInverse, 0.82), textAlign: "center", fontSize: 11 },
  journeyLabelActive: { color: colorRoles.surfaceBase, fontWeight: "800" },
  timelineRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[3],
  },
  timelineText: { flex: 1, alignItems: "flex-end" },
  storeHero: {
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colorRoles.surfaceWarm,
    borderWidth: 1,
    borderColor: alpha(colorRoles.shadowBase, 0.05),
  },
  storeHeroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    opacity: 0.15,
  },
  storeHeroOverlay: {
    padding: spacing[4],
    gap: spacing[4],
  },
  storeHeroHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[3],
  },
  storeLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colorRoles.surfaceBase,
    backgroundColor: colorRoles.surfaceBase,
  },
  storeLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: alpha(colorRoles.brandAction, 0.1),
    alignItems: "center",
    justifyContent: "center",
  },
  storeHeroInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  storeHeroTitle: {
    color: colorRoles.brandStructure,
    fontWeight: "800",
  },
  storeHeroSubtitle: {
    color: colorRoles.textSecondary,
    marginTop: 2,
  },
  heroStatusCard: {
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colorRoles.surfaceBase,
    gap: spacing[1],
    shadowColor: colorRoles.brandStructure,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
  },
  emptyDispatch: {
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  pickupPanel: {
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  centerText: {
    textAlign: "center",
  },
});
