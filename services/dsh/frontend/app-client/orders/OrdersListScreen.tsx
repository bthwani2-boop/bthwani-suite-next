import React from "react";
import {
  Badge,
  Button,
  Card,
  Header,
  ListItem,
  LoadingState,
  ScrollScreen,
  StateView,
  Text,
} from "@bthwani/ui-kit";
import {
  ORDER_STATUS_LABELS,
  useClientOrdersController,
} from "../../shared/orders";
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
  const label = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const tone = STATUS_TONE[order.status] ?? "neutral";
  const itemCountLabel = `${order.items.length} منتج${order.items.length !== 1 ? "ات" : ""}`;
  const openProps = onOpenOrder ? { onPress: () => onOpenOrder(order.id) } : {};
  return (
    <ListItem
      {...openProps}
      leading={<Badge tone={tone} label={label} />}
      title={`طلب #${order.id.slice(-6).toUpperCase()}`}
      subtitle={`${itemCountLabel} - المتجر: ${order.storeId}`}
      trailing={<Text role="bodySm" tone="muted">{new Date(order.createdAt).toLocaleDateString("ar-SA")}</Text>}
    />
  );
}

export function OrdersListScreen({ onOpenOrder, onBack }: Props) {
  const { state, reload } = useClientOrdersController();

  if (state.kind === "loading") {
    return <LoadingState title="جارٍ تحميل طلباتك..." />;
  }

  if (state.kind === "error") {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل الطلبات"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={reload}
      />
    );
  }

  if (state.kind === "empty") {
    return (
      <StateView
        tone="neutral"
        title="لا توجد طلبات"
        description="ستظهر طلباتك هنا بعد إنشاء أول طلب."
        {...(onBack ? { actionLabel: "العودة", onActionPress: onBack } : {})}
      />
    );
  }

  if (state.kind !== "success") return null;

  return (
    <ScrollScreen>
      <Header title="طلباتي" />
      <Card>
        {state.orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            {...(onOpenOrder ? { onOpenOrder } : {})}
          />
        ))}
      </Card>
    </ScrollScreen>
  );
}

export default OrdersListScreen;
