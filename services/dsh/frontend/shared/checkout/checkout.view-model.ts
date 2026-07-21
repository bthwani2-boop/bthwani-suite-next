import type { DshCheckoutIntent } from "./checkout.types";
import {
  checkoutBlockedPaymentUnavailableState,
  checkoutPaymentPendingState,
  checkoutReconciliationPendingState,
  checkoutSuccessState,
  checkoutTerminalState,
} from "./checkout.states";

export function checkoutIntentHasWltSession(intent: DshCheckoutIntent): boolean {
  return intent.wltPaymentSessionId.trim() !== "";
}

export function resolveCheckoutIntentDisplayState(intent: DshCheckoutIntent) {
  switch (intent.state) {
    case "cancelled":
      return checkoutTerminalState(intent, "cancelled");
    case "expired":
      return checkoutTerminalState(intent, "expired");
    case "payment_failed":
      return checkoutTerminalState(intent, "payment_failed");
    case "wlt_handoff_failed":
      return checkoutBlockedPaymentUnavailableState();
    case "wlt_outcome_unknown":
      return checkoutReconciliationPendingState(intent);
    case "payment_confirmed":
    case "confirmed":
      return checkoutSuccessState(intent);
    case "payment_pending":
      // COD creates only a WLT reference at checkout. With that reference
      // attached, DSH may create the order without pretending cash was captured.
      return intent.paymentMethod === "cod" && checkoutIntentHasWltSession(intent)
        ? checkoutSuccessState(intent)
        : checkoutPaymentPendingState(intent);
    case "pending":
      return checkoutPaymentPendingState(intent);
    default: {
      const exhaustive: never = intent.state;
      return exhaustive;
    }
  }
}
