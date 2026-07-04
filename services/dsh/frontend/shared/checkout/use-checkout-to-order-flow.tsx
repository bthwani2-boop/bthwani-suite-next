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

/**
 * Owns the checkout -> order-creation lifecycle as a single composed flow, so
 * DSH UI-only surfaces (e.g. CheckoutScreen) never call
 * useCreateOrderController or decide when to create an order themselves.
 * They only render the state this hook returns.
 */
export function useCheckoutToOrderFlow(input: DshCreateIntentInput) {
  const checkout = useCheckoutController();
  const order = useCreateOrderController();

  useEffect(() => {
    void checkout.submit(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.cartId, input.storeId, input.fulfillmentMode, input.paymentMethod, input.deliveryAddress, input.note]);

  useEffect(() => {
    if (checkout.state.kind === "success" && order.state.kind === "idle") {
      void order.submit({ checkoutIntentId: checkout.state.intent.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout.state.kind, order.state.kind]);

  const cancel = (intentId: string) => void checkout.cancel(intentId);

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
    // checkout.state.kind === "success" from here on
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
