import type { DshCheckoutIntent } from "./checkout.types";
import {
  checkoutIdleState,
  checkoutBlockedPaymentUnavailableState,
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
  if (intent.state === "wlt_handoff_failed" || intent.state === "wlt_outcome_unknown") {
    return checkoutPaymentPendingState(intent);
  }
  if (intent.state === "payment_failed") {
    return checkoutBlockedPaymentUnavailableState();
  }
  // payment_confirmed is reported by WLT (the sole owner of payment capture
  // truth) via the payment-session-event webhook once a non-COD payment is
  // captured, so any payment method is a success here.
  if (intent.state === "payment_confirmed") {
    return checkoutSuccessState(intent);
  }
  // COD never captures funds up front, so reaching payment_pending with an
  // attached WLT reference is already enough to proceed to order creation.
  return intent.state === "payment_pending" &&
    intent.paymentMethod === "cod" &&
    checkoutIntentHasWltSession(intent)
    ? checkoutSuccessState(intent)
    : checkoutPaymentPendingState(intent);
}
