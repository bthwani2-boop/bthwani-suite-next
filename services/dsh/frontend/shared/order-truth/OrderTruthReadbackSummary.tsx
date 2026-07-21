import React from "react";
import { Box, Button, Text } from "@bthwani/ui-kit";
import { useOrderTruthCollectionController } from "./use-order-truth-controller";
import { toOrderTruthSummary } from "./order-truth.view-model";
import { resolveOrderTruthVisibleState } from "./order-truth.visible-states";
import {
  bidiIsolate,
  buildOrderTruthAccessibilityLabel,
  ORDER_TRUTH_EXPERIENCE_POLICY,
} from "./order-truth.experience";
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
  const safeLimit = Math.min(
    ORDER_TRUTH_EXPERIENCE_POLICY.maximumSummaryRows,
    Math.max(1, Math.trunc(limit)),
  );
  const controller = useOrderTruthCollectionController(actor, { status, limit: safeLimit, token });
  const { state } = controller;

  if (state.kind === "idle" || state.kind === "loading") {
    const policy = resolveOrderTruthVisibleState(state.kind);
    return (
      <Box padding={3} gap={1} background="surfaceInset">
        <Text role="bodyStrong">{title}</Text>
        <Text role="bodySm" tone="muted">{policy.description}</Text>
      </Box>
    );
  }

  if (state.kind === "empty") {
    const policy = resolveOrderTruthVisibleState("empty");
    return (
      <Box padding={3} gap={2} background="surfaceInset">
        <Text role="bodyStrong">{title}</Text>
        <Text role="bodySm" tone="muted">{policy.description}</Text>
        <Button
          label="تحديث"
          accessibilityLabel={`تحديث ${title}`}
          tone="ghost"
          size="sm"
          fullWidth={false}
          onPress={controller.reload}
        />
      </Box>
    );
  }

  if (state.kind === "offline" || state.kind === "forbidden" || state.kind === "error") {
    const policy = resolveOrderTruthVisibleState(state.kind, state.message);
    return (
      <Box padding={3} gap={2} background={policy.tone === "warning" ? "warningSurface" : "dangerSurface"}>
        <Text role="bodyStrong">{policy.title}</Text>
        <Text role="bodySm" tone={policy.tone === "warning" ? "warning" : "danger"}>{policy.description}</Text>
        {policy.retryable ? (
          <Button
            label="إعادة المحاولة"
            accessibilityLabel={`إعادة محاولة تحميل ${title}`}
            tone="secondary"
            size="sm"
            fullWidth={false}
            onPress={controller.reload}
          />
        ) : null}
      </Box>
    );
  }

  const orders = state.orders;
  const policy = resolveOrderTruthVisibleState(
    state.kind === "partial" ? "partial" : "success",
    state.kind === "partial" ? state.message : undefined,
  );
  return (
    <Box padding={3} gap={2} background={state.kind === "partial" ? "warningSurface" : "surfaceInset"}>
      <Box layoutDirection="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Box gap={1}>
          <Text role="bodyStrong">{title}</Text>
          <Text role="caption" tone="muted">{orders.length} طلب · قراءة فقط · الصلاحيات من الخادم</Text>
        </Box>
        <Button
          label="تحديث"
          accessibilityLabel={`تحديث ${title}`}
          tone="ghost"
          size="sm"
          fullWidth={false}
          onPress={controller.reload}
        />
      </Box>
      {state.kind === "partial" ? <Text role="bodySm" tone="warning">{policy.description}</Text> : null}
      {orders.map((order) => {
        const view = toOrderTruthSummary(order);
        const accessibilityLabel = buildOrderTruthAccessibilityLabel(order);
        return (
          <Box key={order.id} padding={2} gap={1} background="surface">
            <Text role="bodyStrong">{bidiIsolate(view.orderNumber)}</Text>
            <Text role="bodySm">{view.statusLabel} · المالك الحالي: {view.currentOwnerLabel}</Text>
            <Text role="caption" tone="muted">{view.totalLabel} · {view.createdAtLabel}</Text>
            <Text role="caption" tone={view.isPaymentProjectionPartial ? "warning" : "muted"}>
              الدفع: {order.paymentStatusProjection} · الإصدار: {order.version}
            </Text>
            {onOpenOrder ? (
              <Button
                label="فتح الحقيقة"
                accessibilityLabel={`${accessibilityLabel}، فتح التفاصيل`}
                tone="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => onOpenOrder(order.id)}
              />
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
