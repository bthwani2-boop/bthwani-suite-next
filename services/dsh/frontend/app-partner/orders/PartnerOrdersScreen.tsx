import React, { useState } from "react";
import { View } from "react-native";
import {
  Badge,
  Button,
  Card,
  ListItem,
  ScrollScreen,
  StateView,
  TextField,
  Text,
  Tabs,
  spacing,
} from "@bthwani/ui-kit";
import {
  ORDER_STATUS_LABELS,
  usePartnerOrderActionController,
  usePartnerOrdersController,
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
  arrived_customer: "success",
  delivered: "success",
  cancelled: "danger",
};

  readonly storeId: string;
  readonly statusFilter?: DshOrderStatus;
  readonly onBack?: () => void;
  readonly onOpenSettlement?: (orderId: string) => void;
};

function OrderActionPanel({
  order,
  onAction,
}: {
  order: DshOrder;
  onAction: () => void;
}) {
  const { state, accept, reject, markPreparing, markReady, reset } = usePartnerOrderActionController();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const isSubmitting = state.kind === "submitting";

  const handleAccept = async () => {
    await accept(order.id);
    onAction();
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    await reject(order.id, rejectionReason);
    setShowRejectInput(false);
    setRejectionReason("");
    onAction();
  };

  const handlePreparing = async () => {
    await markPreparing(order.id);
    onAction();
  };

  const handleReady = async () => {
    await markReady(order.id);
    onAction();
  };

  if (state.kind === "success") {
    const label = ORDER_STATUS_LABELS[state.order.status] ?? state.order.status;
    return (
      <Card gap={2} padding={3}>
        <Text role="bodySm" tone="success">تم التحديث: {label}</Text>
        <Button label="إغلاق" tone="ghost" size="sm" onPress={reset} />
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card gap={2} padding={3}>
        <Text role="bodySm" tone="danger">{state.message}</Text>
        <Button label="إعادة المحاولة" tone="ghost" size="sm" onPress={reset} />
      </Card>
    );
  }

  if (order.status === "pending") {
    return (
      <Card gap={2} padding={3}>
        {showRejectInput ? (
          <>
            <TextField
              label="سبب الرفض"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="أدخل سبب رفض الطلب..."
              multiline
            />
            <Button
              label="تأكيد الرفض"
              tone="danger"
              disabled={isSubmitting || !rejectionReason.trim()}
              onPress={handleReject}
            />
            <Button label="إلغاء" tone="ghost" size="sm" onPress={() => setShowRejectInput(false)} />
          </>
        ) : (
          <>
            <Button label="قبول الطلب" tone="primary" disabled={isSubmitting} onPress={handleAccept} />
            <Button label="رفض الطلب" tone="secondary" disabled={isSubmitting} onPress={() => setShowRejectInput(true)} />
          </>
        )}
      </Card>
    );
  }

  if (order.status === "store_accepted") {
    return (
      <Card padding={3}>
        <Button label="بدء التجهيز" tone="primary" disabled={isSubmitting} onPress={handlePreparing} />
      </Card>
    );
  }

  if (order.status === "preparing") {
    return (
      <Card padding={3}>
        <Button label="الطلب جاهز للاستلام" tone="success" disabled={isSubmitting} onPress={handleReady} />
      </Card>
    );
  }

  return null;
}

function OrderRow({
  order,
  onAction,
  onOpenSettlement,
}: {
  order: DshOrder;
  onAction: () => void;
  onOpenSettlement?: (orderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const tone = STATUS_TONE[order.status] ?? "neutral";

  return (
    <Card gap={0} style={{ marginBottom: spacing[2] }}>
      <ListItem
        onPress={() => setExpanded((v) => !v)}
        leading={<Badge tone={tone} label={label} />}
        title={`طلب #${order.id.slice(-6).toUpperCase()}`}
        subtitle={`${order.items.length} منتج — العميل: ${order.clientId.slice(-8)}`}
        trailing={<Text role="bodySm" tone="muted">{expanded ? "▲" : "▼"}</Text>}
      />
      {expanded && (
        <>
          {order.items.map((item) => (
            <ListItem
              key={item.id}
              title={item.productName}
              subtitle={`الكمية: ${item.quantity} — السعر: ${item.unitPrice} ر.س`}
            />
          ))}
          <OrderActionPanel order={order} onAction={onAction} />
          {onOpenSettlement && (
            <View style={{ padding: spacing[3], paddingTop: 0 }}>
              <Button
                label="تفاصيل التسوية المالية (WLT)"
                tone="ghost"
                size="sm"
                onPress={() => onOpenSettlement(order.id)}
              />
            </View>
          )}
        </>
      )}
    </Card>
  );
}

export function PartnerOrdersScreen({ storeId, statusFilter: propStatusFilter, onBack, onOpenSettlement }: Props) {
  const [activeTab, setActiveTab] = useState<string>(propStatusFilter ?? "all");
  const controllerStatusFilter = activeTab === "all" ? undefined : (activeTab as DshOrderStatus);
  const { state, reload } = usePartnerOrdersController(storeId, controllerStatusFilter);

  const tabItems = [
    { id: "all", label: "الكل" },
    { id: "pending", label: "جديدة" },
    { id: "preparing", label: "تجهيز" },
    { id: "ready_for_pickup", label: "جاهزة" },
  ] as const;

  const renderContent = () => {
    if (state.kind === "loading") {
      return <StateView title="جارٍ تحميل الطلبات..." loading />;
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
          title="لا توجد طلبات"
          description={
            activeTab === "pending"
              ? "لا توجد طلبات جديدة في انتظار قبولك."
              : "لا توجد طلبات تطابق الفلتر المحدد."
          }
          {...(onBack ? { actionLabel: "العودة", onActionPress: onBack } : {})}
        />
      );
    }

    if (state.kind !== "success") return null;

    return (
      <View style={{ gap: spacing[2] }}>
        {state.orders.map((order) => (
          <OrderRow key={order.id} order={order} onAction={reload} onOpenSettlement={onOpenSettlement} />
        ))}
      </View>
    );
  };

  return (
    <ScrollScreen>
      <View style={{ marginVertical: spacing[3] }}>
        <Tabs
          items={tabItems}
          value={activeTab}
          onValueChange={setActiveTab}
        />
      </View>
      {renderContent()}
    </ScrollScreen>
  );
}

export default PartnerOrdersScreen;
