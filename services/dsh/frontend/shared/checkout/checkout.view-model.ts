import type { DshCheckoutIntent } from "./checkout.types";
import {
  checkoutIdleState,
  checkoutPaymentPendingState,
  checkoutSuccessState,
} from "./checkout.states";

export function checkoutIntentHasWltSession(intent: DshCheckoutIntent): boolean {
  return intent.wltPaymentSessionId.trim() !== "";
}

export function resolveCheckoutIntentDisplayState(intent: DshCheckoutIntent) {
  if (intent.state === "cancelled" || intent.state === "expired") {
    return checkoutIdleState();
  }
  if (intent.state === "wlt_handoff_failed") {
    return checkoutPaymentPendingState(intent);
  }
  return intent.state === "payment_pending" &&
    intent.paymentMethod === "cod" &&
    checkoutIntentHasWltSession(intent)
    ? checkoutSuccessState(intent)
    : checkoutPaymentPendingState(intent);
}
