import type { DshCheckoutIntent, DshCheckoutState } from "./checkout.types";
import {
  checkoutConfirmingState,
  checkoutBlockedPaymentUnavailableState,
  checkoutErrorState,
  checkoutIntentListLoadState,
  checkoutLoadingState,
} from "./checkout.states";
import { resolveCheckoutIntentDisplayState } from "./checkout.view-model";

export type CheckoutErrorKind = "permission_denied" | "conflict" | "offline" | "payment_unavailable" | "error";

export function beginCheckoutSubmit(): DshCheckoutState {
  return checkoutConfirmingState();
}

export function beginCheckoutReload(): DshCheckoutState {
  return checkoutLoadingState();
}

export function resolveCheckoutSubmitSuccess(intent: DshCheckoutIntent): DshCheckoutState {
  return resolveCheckoutIntentDisplayState(intent);
}

export function resolveCheckoutReloadSuccess(intent: DshCheckoutIntent): DshCheckoutState {
  return resolveCheckoutIntentDisplayState(intent);
}

export function resolveCheckoutSubmitError(classified: { readonly kind: CheckoutErrorKind }): DshCheckoutState {
  if (classified.kind === "permission_denied") {
    return checkoutErrorState("يلزم تسجيل الدخول لإتمام الطلب.");
  }
  if (classified.kind === "offline") {
    return checkoutErrorState("لا يوجد اتصال بالإنترنت.");
  }
  if (classified.kind === "payment_unavailable") {
    return checkoutBlockedPaymentUnavailableState();
  }
  return checkoutErrorState("تعذر إنشاء طلب الدفع.");
}

export function resolveCheckoutReloadError(): DshCheckoutState {
  return checkoutErrorState("تعذر تحديث حالة الطلب.");
}

export function resolveOperatorCheckoutLoadState(
  intents: readonly DshCheckoutIntent[],
) {
  return checkoutIntentListLoadState(intents);
}
