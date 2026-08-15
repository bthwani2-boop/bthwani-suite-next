import { useCallback, useState } from "react";
import {
  clearCheckoutAttempt,
  getOrCreateCheckoutAttempt,
} from "./checkout-create-attempt";
import {
  cancelCheckoutIntent,
  createCheckoutIntent,
  fetchCheckoutIntent,
} from "./checkout.api";
import {
  clearOrderTruthAttempt,
  getOrCreateOrderTruthAttempt,
} from "../order-truth/order-truth-create-attempt";
import {
  createOrderTruth,
  fetchClientOrderTruthDetail,
} from "../order-truth/order-truth.api";
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
  const [state, setState] = useState<CheckoutToOrderFlowState>({ kind: "idle" });

  const start = useCallback(async (input: DshCreateIntentInput) => {
    setState({ kind: "loading" });
    try {
      // 1. Submit checkout intent to DSH backend
      const attempt = await getOrCreateCheckoutAttempt(input);
      const intent = await createCheckoutIntent(input, attempt.context);
      try {
        await clearCheckoutAttempt(attempt.fingerprint);
      } catch {
        // Safe to ignore cleanup error
      }

      setState({ kind: "creating_order", intent });

      // 2. Submit order truth to convert intent to canonical order
      const orderAttempt = await getOrCreateOrderTruthAttempt({ checkoutIntentId: intent.id });
      const created = await createOrderTruth({ checkoutIntentId: intent.id }, orderAttempt.context);
      const readback = await fetchClientOrderTruthDetail(created.id);
      try {
        await clearOrderTruthAttempt(orderAttempt.fingerprint);
      } catch {
        // Safe to ignore cleanup error
      }

      // 3. Mark flow ready with canonical order
      setState({
        kind: "order_ready",
        intent,
        orderId: readback.id,
        orderNumber: readback.orderNumber,
        correlationId: readback.correlationId,
      });
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; body?: string };
      let message = "تعذر إتمام الطلب، يرجى المحاولة مرة أخرى.";
      if (err.message) {
        message = err.message;
      } else if (err.code) {
        message = `خطأ: ${err.code}`;
      } else if (typeof err.body === "string" && err.body.length > 0) {
        message = err.body;
      }
      setState({ kind: "order_error", message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  const cancel = useCallback(async (intentId: string) => {
    try {
      await cancelCheckoutIntent(intentId);
    } catch {
      // Best effort cancel
    }
    setState({ kind: "idle" });
  }, []);

  const refresh = useCallback(async (intentId: string) => {
    try {
      const intent = await fetchCheckoutIntent(intentId);
      setState({ kind: "confirming", intent });
    } catch {
      setState({ kind: "error", message: "تعذر تحديث حالة الطلب." });
    }
  }, []);

  const retryOrder = useCallback(() => {
    // If needed, reset state to idle to allow re-submission
    setState({ kind: "idle" });
  }, []);

  return { state, start, reset, cancel, refresh, retryOrder };
}
