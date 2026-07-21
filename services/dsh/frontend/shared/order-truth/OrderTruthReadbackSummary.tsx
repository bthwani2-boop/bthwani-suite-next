import React from "react";
import { Box, Button, Text } from "@bthwani/ui-kit";
import { useOrderTruthCollectionController } from "./use-order-truth-controller";
import { toOrderTruthSummary } from "./order-truth.view-model";
import type { OrderTruthActor } from "./order-truth.types";

type Props = {
  readonly actor: OrderTruthActor;
  readonly title?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly token?: string;
  readonly onOpenOrder?: (orderId: string) => void;
};

export function OrderTruthReadbackSummary({
  actor,
  title = "حقيقة الطلب من DSH",
  status,
  limit = 5,
  token,
  onOpenOrder,
}: Props) {
  const controller = useOrderTruthCollectionController(actor, { status, limit, token });
  const { state } = controller;

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <Box padding={3} gap={1} background="surfaceInset">
        <Text role="bodyStrong">{title}</Text>
        <Text role="bodySm" tone="muted">جارٍ قراءة النسخة التشغيلية الموحّدة…</Text>
      </Box>
    );
  }

  if (state.kind === "empty") {
    return (
      <Box padding={3} gap={2} background="surfaceInset">
        <Text role="bodyStrong">{title}</Text>
        <Text role="bodySm" tone="muted">لا توجد طلبات في النطاق الحالي.</Text>
        <Button label="تحديث" tone="ghost" size="sm" fullWidth={false} onPress={controller.reload} />
      </Box>
    );
  }

  if (state.kind === "offline" || state.kind === "forbidden" || state.kind === "error") {
    return (
      <Box padding={3} gap={2} background={state.kind === "forbidden" ? "warningSurface" : "dangerSurface"}>
        <Text role="bodyStrong">{title}</Text>
        <Text role="bodySm" tone={state.kind === "forbidden" ? "warning" : "danger"}>{state.message}</Text>
        <Button label="إعادة المحاولة" tone="secondary" size="sm" fullWidth={false} onPress={controller.reload} />
      </Box>
    );
  }

  const orders = state.orders;
  return (
    <Box padding={3} gap={2} background={state.kind === "partial" ? "warningSurface" : "surfaceInset"}>
      <Box layoutDirection="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Box gap={1}>
          <Text role="bodyStrong">{title}</Text>
          <Text role="caption" tone="muted">{orders.length} طلب · قراءة فقط · الصلاحيات من الخادم</Text>
        </Box>
        <Button label="تحديث" tone="ghost" size="sm" fullWidth={false} onPress={controller.reload} />
      </Box>
      {state.kind === "partial" ? <Text role="bodySm" tone="warning">{state.message}</Text> : null}
      {orders.map((order) => {
        const view = toOrderTruthSummary(order);
        return (
          <Box key={order.id} padding={2} gap={1} background="surface">
            <Text role="bodyStrong">{view.orderNumber}</Text>
            <Text role="bodySm">{view.statusLabel} · المالك الحالي: {view.currentOwnerLabel}</Text>
            <Text role="caption" tone="muted">{view.totalLabel} · {view.createdAtLabel}</Text>
            <Text role="caption" tone={view.isPaymentProjectionPartial ? "warning" : "muted"}>
              الدفع: {order.paymentStatusProjection} · الإصدار: {order.version}
            </Text>
            {onOpenOrder ? (
              <Button label="فتح الحقيقة" tone="ghost" size="sm" fullWidth={false} onPress={() => onOpenOrder(order.id)} />
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
