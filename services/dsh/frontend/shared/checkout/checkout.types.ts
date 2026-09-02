import type { paths } from "@bthwani/dsh/openapi";

type CreateCheckoutIntentOperation = paths["/dsh/client/checkout-intents"]["post"];
type CreateCheckoutIntentEnvelope =
  CreateCheckoutIntentOperation["responses"][201]["content"]["application/json"];

/** Canonical DSH aliases extracted from the public OpenAPI operations. */
export type DshCreateIntentInput = NonNullable<
  CreateCheckoutIntentOperation["requestBody"]
>["content"]["application/json"];
export type DshCheckoutIntent = CreateCheckoutIntentEnvelope["intent"];
export type DshPaymentMethod = NonNullable<DshCreateIntentInput["paymentMethod"]>;
export type DshFulfillmentMode = NonNullable<DshCreateIntentInput["fulfillmentMode"]>;
export type DshIntentState = DshCheckoutIntent["state"];

/** J050: terminal states — no further mutation possible from client. */
export type DshCheckoutTerminalReason = Extract<DshIntentState, "cancelled" | "expired">;

/** J050 validation issue descriptor — mirrors DshCheckoutValidationIssue. */
export type DshValidationIssue = {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
};

/**
 * Presentation-only controller state.
 * Runtime DTO and status authority remains OpenAPI-only.
 * J050: 'confirming' replaces old 'payment_pending' (WLT handoff active).
 */
export type DshCheckoutState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "draft"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "validating"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "ready"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "blocked"; readonly intent: DshCheckoutIntent; readonly issues: DshValidationIssue[] }
  | { readonly kind: "confirming"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "reconciliation_pending"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "success"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "terminal"; readonly intent: DshCheckoutIntent; readonly reason: DshCheckoutTerminalReason }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "blocked_payment_unavailable" }
  | { readonly kind: "out_of_area" };
