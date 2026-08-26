import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelCheckoutIntent,
  classifyCheckoutError,
  createCheckoutIntent,
  fetchCheckoutIntent,
  fetchOperatorCheckoutIntents,
  reconcileOperatorCheckoutIntent,
} from "./checkout.api";
import {
  clearCheckoutAttempt,
  getOrCreateCheckoutAttempt,
} from "./checkout-create-attempt";
import type {
  DshCheckoutIntent,
  DshCheckoutState,
  DshCreateIntentInput,
} from "./checkout.types";
import {
  beginCheckoutReload,
  beginCheckoutSubmit,
  resolveCheckoutReloadError,
  resolveCheckoutReloadSuccess,
  resolveCheckoutSubmitError,
  resolveCheckoutSubmitSuccess,
  resolveOperatorCheckoutLoadState,
} from "./checkout.controller-core";
import { checkoutIdleState } from "./checkout.states";

export function useCheckoutController() {
  const [state, setState] = useState<DshCheckoutState>(checkoutIdleState());
  const operationGeneration = useRef(0);

  const submit = useCallback(async (input: DshCreateIntentInput) => {
    const generation = ++operationGeneration.current;
    setState(beginCheckoutSubmit());
    try {
      const attempt = await getOrCreateCheckoutAttempt(input);
      const intent = await createCheckoutIntent(input, attempt.context);
      try {
        await clearCheckoutAttempt();
      } catch {
        // The accepted server mutation is idempotent; retaining the key is safe.
      }
      if (generation !== operationGeneration.current) return;
      setState(resolveCheckoutSubmitSuccess(intent));
    } catch (error) {
      if (generation !== operationGeneration.current) return;
      setState(resolveCheckoutSubmitError(classifyCheckoutError(error)));
    }
  }, []);

  const cancel = useCallback(async (intentId: string) => {
    const generation = ++operationGeneration.current;
    try {
      await cancelCheckoutIntent(intentId);
      if (generation !== operationGeneration.current) return;
      setState(checkoutIdleState());
    } catch (error) {
      if (generation !== operationGeneration.current) return;
      const classified = classifyCheckoutError(error);
      if (classified.kind === "offline") {
        setState({ kind: "error", message: "تعذر إلغاء جلسة الدفع لعدم وجود اتصال بالإنترنت." });
      } else if (classified.kind === "permission_denied") {
        setState({ kind: "error", message: "لا تملك صلاحية إلغاء جلسة الدفع." });
      } else if (classified.kind === "conflict") {
        setState({ kind: "error", message: "تغيرت حالة جلسة الدفع ولم يعد الإلغاء متاحًا." });
      } else {
        setState({ kind: "error", message: "تعذر إلغاء جلسة الدفع." });
      }
    }
  }, []);

  const reload = useCallback(async (intentId: string) => {
    const generation = ++operationGeneration.current;
    setState(beginCheckoutReload());
    try {
      const intent = await fetchCheckoutIntent(intentId);
      if (generation !== operationGeneration.current) return;
      setState(resolveCheckoutReloadSuccess(intent));
    } catch {
      if (generation !== operationGeneration.current) return;
      setState(resolveCheckoutReloadError());
    }
  }, []);

  const reset = useCallback(() => {
    operationGeneration.current += 1;
    setState(checkoutIdleState());
  }, []);

  return { state, submit, cancel, reload, reset };
}

function operatorReconcileMessage(error: unknown): string {
  const classified = classifyCheckoutError(error);
  if (classified.kind === "offline") return "تعذر الوصول إلى DSH. تحقق من الاتصال ثم أعد المصالحة.";
  if (classified.kind === "permission_denied") return "لا تملك صلاحية تنفيذ مصالحة checkout.";
  if (classified.kind === "conflict") return "تغيرت حالة checkout ولم تعد المصالحة مطلوبة. حدّث القائمة.";
  if (classified.kind === "payment_unavailable") return "خدمة WLT غير متاحة حاليًا. أعد المحاولة لاحقًا بنفس مرجع checkout.";
  return classified.message ?? "تعذر تنفيذ مصالحة checkout.";
}

export function useOperatorCheckoutController(authKind = "unauthenticated") {
  const [intents, setIntents] = useState<readonly DshCheckoutIntent[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "success" | "empty" | "error">("loading");
  const [reconcilingIntentId, setReconcilingIntentId] = useState<string | null>(null);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const reconcileLock = useRef(false);

  const load = useCallback(async (stateFilter?: string) => {
    setLoadState("loading");
    try {
      const result = await fetchOperatorCheckoutIntents(stateFilter);
      setIntents(result);
      setLoadState(resolveOperatorCheckoutLoadState(result));
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);

  const reconcile = useCallback(async (intentId: string): Promise<boolean> => {
    if (reconcileLock.current) return false;
    reconcileLock.current = true;
    setReconcilingIntentId(intentId);
    setReconcileError(null);
    try {
      const reconciled = await reconcileOperatorCheckoutIntent(intentId);
      setIntents((current) => current.map((intent) => intent.id === reconciled.id ? reconciled : intent));
      return true;
    } catch (error) {
      setReconcileError(operatorReconcileMessage(error));
      return false;
    } finally {
      reconcileLock.current = false;
      setReconcilingIntentId(null);
    }
  }, []);

  return {
    intents,
    loadState,
    reconcilingIntentId,
    reconcileError,
    clearReconcileError: () => setReconcileError(null),
    reconcile,
    reload: (stateFilter?: string) => void load(stateFilter),
  };
}
