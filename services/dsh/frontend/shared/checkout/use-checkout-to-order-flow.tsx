import { useEffect } from "react";
import { useCheckoutController } from "./use-checkout-controller";
import { useCreateOrderController } from "../orders";
import type { DshCheckoutIntent, DshCreateIntentInput } from "./checkout.types";

export type CheckoutToOrderFlowState =
  | { readonly kind: "loading" }
  | { readonly kind: "payment_pending"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "blocked_payment_unavailable" }
  | { readonly kind: "out_of_area" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "creating_order"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "order_error"; readonly message: string }
  | { readonly kind: "order_ready"; readonly intent: DshCheckoutIntent; readonly orderId: string };

export function useCheckoutToOrderFlow(input: DshCreateIntentInput) {
  const checkout = useCheckoutController();
  const order = useCreateOrderController();
  const submitCheckout = checkout.submit;
  const cancelCheckout = checkout.cancel;
  const submitOrder = order.submit;
  const resetOrder = order.reset;

  useEffect(() => {
    // A new checkout must never inherit the previous order mutation result.
    resetOrder();
    void submitCheckout(input);
  }, [
    input.cartId,
    input.storeId,
    input.fulfillmentMode,
    input.paymentMethod,
    input.deliveryAddressId,
    input.note,
    input.couponCode,
    resetOrder,
    submitCheckout,
  ]);

  const checkoutIntentId = checkout.state.kind === "success"
    ? checkout.state.intent.id
    : null;

  useEffect(() => {
    if (checkoutIntentId && order.state.kind === "idle") {
      void submitOrder({ checkoutIntentId });
    }
  }, [checkoutIntentId, order.state.kind, submitOrder]);

  const cancel = (intentId: string) => {
    resetOrder();
    void cancelCheckout(intentId);
  };

  const state: CheckoutToOrderFlowState = (() => {
    if (
      checkout.state.kind === "idle" ||
      checkout.state.kind === "confirming" ||
      checkout.state.kind === "loading"
    ) {
      return { kind: "loading" };
    }
    if (checkout.state.kind === "payment_pending") {
      return { kind: "payment_pending", intent: checkout.state.intent };
    }
    if (checkout.state.kind === "blocked_payment_unavailable") {
      return { kind: "blocked_payment_unavailable" };
    }
    if (checkout.state.kind === "out_of_area") {
      return { kind: "out_of_area" };
    }
    if (checkout.state.kind === "error") {
      return { kind: "error", message: checkout.state.message };
    }
    const intent = checkout.state.intent;
    if (order.state.kind === "success") {
      return { kind: "order_ready", intent, orderId: order.state.order.id };
    }
    if (order.state.kind === "error") {
      return { kind: "order_error", message: order.state.message };
    }
    return { kind: "creating_order", intent };
  })();

  return { state, cancel };
}
