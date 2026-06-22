import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchStoreRoleContext,
  submitStoreRoleAction,
  type StoreRoleAction,
} from "./store-role.api";
import {
  loadStoreRoleContext,
  toStoreRoleExperience,
  type StoreRoleContextState,
  type StoreRoleExperience,
} from "./store-role-context.controller-core";

export type StoreActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
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

// dev/read-only fallback: when no auth token is present the API returns 401 and
// the controller surfaces a permission_denied state — no silent empty fallback.
export function useStoreRoleContextController(authKind = "unauthenticated"): StoreRoleContextController {
  const [state, setState] = useState<StoreRoleContextState>({ kind: "loading" });
  const [actionState, setActionState] = useState<StoreActionState>({ kind: "idle" });

  const load = useCallback(async () => {
    await loadStoreRoleContext(fetchStoreRoleContext, setState);
  }, []);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [load, authKind]);

  const submit = useCallback(async (action: StoreRoleAction) => {
    setActionState({ kind: "submitting" });
    try {
      const response = await submitStoreRoleAction(action);
      setActionState({ kind: "success", replayed: response.replayed });
      await load();
    } catch (error) {
      const typed = error as { kind?: string; status?: number };
      if (typed.kind === "http" && typed.status === 409) {
        setActionState({ kind: "conflict", message: "تغيّرت بيانات المتجر. أعد التحميل ثم حاول مجددًا." });
      } else {
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
