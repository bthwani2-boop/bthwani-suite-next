import type { OrderTruth } from "./order-truth.types";
import { toOrderTruthSummary } from "./order-truth.view-model";

const BIDI_ISOLATE_START = "\u2068";
const BIDI_ISOLATE_END = "\u2069";

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
