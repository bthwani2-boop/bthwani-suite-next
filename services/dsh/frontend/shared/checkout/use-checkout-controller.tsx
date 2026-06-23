import { useCallback, useEffect, useState } from "react";
import {
  cancelCheckoutIntent,
  classifyCheckoutError,
  createCheckoutIntent,
  fetchCheckoutIntent,
  fetchOperatorCheckoutIntents,
} from "./checkout.api";
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
      const intent = await createCheckoutIntent(input);
      setState(resolveCheckoutSubmitSuccess(intent));
    } catch (error) {
      setState(resolveCheckoutSubmitError(classifyCheckoutError(error)));
    }
  }, []);

  const cancel = useCallback(async (intentId: string) => {
    try {
      await cancelCheckoutIntent(intentId);
      setState(checkoutIdleState());
    } catch {
      // Conflict or error — leave state as-is
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

  return {
    intents,
    loadState,
    reload: (stateFilter?: string) => void load(stateFilter),
  };
}
