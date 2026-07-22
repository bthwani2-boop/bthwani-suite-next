"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchClientBenefits } from "./marketing.api";
import {
  activateDshSubscriptionPurchase,
  cancelDshSubscription,
  createDshSubscriptionPurchase,
  getDshSubscriptionPurchase,
  renewDshSubscription,
} from "./subscription-lifecycle.api";
import type { ClientBenefitsPayload } from "./loyalty-subscriptions.types";
import type {
  SubscriptionPaymentSession,
  SubscriptionPurchaseRecord,
} from "./subscription-lifecycle.types";

export type SubscriptionLifecycleViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly benefits: ClientBenefitsPayload }
  | { readonly kind: "empty"; readonly benefits: ClientBenefitsPayload }
  | { readonly kind: "offline"; readonly message: string }
  | { readonly kind: "forbidden"; readonly message: string }
  | { readonly kind: "conflict"; readonly message: string }
  | { readonly kind: "partial"; readonly benefits: ClientBenefitsPayload; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

export type SubscriptionLifecycleAction =
  | "purchase"
  | "refresh_payment"
  | "activate"
  | "renew"
  | "cancel"
  | null;

type HttpLikeError = {
  readonly kind?: string;
  readonly status?: number;
  readonly code?: string;
  readonly message?: string;
};

function messageFor(error: unknown): string {
  const item = (typeof error === "object" && error !== null ? error : {}) as HttpLikeError;
  if (item.code === "PAYMENT_NOT_CAPTURED") return "لم يكتمل تحصيل الدفع بعد. حدّث الحالة بعد إتمام الدفع.";
  if (item.code === "ACTIVE_SUBSCRIPTION_EXISTS") return "يوجد اشتراك نشط بالفعل لهذا الحساب.";
  if (item.code === "PLAN_TERMS_MISMATCH") return "الخطة غير متطابقة ماليًا مع WLT ولا يمكن شراؤها حاليًا.";
  if (item.code === "COMPENSATION_PENDING") return "الإلغاء مسجل والتعويض المالي ما يزال قيد المعالجة في WLT.";
  if (item.message) return item.message;
  return "تعذر إكمال عملية الاشتراك.";
}

function classify(error: unknown): Exclude<SubscriptionLifecycleViewState, { kind: "loading" | "success" | "empty" | "partial" }> {
  const item = (typeof error === "object" && error !== null ? error : {}) as HttpLikeError;
  const message = messageFor(error);
  if (item.kind === "network") return { kind: "offline", message };
  if (item.status === 401 || item.status === 403) return { kind: "forbidden", message };
  if (item.status === 409) return { kind: "conflict", message };
  return { kind: "error", message };
}

function hasAnyBenefits(benefits: ClientBenefitsPayload): boolean {
  return Boolean(
    benefits.loyaltyAccount ||
      benefits.activeSubscription ||
      benefits.availableTiers.length ||
      benefits.availablePlans.length ||
      benefits.offers.length,
  );
}

export function useSubscriptionLifecycleController() {
  const [state, setState] = useState<SubscriptionLifecycleViewState>({ kind: "loading" });
  const [busyAction, setBusyAction] = useState<SubscriptionLifecycleAction>(null);
  const [pendingPurchase, setPendingPurchase] = useState<SubscriptionPurchaseRecord>();
  const [paymentSession, setPaymentSession] = useState<SubscriptionPaymentSession>();
  const [actionError, setActionError] = useState<string>();

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetchClientBenefits();
      setState(
        hasAnyBenefits(response.benefits)
          ? { kind: "success", benefits: response.benefits }
          : { kind: "empty", benefits: response.benefits },
      );
    } catch (error) {
      setState(classify(error));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(async <T,>(action: Exclude<SubscriptionLifecycleAction, null>, operation: () => Promise<T>) => {
    if (busyAction) throw new Error("SUBSCRIPTION_ACTION_BUSY");
    setBusyAction(action);
    setActionError(undefined);
    try {
      return await operation();
    } catch (error) {
      setActionError(messageFor(error));
      throw error;
    } finally {
      setBusyAction(null);
    }
  }, [busyAction]);

  const purchase = useCallback(async (planId: string) => {
    const response = await run("purchase", () => createDshSubscriptionPurchase(planId));
    setPendingPurchase(response.purchase);
    setPaymentSession(response.paymentSession);
    return response;
  }, [run]);

  const refreshPayment = useCallback(async () => {
    if (!pendingPurchase) return undefined;
    const response = await run("refresh_payment", () => getDshSubscriptionPurchase(pendingPurchase.id));
    setPendingPurchase(response.purchase);
    setPaymentSession(response.paymentSession);
    return response;
  }, [pendingPurchase, run]);

  const activate = useCallback(async () => {
    if (!pendingPurchase) return undefined;
    const response = await run("activate", () => activateDshSubscriptionPurchase(pendingPurchase.id));
    setPendingPurchase(response.purchase);
    await reload();
    return response;
  }, [pendingPurchase, reload, run]);

  const renew = useCallback(async (subscriptionId: string) => {
    const response = await run("renew", () => renewDshSubscription(subscriptionId));
    setPendingPurchase(response.purchase);
    setPaymentSession(response.paymentSession);
    return response;
  }, [run]);

  const cancel = useCallback(async (subscriptionId: string, reason: string) => {
    const response = await run("cancel", () => cancelDshSubscription(subscriptionId, reason));
    setPendingPurchase(undefined);
    setPaymentSession(undefined);
    await reload();
    return response;
  }, [reload, run]);

  return useMemo(() => ({
    state,
    busyAction,
    actionError,
    pendingPurchase,
    paymentSession,
    reload,
    purchase,
    refreshPayment,
    activate,
    renew,
    cancel,
  }), [
    state,
    busyAction,
    actionError,
    pendingPurchase,
    paymentSession,
    reload,
    purchase,
    refreshPayment,
    activate,
    renew,
    cancel,
  ]);
}
