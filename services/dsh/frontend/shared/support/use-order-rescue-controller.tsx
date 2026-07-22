import { useCallback, useEffect, useState } from "react";
import {
  createOrderRescueCase,
  fetchOrderRescueEvents,
  fetchOrderRescueCases,
  updateOrderRescueCase,
  type DshCreateGovernedOrderRescueInput,
  type DshGovernedOrderRescueCase,
  type DshGovernedOrderRescueEvent,
  type DshGovernedOrderRescueStatus,
  type DshUpdateGovernedOrderRescueInput,
} from "./order-rescue.api";
import {
  clearSupportMutationAttempt,
  getOrCreateSupportMutationAttempt,
} from "./support-mutation-attempt";
import { classifySupportError } from "./support.api";

export type OrderRescueListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly rescueCases: readonly DshGovernedOrderRescueCase[] };

export type OrderRescueActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly rescueCase: DshGovernedOrderRescueCase };

export type OrderRescueEventState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly events: readonly DshGovernedOrderRescueEvent[] };

function resolveMessage(error: unknown): string {
  const classified = classifySupportError(error);
  if (classified.kind === "permission_denied") return "غير مصرح لك بإدارة إنقاذ الطلب";
  if (classified.kind === "offline") return "تعذر الاتصال؛ ستُستخدم هوية العملية نفسها عند إعادة المحاولة";
  if (classified.kind === "not_found") return "لم يتم إيجاد الطلب أو حالة الإنقاذ";
  if (classified.kind === "conflict") return "توجد حالة نشطة أو تغيرت الحالة؛ حدّث البيانات ثم أعد المحاولة";
  return "تعذر تنفيذ عملية إنقاذ الطلب";
}

function fingerprint(value: unknown): string {
  return JSON.stringify(value);
}

export function useOrderRescueController(authKind = "unauthenticated") {
  const [listState, setListState] = useState<OrderRescueListState>({ kind: "idle" });
  const [actionState, setActionState] = useState<OrderRescueActionState>({ kind: "idle" });
  const [eventState, setEventState] = useState<OrderRescueEventState>({ kind: "idle" });

  const load = useCallback(async (statusFilter?: DshGovernedOrderRescueStatus) => {
    setListState({ kind: "loading" });
    try {
      const rescueCases = await fetchOrderRescueCases(statusFilter);
      setListState(rescueCases.length === 0 ? { kind: "empty" } : { kind: "success", rescueCases });
    } catch (error) {
      setListState({ kind: "error", message: resolveMessage(error) });
    }
  }, []);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);

  const loadEvents = useCallback(async (caseId: string) => {
    if (!caseId) {
      setEventState({ kind: "idle" });
      return;
    }
    setEventState({ kind: "loading" });
    try {
      setEventState({ kind: "success", events: await fetchOrderRescueEvents(caseId) });
    } catch (error) {
      setEventState({ kind: "error", message: resolveMessage(error) });
    }
  }, []);

  const createCase = useCallback(async (input: DshCreateGovernedOrderRescueInput): Promise<boolean> => {
    const valueFingerprint = fingerprint(input);
    const attempt = await getOrCreateSupportMutationAttempt({
      scope: "operator",
      operation: "order-rescue-create",
      entityId: input.orderId,
      fingerprint: valueFingerprint,
    });
    setActionState({ kind: "submitting" });
    try {
      const rescueCase = await createOrderRescueCase(input, attempt.context);
      await clearSupportMutationAttempt({
        scope: "operator",
        operation: "order-rescue-create",
        entityId: input.orderId,
        fingerprint: valueFingerprint,
      });
      setActionState({ kind: "success", rescueCase });
      await Promise.all([load(), loadEvents(rescueCase.id)]);
      return true;
    } catch (error) {
      setActionState({ kind: "error", message: resolveMessage(error) });
      return false;
    }
  }, [load, loadEvents]);

  const updateCase = useCallback(async (
    rescueCase: DshGovernedOrderRescueCase,
    input: Omit<DshUpdateGovernedOrderRescueInput, "expectedStatus">,
  ): Promise<boolean> => {
    const governedInput: DshUpdateGovernedOrderRescueInput = {
      ...input,
      expectedStatus: rescueCase.status,
    };
    const valueFingerprint = fingerprint(governedInput);
    const attempt = await getOrCreateSupportMutationAttempt({
      scope: "operator",
      operation: "order-rescue-transition",
      entityId: rescueCase.id,
      fingerprint: valueFingerprint,
    });
    setActionState({ kind: "submitting" });
    try {
      const updated = await updateOrderRescueCase(rescueCase.id, governedInput, attempt.context);
      await clearSupportMutationAttempt({
        scope: "operator",
        operation: "order-rescue-transition",
        entityId: rescueCase.id,
        fingerprint: valueFingerprint,
      });
      setActionState({ kind: "success", rescueCase: updated });
      await Promise.all([load(), loadEvents(rescueCase.id)]);
      return true;
    } catch (error) {
      setActionState({ kind: "error", message: resolveMessage(error) });
      return false;
    }
  }, [load, loadEvents]);

  const resetAction = useCallback(() => setActionState({ kind: "idle" }), []);

  return {
    listState,
    actionState,
    eventState,
    reload: load,
    reloadEvents: loadEvents,
    createCase,
    updateCase,
    resetAction,
  };
}
