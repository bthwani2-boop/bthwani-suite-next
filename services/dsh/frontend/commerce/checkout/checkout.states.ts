import type { DshCheckoutIntent, DshCheckoutState, DshCheckoutTerminalReason } from "./checkout.types";

export type DshCheckoutIntentListLoadState = "loading" | "success" | "empty" | "error";

export function checkoutConfirmingState(intent: DshCheckoutIntent): DshCheckoutState {
  return { kind: "confirming", intent };
}

export function checkoutSuccessState(intent: DshCheckoutIntent): DshCheckoutState {
  return { kind: "success", intent };
}

export function checkoutReconciliationPendingState(intent: DshCheckoutIntent): DshCheckoutState {
  return { kind: "reconciliation_pending", intent };
}

export function checkoutTerminalState(
  intent: DshCheckoutIntent,
  reason: DshCheckoutTerminalReason,
): DshCheckoutState {
  return { kind: "terminal", intent, reason };
}

export function checkoutErrorState(message: string): DshCheckoutState {
  return { kind: "error", message };
}

export function checkoutBlockedPaymentUnavailableState(): DshCheckoutState {
  return { kind: "blocked_payment_unavailable" };
}

export function checkoutIntentListLoadState(
  intents: readonly DshCheckoutIntent[],
): DshCheckoutIntentListLoadState {
  return intents.length === 0 ? "empty" : "success";
}
