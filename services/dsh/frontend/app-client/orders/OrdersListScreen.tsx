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
import { ORDER_STATUS_LABELS } from "../../shared/orders";
import { useClientOrdersController } from "../../shared/orders/use-orders-controller";
import type { DshOrder, DshOrderStatus } from "../../shared/orders";

const STATUS_TONE: Record<DshOrderStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  store_accepted: "info",
  preparing: "info",
  ready_for_pickup: "success",
  driver_assigned: "info",
  driver_arrived_store: "info",
  picked_up: "info",
  arrived_customer: "warning",
  delivered: "success",
  cancelled: "danger",
};

type Props = {
  readonly onOpenOrder?: (orderId: string) => void;
  readonly onBack?: () => void;
};

function OrderCard({ order, onOpenOrder }: { order: DshOrder; onOpenOrder?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const label = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const tone = STATUS_TONE[order.status] ?? "neutral";
  const items = order.items ?? [];
  
  // Calculate total price
  const totalPrice = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalPriceLabel = `${totalPrice.toLocaleString("ar-YE")} ر.ي`;
  
  // Summary text
  const mainItemName = items[0]?.productName ?? "طلب فارغ";
  const summaryText = items.length > 1 ? `${mainItemName} و ${items.length - 1} آخرين` : mainItemName;

  const orderDate = new Date(order.createdAt).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const isActive = order.status !== "delivered" && order.status !== "cancelled";

  return (
    <Surface style={styles.card}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.cardHeader} accessibilityLabel="توسيع تفاصيل الطلب وعرض المحتويات" accessibilityRole="button">
        <View style={styles.cardHeaderMain}>
          <View style={styles.iconContainer}>
            <Icon name={isActive ? "bicycle-outline" : "receipt-outline"} size={22} color={colorRoles.brandAction} />
          </View>
          <View style={styles.headerText}>
            <Text role="bodyStrong" style={styles.titleText}>{summaryText}</Text>
            <Text role="caption" tone="muted" style={styles.subtitleText}>
              {`${totalPriceLabel} • ${items.length} منتجات • المتجر: ${order.storeId}`}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Badge label={label} tone={tone} />
          <Text role="caption" tone="muted" style={styles.dateText}>
            {`#${order.id.slice(-6).toUpperCase()} • ${orderDate}`}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <Text role="bodyStrong" style={styles.sectionTitle}>محتويات الطلب:</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text role="body" style={styles.itemName}>{item.productName}</Text>
              <Text role="bodyStrong" style={styles.itemQtyPrice}>
                {`×${item.quantity} (${(item.unitPrice * item.quantity).toLocaleString("ar-YE")} ر.ي)`}
              </Text>
            </View>
          ))}
          
          <View style={styles.actionRow}>
            {onOpenOrder && (
              <Button
                style={styles.actionButton}
                label={isActive ? "تتبع الطلب" : "تفاصيل الطلب"}
                tone={isActive ? "primary" : "secondary"}
                size="sm"
                onPress={() => onOpenOrder(order.id)}
              />
            )}
          </View>
        </View>
      )}
    </Surface>
  );
}

export function OrdersListScreen({ onOpenOrder, onBack }: Props) {
  const { state, reload } = useClientOrdersController();

  return (
    <View style={styles.container}>
      <TopBar title="طلباتي" />
      
      {state.kind === "loading" ? (
        <View style={styles.center}>
          <Text role="body">جارٍ تحميل طلباتك...</Text>
        </View>
      ) : state.kind === "error" ? (
        <View style={styles.center}>
          <Text role="bodyStrong" style={{ color: colorRoles.danger }}>تعذر تحميل الطلبات</Text>
          <Text role="bodySm" tone="muted">{state.message}</Text>
          <Button label="إعادة المحاولة" tone="secondary" onPress={reload} style={{ marginTop: spacing[4] }} />
        </View>
      ) : state.kind === "empty" ? (
        <View style={styles.center}>
          <Text role="bodyStrong">لا توجد طلبات</Text>
          <Text role="bodySm" tone="muted">ستظهر طلباتك هنا بعد إنشاء أول طلب.</Text>
          {onBack && <Button label="العودة" tone="secondary" onPress={onBack} style={{ marginTop: spacing[4] }} />}
        </View>
      ) : state.kind === "success" ? (
        <MobileScrollView fill padding={4} gap={4} contentContainerStyle={styles.scrollContent}>
          {state.orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              {...(onOpenOrder ? { onOpenOrder } : {})}
            />
          ))}
        </MobileScrollView>
      ) : null}
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
  },
  dateText: {
    textAlign: "right",
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
  },
  itemName: {
    textAlign: "right",
    flex: 1,
  },
  itemQtyPrice: {
    color: colorRoles.textSecondary,
  },
  actionRow: {
    flexDirection: "row-reverse",
    marginTop: spacing[4],
  },
  actionButton: {
    flex: 1,
  },
});

