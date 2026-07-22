import type { OrderTruth, OrderTruthActor } from "./order-truth.types";
import { toOrderTruthSummary } from "./order-truth.view-model";

const BIDI_ISOLATE_START = "\u2068";
const BIDI_ISOLATE_END = "\u2069";

export type OrderTruthNetworkClass = "offline" | "constrained" | "normal";

export function bidiIsolate(value: string): string {
  return `${BIDI_ISOLATE_START}${value}${BIDI_ISOLATE_END}`;
}

export function buildOrderTruthAccessibilityLabel(order: OrderTruth): string {
  const view = toOrderTruthSummary(order);
  return [
    `الطلب ${bidiIsolate(view.orderNumber)}`,
    `الحالة ${view.statusLabel}`,
    `المالك الحالي ${view.currentOwnerLabel}`,
    `الإجمالي ${view.totalLabel}`,
    `حالة الدفع ${order.paymentStatusProjection}`,
    `الإصدار ${order.version}`,
  ].join("، ");
}

export function resolveOrderTruthPollingMs(input: {
  readonly actor: OrderTruthActor;
  readonly requestedMs?: number;
  readonly networkClass?: OrderTruthNetworkClass;
  readonly foreground?: boolean;
  readonly terminal?: boolean;
}): number {
  if (input.networkClass === "offline" || input.foreground === false || input.terminal) return 0;
  const actorFloor = input.actor === "operator" ? 8000 : input.actor === "partner" ? 5000 : 5000;
  const constrainedFloor = input.networkClass === "constrained" ? 15000 : actorFloor;
  const requested = Number.isFinite(input.requestedMs) ? Math.trunc(input.requestedMs ?? actorFloor) : actorFloor;
  return Math.min(60000, Math.max(constrainedFloor, requested));
}

export function isTerminalOrderTruth(order: Pick<OrderTruth, "status">): boolean {
  return order.status === "delivered" ||
    order.status === "returned_to_store" ||
    order.status.startsWith("cancelled_") ||
    order.status.startsWith("failed_");
}

export const ORDER_TRUTH_EXPERIENCE_POLICY = Object.freeze({
  locale: "ar-YE",
  layoutDirection: "rtl",
  minimumTouchTargetPx: 44,
  maximumSummaryRows: 20,
  maximumTimelineRows: 100,
  constrainedNetworkPollingMs: 15000,
  staleProjectionWarningMs: 120000,
  supportsReducedMotion: true,
  supportsDynamicText: true,
  requiresBidiIsolationForIdentifiers: true,
});
