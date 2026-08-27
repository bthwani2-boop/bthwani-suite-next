import { useCallback, useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  clearCheckoutAttempt,
  fingerprintCheckoutInput,
  getOrCreateCheckoutAttempt,
} from "./checkout-create-attempt";
import {
  cancelCheckoutIntent,
  createCheckoutIntent,
  fetchCheckoutIntent,
} from "./checkout.api";
import { useCreateOrderTruthController } from "../order-truth/use-order-truth-controller";
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
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : "";
  const [state, setState] = useState<CheckoutToOrderFlowState>({ kind: "idle" });
  const { submit: submitOrder } = useCreateOrderTruthController();

  const start = useCallback(async (input: DshCreateIntentInput) => {
    if (!actorId) {
      setState({ kind: "order_error", message: "جلسة العميل غير جاهزة لتثبيت هوية الدفع." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const attempt = await getOrCreateCheckoutAttempt(actorId, input);
      const intent = await createCheckoutIntent(input, attempt.context);
      try {
        await clearCheckoutAttempt(actorId, fingerprintCheckoutInput(input));
      } catch {
        // The canonical checkout mutation succeeded; stale local cleanup must
        // not rewrite the server result.
      }

      setState({ kind: "creating_order", intent });

      // Order creation is delegated to the canonical controller so mutation
      // locking, durable idempotency, actor-scoped readback validation, failure
      // classification, and attempt cleanup stay in one owner.
      const readback = await submitOrder({ checkoutIntentId: intent.id });
      if (!readback) {
        throw new Error("تعذر تثبيت الطلب وقراءة الحقيقة المعتمدة بعد الدفع.");
      }

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
  }, [actorId, submitOrder]);

  const reset = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  const cancel = useCallback(async (intentId: string) => {
    try {
      await cancelCheckoutIntent(intentId);
    } catch {
      // Best effort cancel; the next readback remains canonical.
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
    setState({ kind: "idle" });
  }, []);

  return { state, start, reset, cancel, refresh, retryOrder };
}
