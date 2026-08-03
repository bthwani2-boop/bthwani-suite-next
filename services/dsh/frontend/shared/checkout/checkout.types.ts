import type { components } from "../../../clients/generated/dsh-checkout-api";

/** Canonical DSH checkout contract aliases generated directly from the governed checkout shard. */
export type DshPaymentMethod = components["schemas"]["PaymentMethod"];
export type DshIntentState = components["schemas"]["CheckoutIntentState"];
export type DshFulfillmentMode = components["schemas"]["FulfillmentMode"];
export type DshCheckoutIntent = components["schemas"]["CheckoutIntent"];
export type DshCreateIntentInput = components["schemas"]["CreateCheckoutIntentInput"];

/** Presentation-only terminal classification derived from the generated runtime state union. */
export type DshCheckoutTerminalReason = Extract<DshIntentState, "cancelled" | "expired">;

/** Presentation-only controller state. It does not redefine any runtime DTO or status union. */
export type DshCheckoutState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "confirming" }
  | { readonly kind: "success"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "payment_pending"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "reconciliation_pending"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "terminal"; readonly intent: DshCheckoutIntent; readonly reason: DshCheckoutTerminalReason }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "blocked_payment_unavailable" }
  | { readonly kind: "out_of_area" };
