import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Icon,
  MobileScrollView,
  Surface,
  Text,
  TopBar,
  spacing,
  colorRoles,
  brandScale,
} from "@bthwani/ui-kit";
import {
  bidiIsolate,
  buildOrderTruthAccessibilityLabel,
  canExecuteOrderTruthAction,
  formatMinorUnits,
  toOrderTruthSummary,
  useOrderTruthCollectionController,
  type OrderTruth,
} from "../../shared/order-truth";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

function orderStatusTone(status: string): StatusTone {
  if (status === "pending" || status === "arrived_customer") return "warning";
  if (status === "ready_for_pickup" || status === "delivered" || status === "returned_to_store") return "success";
  if (status.startsWith("cancelled_") || status.startsWith("failed_")) return "danger";
  if ([
    "store_accepted",
    "preparing",
    "driver_assigned",
    "driver_arrived_store",
    "picked_up",
    "returning_to_store",
    "return_arrived_store",
  ].includes(status)) return "info";
  return "neutral";
}

type Props = {
  readonly onOpenOrder?: (orderId: string) => void;
  readonly onBack?: () => void;
};

function OrderCard({ order, onOpenOrder }: { order: OrderTruth; onOpenOrder?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const view = toOrderTruthSummary(order);
  const items = order.items;
  const mainItemName = items[0]?.productName ?? "طلب بلا عناصر قابلة للعرض";
  const summaryText = items.length > 1 ? `${mainItemName} و${items.length - 1} عناصر أخرى` : mainItemName;
  const isActive = order.currentOwner !== "terminal";
  const canOpen = canExecuteOrderTruthAction(order, "view") && Boolean(onOpenOrder);
  const accessibilityLabel = buildOrderTruthAccessibilityLabel(order);

  return (
    <Surface style={styles.card}>
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        style={styles.cardHeader}
        accessibilityLabel={`${accessibilityLabel}، ${expanded ? "طي المحتويات" : "توسيع المحتويات"}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.cardHeaderMain}>
          <View style={styles.iconContainer}>
            <Icon name={isActive ? "bicycle-outline" : "receipt-outline"} size={22} color={colorRoles.brandAction} />
          </View>
          <View style={styles.headerText}>
            <Text role="bodyStrong" style={styles.titleText}>{summaryText}</Text>
            <Text role="caption" tone="muted" style={styles.subtitleText}>
              {`${view.totalLabel} • ${items.length} عناصر • المتجر: ${bidiIsolate(order.storeId)}`}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Badge label={view.statusLabel} tone={orderStatusTone(order.status)} />
          <Text role="caption" tone="muted" style={styles.dateText}>
            {`${bidiIsolate(order.orderNumber)} • ${view.createdAtLabel}`}
          </Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <Text role="bodyStrong" style={styles.sectionTitle}>محتويات الطلب المثبتة:</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text role="body" style={styles.itemName}>{item.productName}</Text>
              <Text role="bodyStrong" style={styles.itemQtyPrice}>
                {`×${item.quantity} (${formatMinorUnits(item.lineTotalMinorUnits, order.currency)})`}
              </Text>
            </View>
          ))}
          <View style={styles.truthMeta}>
            <Text role="caption" tone="muted">المالك الحالي: {view.currentOwnerLabel}</Text>
            <Text role="caption" tone="muted">حالة الدفع: {order.paymentStatusProjection}</Text>
            <Text role="caption" tone="muted">الإصدار: {order.version}</Text>
          </View>

          <View style={styles.actionRow}>
            {canOpen ? (
              <Button
                style={styles.actionButton}
                label={order.allowedActions.includes("track") ? "تتبع الطلب" : "تفاصيل الطلب"}
                accessibilityLabel={`${accessibilityLabel}، فتح التفاصيل`}
                tone={order.allowedActions.includes("track") ? "primary" : "secondary"}
                size="sm"
                onPress={() => onOpenOrder?.(order.id)}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </Surface>
  );
}

export function OrdersListScreen({ onOpenOrder, onBack }: Props) {
  const { state, reload } = useOrderTruthCollectionController("client", { limit: 100 });
  const visibleOrders = state.kind === "success" || state.kind === "partial" ? state.orders : [];

  return (
    <View style={styles.container}>
      <TopBar title="طلباتي" {...(onBack ? { onBack } : {})} />

      {state.kind === "idle" || state.kind === "loading" ? (
        <View style={styles.center}>
          <Text role="body">جارٍ تحميل حقيقة طلباتك من DSH…</Text>
        </View>
      ) : state.kind === "offline" || state.kind === "forbidden" || state.kind === "error" ? (
        <View style={styles.center}>
          <Text role="bodyStrong" style={{ color: state.kind === "forbidden" ? colorRoles.warning : colorRoles.danger }}>
            {state.kind === "forbidden" ? "لا تملك الجلسة صلاحية الطلبات" : "تعذر تحميل الطلبات"}
          </Text>
          <Text role="bodySm" tone="muted">{state.message}</Text>
          {state.kind !== "forbidden" ? (
            <Button
              label="إعادة المحاولة"
              accessibilityLabel="إعادة محاولة تحميل طلباتي"
              tone="secondary"
              onPress={reload}
              style={{ marginTop: spacing[4] }}
            />
          ) : null}
        </View>
      ) : state.kind === "empty" ? (
        <View style={styles.center}>
          <Text role="bodyStrong">لا توجد طلبات</Text>
          <Text role="bodySm" tone="muted">ستظهر طلباتك هنا بعد إنشاء أول طلب وقراءة حقيقته من الخادم.</Text>
          {onBack ? <Button label="العودة" tone="secondary" onPress={onBack} style={{ marginTop: spacing[4] }} /> : null}
        </View>
      ) : (
        <MobileScrollView fill padding={4} gap={4} contentContainerStyle={styles.scrollContent}>
          {state.kind === "partial" ? (
            <Surface style={styles.partialBanner}>
              <Text role="bodySm" style={{ color: colorRoles.warning }}>{state.message}</Text>
              <Button label="تحديث" accessibilityLabel="تحديث حقيقة الطلبات" tone="ghost" size="sm" onPress={reload} />
            </Surface>
          ) : null}
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              {...(onOpenOrder ? { onOpenOrder } : {})}
            />
          ))}
        </MobileScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  scrollContent: {
    paddingBottom: spacing[12],
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
    gap: spacing[2],
  },
  partialBanner: {
    padding: spacing[3],
    gap: spacing[2],
    borderColor: colorRoles.warning,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  card: {
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    overflow: "hidden",
    marginBottom: spacing[3],
  },
  cardHeader: {
    padding: spacing[4],
  },
  cardHeaderMain: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[3],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: brandScale.action[50],
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  subtitleText: {
    textAlign: "right",
  },
  statusRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[3],
    gap: spacing[2],
  },
  dateText: {
    textAlign: "right",
    flexShrink: 1,
  },
  expandedContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  divider: {
    height: 1,
    backgroundColor: colorRoles.borderSubtle,
    marginBottom: spacing[3],
  },
  sectionTitle: {
    textAlign: "right",
    color: colorRoles.textPrimary,
    marginBottom: spacing[2],
  },
  itemRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[1],
    gap: spacing[2],
  },
  itemName: {
    textAlign: "right",
    flex: 1,
  },
  itemQtyPrice: {
    color: colorRoles.textSecondary,
  },
  truthMeta: {
    marginTop: spacing[3],
    gap: spacing[1],
  },
  actionRow: {
    flexDirection: "row-reverse",
    marginTop: spacing[4],
  },
  actionButton: {
    flex: 1,
  },
});
