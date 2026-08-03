import type { paths } from "../../../clients/generated/dsh-api";

type CreateCheckoutIntentOperation = paths["/dsh/client/checkout-intents"]["post"];
type CreateCheckoutIntentResponse = CreateCheckoutIntentOperation["responses"][201]["content"]["application/json"];

/** Canonical aliases derived from the published checkout operation. */
export type DshCheckoutIntent = CreateCheckoutIntentResponse["intent"];
export type DshCreateIntentInput = CreateCheckoutIntentOperation["requestBody"]["content"]["application/json"];
export type DshPaymentMethod = DshCheckoutIntent["paymentMethod"];
export type DshIntentState = DshCheckoutIntent["state"];
export type DshFulfillmentMode = DshCheckoutIntent["fulfillmentMode"];
export type DshCheckoutTerminalReason = Extract<DshIntentState, "cancelled" | "expired">;

/** Presentation-only controller state. */
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
