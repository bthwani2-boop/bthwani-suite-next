import type { DshCheckoutIntent } from "./checkout.types";
import {
  checkoutBlockedPaymentUnavailableState,
  checkoutConfirmingState,
  checkoutReconciliationPendingState,
  checkoutSuccessState,
  checkoutTerminalState,
} from "./checkout.states";

export function checkoutIntentHasWltSession(intent: DshCheckoutIntent): boolean {
  return intent.wltPaymentSessionId.trim() !== "";
}

export function resolveCheckoutIntentDisplayState(intent: DshCheckoutIntent) {
  switch (intent.state) {
    case "draft":
      return { kind: "draft", intent } as const;
    case "validating":
      return { kind: "validating", intent } as const;
    case "ready":
      return { kind: "ready", intent } as const;
    case "blocked":
      return { kind: "blocked", intent, issues: intent.validationIssues ?? [] } as const;
    case "confirming":
      return checkoutConfirmingState(intent);
    case "confirmed":
      return checkoutSuccessState(intent);
    case "cancelled":
    case "expired":
      return checkoutTerminalState(intent, intent.state);
    default: {
      const exhaustive: never = intent.state;
      return exhaustive;
    }
  }
}
