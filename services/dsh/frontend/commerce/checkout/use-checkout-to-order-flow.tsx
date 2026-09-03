import { useCallback, useRef, useState } from "react";
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
  | { readonly kind: "order_error"; readonly message: string; readonly intent?: DshCheckoutIntent }
  | { readonly kind: "checkout_action_error"; readonly intent: DshCheckoutIntent; readonly message: string }
  | {
      readonly kind: "order_ready";
      readonly intent: DshCheckoutIntent;
      readonly orderId: string;
      readonly orderNumber: string;
      readonly correlationId: string;
    };

function checkoutErrorMessage(error: unknown): string {
  const err = error as { message?: string; code?: string; body?: string };
  if (err.message) return err.message;
  if (err.code) return `خطأ: ${err.code}`;
  if (typeof err.body === "string" && err.body.length > 0) return err.body;
  return "تعذر إتمام الطلب، يرجى المحاولة مرة أخرى.";
}

function isOrderCreationEligible(intent: DshCheckoutIntent): boolean {
  return intent.state === "confirmed"
    || (intent.state === "confirming" && intent.paymentMethod === "cod");
}

function resolveUnresolvedIntentState(intent: DshCheckoutIntent): CheckoutToOrderFlowState {
  switch (intent.state) {
    case "confirming":
      return { kind: "confirming", intent };
    case "cancelled":
    case "expired":
      return { kind: "terminal", intent, reason: intent.state };
    case "blocked":
      return {
        kind: "error",
        message: intent.validationIssues?.[0]?.message ?? "تعذر اعتماد بيانات checkout الحالية.",
      };
    case "draft":
    case "validating":
    case "ready":
      return { kind: "reconciliation_pending", intent };
    case "confirmed":
      return { kind: "reconciliation_pending", intent };
  }
}

function activeIntent(state: CheckoutToOrderFlowState): DshCheckoutIntent | null {
  if (state.kind === "confirming" || state.kind === "reconciliation_pending" || state.kind === "checkout_action_error") {
    return state.intent;
  }
  return null;
}

export function useCheckoutToOrderFlow() {
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : "";
  const [state, setState] = useState<CheckoutToOrderFlowState>({ kind: "idle" });
  const operationLock = useRef(false);
  const checkoutInputRef = useRef<DshCreateIntentInput | null>(null);
  const { submit: submitOrder } = useCreateOrderTruthController();

  const clearCurrentCheckoutAttempt = useCallback(async () => {
    const input = checkoutInputRef.current;
    if (!input || !actorId) return;
    try {
      await clearCheckoutAttempt(actorId, fingerprintCheckoutInput(input));
      checkoutInputRef.current = null;
    } catch {
      // The canonical order exists; retaining the idempotency key is safe.
    }
  }, [actorId]);

  const createOrderFromIntent = useCallback(async (intent: DshCheckoutIntent): Promise<boolean> => {
    if (!isOrderCreationEligible(intent)) {
      setState(resolveUnresolvedIntentState(intent));
      return false;
    }
    setState({ kind: "creating_order", intent });
    try {
      const readback = await submitOrder({ checkoutIntentId: intent.id });
      if (!readback) {
        throw new Error("تعذر تثبيت الطلب وقراءة الحقيقة المعتمدة بعد الدفع.");
      }
      await clearCurrentCheckoutAttempt();
      setState({
        kind: "order_ready",
        intent,
        orderId: readback.id,
        orderNumber: readback.orderNumber,
        correlationId: readback.correlationId,
      });
      return true;
    } catch (error: unknown) {
      setState({ kind: "order_error", intent, message: checkoutErrorMessage(error) });
      return false;
    }
  }, [clearCurrentCheckoutAttempt, submitOrder]);

  const start = useCallback(async (input: DshCreateIntentInput) => {
    if (operationLock.current) return;
    if (!actorId) {
      setState({ kind: "order_error", message: "جلسة العميل غير جاهزة لتثبيت هوية الدفع." });
      return;
    }
    operationLock.current = true;
    checkoutInputRef.current = input;
    setState({ kind: "loading" });
    let intent: DshCheckoutIntent | null = null;
    try {
      const attempt = await getOrCreateCheckoutAttempt(actorId, input);
      intent = await createCheckoutIntent(input, attempt.context);
      if (!isOrderCreationEligible(intent)) {
        setState(resolveUnresolvedIntentState(intent));
        return;
      }
      await createOrderFromIntent(intent);
    } catch (error: unknown) {
      setState({
        kind: "order_error",
        message: checkoutErrorMessage(error),
        ...(intent ? { intent } : {}),
      });
    } finally {
      operationLock.current = false;
    }
  }, [actorId, createOrderFromIntent]);

  const reset = useCallback(() => {
    if (state.kind === "order_error" && state.intent) return;
    setState({ kind: "idle" });
  }, [state]);

  const cancel = useCallback(async (intentId: string) => {
    const current = state;
    const currentIntent = activeIntent(current);
    if (
      operationLock.current
      || !currentIntent
      || currentIntent.id !== intentId
    ) return;
    operationLock.current = true;
    try {
      await cancelCheckoutIntent(intentId);
      await clearCurrentCheckoutAttempt();
      setState({ kind: "idle" });
    } catch {
      setState({
        kind: "checkout_action_error",
        intent: currentIntent,
        message: "تعذر إلغاء جلسة الدفع. بقيت الجلسة محفوظة؛ حدّث حالتها أو أعد محاولة الإلغاء قبل بدء عملية جديدة.",
      });
    } finally {
      operationLock.current = false;
    }
  }, [clearCurrentCheckoutAttempt, state]);

  const refresh = useCallback(async (intentId: string) => {
    const current = state;
    const currentIntent = activeIntent(current);
    if (
      operationLock.current
      || !currentIntent
      || currentIntent.id !== intentId
    ) return;
    operationLock.current = true;
    try {
      const intent = await fetchCheckoutIntent(intentId);
      if (isOrderCreationEligible(intent)) {
        await createOrderFromIntent(intent);
      } else {
        setState(resolveUnresolvedIntentState(intent));
      }
    } catch {
      setState({
        kind: "checkout_action_error",
        intent: currentIntent,
        message: "تعذر تحديث حالة جلسة الدفع. بقيت الجلسة محفوظة؛ أعد المحاولة قبل بدء عملية جديدة.",
      });
    } finally {
      operationLock.current = false;
    }
  }, [createOrderFromIntent, state]);

  const retryOrder = useCallback(() => {
    const intent = state.kind === "order_error" ? state.intent : undefined;
    if (!intent) {
      setState({ kind: "idle" });
      return;
    }
    if (operationLock.current) return;
    operationLock.current = true;
    void createOrderFromIntent(intent).finally(() => {
      operationLock.current = false;
    });
  }, [createOrderFromIntent, state]);

  return { state, start, reset, cancel, refresh, retryOrder };
}
