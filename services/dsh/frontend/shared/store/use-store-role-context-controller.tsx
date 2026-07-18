import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchStoreRoleContext,
  submitStoreRoleAction,
} from "./store-role.api";
import { type StoreRoleAction } from "./store-discovery.types";
import {
  resolveStoreRoleMutationAttempt,
  type StoreRoleMutationAttempt,
} from "./store-role-mutation";
import {
  loadStoreRoleContext,
  toStoreRoleExperience,
  type StoreRole,
  type StoreRoleContextState,
  type StoreRoleExperience,
} from "./store-role-context.controller-core";

export type StoreActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting"; readonly actionKind: StoreRoleAction["kind"] }
  | { readonly kind: "success"; readonly replayed: boolean }
  | { readonly kind: "conflict"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

export type StoreRoleContextController = {
  readonly state: StoreRoleContextState;
  readonly experience: StoreRoleExperience | null;
  readonly actionState: StoreActionState;
  readonly retry: () => void;
  readonly submit: (action: StoreRoleAction) => Promise<void>;
};

// Dev/read-only fallback is explicit: without a valid token the API returns
// permission_denied, and the expected role is enforced here so another
// surface's valid token cannot silently render that actor's scoped store.
export function useStoreRoleContextController(
  expectedRole: Exclude<StoreRole, "operator">,
  authKind = "unauthenticated",
  storeId?: string,
): StoreRoleContextController {
  const [state, setState] = useState<StoreRoleContextState>({ kind: "loading" });
  const [actionState, setActionState] = useState<StoreActionState>({ kind: "idle" });
  const mutationAttemptRef = useRef<StoreRoleMutationAttempt | null>(null);

  const load = useCallback(async () => {
    await loadStoreRoleContext(() => fetchStoreRoleContext(storeId), setState, expectedRole);
  }, [expectedRole, storeId]);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [load, authKind]);

  const submit = useCallback(async (action: StoreRoleAction) => {
    setActionState({ kind: "submitting", actionKind: action.kind });
    const attempt = resolveStoreRoleMutationAttempt(mutationAttemptRef.current, action);
    mutationAttemptRef.current = attempt;
    try {
      const response = await submitStoreRoleAction(action, attempt.auth);
      mutationAttemptRef.current = null;
      setActionState({ kind: "success", replayed: response.replayed });
      await load();
    } catch (error) {
      const typed = error as { kind?: string; status?: number };
      if (typed.kind === "http" && typed.status === 409) {
        mutationAttemptRef.current = null;
        setActionState({ kind: "conflict", message: "تغيّرت بيانات المتجر. أعد التحميل ثم حاول مجددًا." });
      } else if (typed.kind === "http" && (typed.status === 401 || typed.status === 403)) {
        mutationAttemptRef.current = null;
        setActionState({ kind: "error", message: "لا تملك صلاحية تنفيذ هذا الإجراء على المتجر." });
      } else if (typed.kind === "network" || (typed.kind === "http" && typed.status === 503)) {
        setActionState({ kind: "error", message: "خدمة المتاجر غير متاحة حاليًا. إعادة الإجراء نفسه ستستخدم مفتاحه السابق." });
      } else {
        mutationAttemptRef.current = null;
        setActionState({ kind: "error", message: "تعذر حفظ الإجراء." });
      }
    }
  }, [load]);

  const experience = useMemo(
    () => state.kind === "success" ? toStoreRoleExperience(state) : null,
    [state],
  );

  return {
    state,
    experience,
    actionState,
    retry: () => void load(),
    submit,
  };
}
