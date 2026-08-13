import { useCallback, useEffect, useState } from "react";
import { useCheckoutController } from "./use-checkout-controller";
import { useCreateOrderTruthController } from "../order-truth";
import type {
  DshCheckoutIntent,
  DshCheckoutTerminalReason,
  DshCreateIntentInput,
} from "./checkout.types";

export type CheckoutToOrderFlowState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "confirming"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "reconciliation_pending"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "terminal"; readonly intent: DshCheckoutIntent; readonly reason: DshCheckoutTerminalReason }
  | { readonly kind: "blocked_payment_unavailable" }
  | { readonly kind: "out_of_area" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "creating_order"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "order_error"; readonly message: string }
  | {
      readonly kind: "order_ready";
      readonly intent: DshCheckoutIntent;
      readonly orderId: string;
      readonly orderNumber: string;
      readonly correlationId: string;
    };

export function useCheckoutToOrderFlow() {
  const checkout = useCheckoutController();
  const order = useCreateOrderTruthController();
  const submitCheckout = checkout.submit;
  const cancelCheckout = checkout.cancel;
  const reloadCheckout = checkout.reload;
  const submitOrder = order.submit;
  const resetOrder = order.reset;
  const resetCheckout = checkout.reset;
  const [activeInput, setActiveInput] = useState<DshCreateIntentInput | null>(null);

  useEffect(() => {
    if (!activeInput) return undefined;
    // A new checkout must never inherit a previous order mutation result. The
    // durable order attempt remains in AsyncStorage until canonical readback.
    void submitCheckout(activeInput);
  }, [
    activeInput,
    submitCheckout,
  ]);

  const start = useCallback((input: DshCreateIntentInput) => {
    resetCheckout();
    resetOrder();
    setActiveInput(input);
  }, [resetCheckout, resetOrder]);

  const reset = useCallback(() => {
    resetCheckout();
    resetOrder();
    setActiveInput(null);
  }, [resetCheckout, resetOrder]);

  const checkoutIntentId = checkout.state.kind === "success"
    ? checkout.state.intent.id
    : null;

  const pendingIntentId = checkout.state.kind === "confirming" ||
    checkout.state.kind === "reconciliation_pending"
    ? checkout.state.intent.id
    : null;
  const reconciliationPending = checkout.state.kind === "reconciliation_pending";

  useEffect(() => {
    if (!pendingIntentId) return undefined;
    const timer = setTimeout(
      () => void reloadCheckout(pendingIntentId),
      reconciliationPending ? 3_000 : 5_000,
    );
    return () => clearTimeout(timer);
  }, [pendingIntentId, reconciliationPending, reloadCheckout]);

  useEffect(() => {
    if (activeInput && checkoutIntentId && order.state.kind === "idle") {
      void submitOrder({ checkoutIntentId });
    }
  }, [activeInput, checkoutIntentId, order.state.kind, submitOrder]);

  const retryOrder = useCallback(() => {
    if (!checkoutIntentId) return;
    resetOrder();
    void submitOrder({ checkoutIntentId });
  }, [checkoutIntentId, resetOrder, submitOrder]);

  const cancel = useCallback((intentId: string) => {
    resetOrder();
    void cancelCheckout(intentId);
    setActiveInput(null);
  }, [cancelCheckout, resetOrder]);

  const refresh = useCallback((intentId: string) => {
    void reloadCheckout(intentId);
  }, [reloadCheckout]);

  const state: CheckoutToOrderFlowState = (() => {
    if (!activeInput) return { kind: "idle" };
    if (
      checkout.state.kind === "idle" ||
      checkout.state.kind === "loading"
    ) {
      return { kind: "loading" };
    }
    if (checkout.state.kind === "confirming") {
      return { kind: "confirming", intent: checkout.state.intent };
    }
    if (checkout.state.kind === "reconciliation_pending") {
      return { kind: "reconciliation_pending", intent: checkout.state.intent };
    }
    if (checkout.state.kind === "terminal") {
      return { kind: "terminal", intent: checkout.state.intent, reason: checkout.state.reason };
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
      return {
        kind: "order_ready",
        intent,
        orderId: order.state.order.id,
        orderNumber: order.state.order.orderNumber,
        correlationId: order.state.order.correlationId,
      };
    }
    if (
      order.state.kind === "offline" ||
      order.state.kind === "forbidden" ||
      order.state.kind === "conflict" ||
      order.state.kind === "error"
    ) {
      return { kind: "order_error", message: order.state.message };
    }
    return { kind: "creating_order", intent };
  })();

  return { state, start, reset, cancel, refresh, retryOrder };
}
