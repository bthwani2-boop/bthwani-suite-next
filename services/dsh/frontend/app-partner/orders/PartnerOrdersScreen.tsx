import React, { useState } from "react";
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
  TextInput,
} from "@bthwani/ui-kit";
import {
  ORDER_STATUS_LABELS,
  usePartnerOrderActionController,
  usePartnerOrdersController,
} from "../../shared/orders";
import type { DshOrder, DshOrderStatus } from "../../shared/orders";

const STATUS_TONE: Record<DshOrderStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  store_accepted: "info",
  preparing: "info",
  ready_for_pickup: "success",
  cancelled: "danger",
};

type Props = {
  readonly storeId: string;
  readonly statusFilter?: DshOrderStatus;
  readonly onBack?: () => void;
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
            <TextInput
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
            <Button label="قبول الطلب" tone="brand" disabled={isSubmitting} onPress={handleAccept} />
            <Button label="رفض الطلب" tone="danger" variant="outline" disabled={isSubmitting} onPress={() => setShowRejectInput(true)} />
          </>
        )}
      </Card>
    );
  }

  if (order.status === "store_accepted") {
    return (
      <Card padding={3}>
        <Button label="بدء التجهيز" tone="brand" disabled={isSubmitting} onPress={handlePreparing} />
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
}: {
  order: DshOrder;
  onAction: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const tone = STATUS_TONE[order.status] ?? "default";

  return (
    <Card gap={0} margin={2}>
      <ListItem
        onPress={() => setExpanded((v) => !v)}
        leading={<Badge tone={tone} label={label} />}
        title={`طلب #${order.id.slice(-6).toUpperCase()}`}
        description={`${order.items.length} منتج — العميل: ${order.clientId.slice(-8)}`}
        trailing={<Text role="bodySm" tone="muted">{expanded ? "▲" : "▼"}</Text>}
      />
      {expanded && (
        <>
          {order.items.map((item) => (
            <ListItem
              key={item.id}
              title={item.productName}
              description={`الكمية: ${item.quantity} — السعر: ${item.unitPrice} ر.س`}
            />
          ))}
          <OrderActionPanel order={order} onAction={onAction} />
        </>
      )}
    </Card>
  );
}

export function PartnerOrdersScreen({ storeId, statusFilter, onBack }: Props) {
  const { state, reload } = usePartnerOrdersController(storeId, statusFilter);

  if (state.kind === "loading") {
    return <LoadingState label="جارٍ تحميل الطلبات..." />;
  }

  if (state.kind === "error") {
    return (
      <StateView
        kind="error"
        title="تعذر تحميل الطلبات"
        description={state.message}
        action={<Button label="إعادة المحاولة" tone="secondary" onPress={reload} />}
      />
    );
  }

  if (state.kind === "empty") {
    return (
      <StateView
        kind="empty"
        title="لا توجد طلبات"
        description={
          statusFilter === "pending"
            ? "لا توجد طلبات جديدة في انتظار قبولك."
            : "لا توجد طلبات تطابق الفلتر المحدد."
        }
        action={onBack ? <Button label="العودة" tone="ghost" onPress={onBack} /> : undefined}
      />
    );
  }

  if (state.kind !== "success") return null;

  return (
    <ScrollScreen>
      <Header title="طلبات المتجر" description={`${state.orders.length} طلب`} />
      {state.orders.map((order) => (
        <OrderRow key={order.id} order={order} onAction={reload} />
      ))}
    </ScrollScreen>
  );
}

export default PartnerOrdersScreen;
