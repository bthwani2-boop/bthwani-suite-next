import type { components } from "../../../clients/generated/dsh-api";

/** Canonical DSH contract aliases. Runtime request/response/status authority is OpenAPI-only. */
export type DshCheckoutIntent = components["schemas"]["DshCheckoutIntent"];
export type DshCreateIntentInput = components["schemas"]["DshCreateCheckoutIntentRequest"];
export type DshIntentState = DshCheckoutIntent["state"];
export type DshPaymentMethod = DshCheckoutIntent["paymentMethod"];
export type DshFulfillmentMode = DshCheckoutIntent["fulfillmentMode"];

/** Presentation-only explanation for terminal runtime states. */
export type DshCheckoutTerminalReason = Extract<DshIntentState, "cancelled" | "expired">;

/** Presentation-only controller state. It does not redefine any runtime DTO or status union. */
export type DshCheckoutState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "confirming" }
  | { readonly kind: "success"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "payment_pending"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "reconciliation_pending"; readonly intent: DshCheckoutIntent }
  | {
      readonly kind: "terminal";
      readonly intent: DshCheckoutIntent;
      readonly reason: DshCheckoutTerminalReason;
    }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "blocked_payment_unavailable" }
  | { readonly kind: "out_of_area" };
