import { useCallback, useEffect, useRef, useState } from "react";
import { classifyCheckoutError, fetchOperatorCheckoutIntents, reconcileOperatorCheckoutIntent } from "./checkout.api";
import type { DshCheckoutIntent } from "./checkout.types";
import { resolveOperatorCheckoutLoadState } from "./checkout.controller-core";

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
