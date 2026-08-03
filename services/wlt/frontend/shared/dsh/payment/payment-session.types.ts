import type { components, paths } from "@bthwani/wlt-openapi";

/** Canonical WLT contract aliases. No status, DTO, envelope, or behavior is owned here. */
export type WltPaymentSessionStatus = components["schemas"]["PaymentStatus"];
export type WltPaymentSessionCapabilities = components["schemas"]["PaymentSessionCapabilities"];
export type WltPaymentSession = components["schemas"]["PaymentSession"];
export type WltPaymentOperationReceipt = components["schemas"]["PaymentOperationReceipt"];
export type WltPaymentProviderEvent = components["schemas"]["PaymentProviderEvent"];
export type WltPaymentReconciliationCase = components["schemas"]["PaymentReconciliationCase"];
export type WltPaymentSessionTimeline = components["schemas"]["PaymentTimeline"];
export type WltPaymentOperationEnvelope = components["schemas"]["PaymentOperationResponse"];
export type WltPaymentTimelineEnvelope =
  paths["/wlt/payment-sessions/{paymentSessionId}/timeline"]["get"]["responses"][200]["content"]["application/json"];

/** Presentation-only view model. Behavioral decisions remain in session.capabilities. */
export type WltPaymentSessionPresentation = {
  readonly label: string;
  readonly description: string;
  readonly tone: "success" | "action" | "info" | "warning" | "danger";
};
