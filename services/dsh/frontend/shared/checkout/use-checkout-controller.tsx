import { useCallback, useEffect, useState } from "react";
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

  const submit = useCallback(async (input: DshCreateIntentInput) => {
    setState(beginCheckoutSubmit());
    try {
      const attempt = await getOrCreateCheckoutAttempt(input);
      const intent = await createCheckoutIntent(input, attempt.context);
      try {
        await clearCheckoutAttempt(attempt.fingerprint);
      } catch {
        // The accepted server mutation is idempotent; retaining the key is safe.
      }
      setState(resolveCheckoutSubmitSuccess(intent));
    } catch (error) {
      setState(resolveCheckoutSubmitError(classifyCheckoutError(error)));
    }
  }, []);

  const cancel = useCallback(async (intentId: string) => {
    try {
      await cancelCheckoutIntent(intentId);
      setState(checkoutIdleState());
    } catch (error) {
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
    setState(beginCheckoutReload());
    try {
      const intent = await fetchCheckoutIntent(intentId);
      setState(resolveCheckoutReloadSuccess(intent));
    } catch {
      setState(resolveCheckoutReloadError());
    }
  }, []);

  const reset = useCallback(() => setState(checkoutIdleState()), []);

  return { state, submit, cancel, reload, reset };
}

export function useOperatorCheckoutController(authKind = "unauthenticated") {
  const [intents, setIntents] = useState<readonly DshCheckoutIntent[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "success" | "empty" | "error">("loading");

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

  const reconcile = useCallback(async (intentId: string) => {
    await reconcileOperatorCheckoutIntent(intentId);
    await load();
  }, [load]);

  return {
    intents,
    loadState,
    reconcile,
    reload: (stateFilter?: string) => void load(stateFilter),
  };
}
