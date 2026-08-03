import type { components } from "../../../clients/generated/dsh-api";

/** Canonical DSH contract aliases. Runtime request/response/status authority is OpenAPI-only. */
export type DshPaymentMethod = components["schemas"]["PaymentMethod"];
export type DshIntentState = components["schemas"]["CheckoutIntentState"];
export type DshFulfillmentMode = components["schemas"]["FulfillmentMode"];
export type DshCheckoutIntent = components["schemas"]["CheckoutIntent"];
export type DshCreateIntentInput = components["schemas"]["CreateCheckoutIntentInput"];

/** Presentation-only controller state. It does not redefine any runtime DTO or status union. */
export type DshCheckoutState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "confirming" }
  | { readonly kind: "success"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "payment_pending"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "reconciliation_pending"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "blocked_payment_unavailable" }
  | { readonly kind: "out_of_area" };
