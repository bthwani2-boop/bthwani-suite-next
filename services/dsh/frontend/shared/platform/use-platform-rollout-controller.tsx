import { useCallback, useEffect, useState } from "react";
import {
  abortPlatformRollout,
  advancePlatformRollout,
  createPlatformRollout,
  fetchPlatformRollouts,
  pausePlatformRollout,
  rollbackPlatformRollout,
  type CreatePlatformRolloutInput,
  type PlatformRollout,
} from "./platform-control.api";

export type PlatformRolloutState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly rollouts: readonly PlatformRollout[] }
  | { readonly kind: "error"; readonly message: string };

export type PlatformRolloutMutationState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly action: string; readonly rolloutId?: string }
  | { readonly kind: "success"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

function resolveRolloutError(error: unknown): string {
  const candidate = error as { status?: number; code?: string; message?: string } | undefined;
  if (candidate?.code) return candidate.code;
  if (candidate?.status === 401) return "PLATFORM_UNAUTHENTICATED";
  if (candidate?.status === 403) return "PLATFORM_ROLLOUT_PERMISSION_REQUIRED";
  if (candidate?.status === 409) return "PLATFORM_ROLLOUT_CONFLICT";
  if (candidate?.status === 422) return "PLATFORM_ROLLOUT_VALIDATION_FAILED";
  return candidate?.message ?? "PLATFORM_ROLLOUT_UNAVAILABLE";
}

export function usePlatformRolloutController(enabled: boolean) {
  const [state, setState] = useState<PlatformRolloutState>({ kind: "idle" });
  const [mutationState, setMutationState] = useState<PlatformRolloutMutationState>({ kind: "idle" });

  const refresh = useCallback(async (showLoading: boolean) => {
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }
    if (showLoading) setState({ kind: "loading" });
    try {
      const response = await fetchPlatformRollouts();
      setState({ kind: "success", rollouts: response.rollouts });
    } catch (error) {
      setState({ kind: "error", message: resolveRolloutError(error) });
    }
  }, [enabled]);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  const runMutation = useCallback(async (
    action: string,
    rolloutId: string | undefined,
    operation: () => Promise<{ rollout: PlatformRollout }>,
  ): Promise<boolean> => {
    setMutationState({ kind: "loading", action, ...(rolloutId ? { rolloutId } : {}) });
    try {
      await operation();
      await refresh(false);
      setMutationState({ kind: "success", message: `${action}_COMPLETED` });
      return true;
    } catch (error) {
      setMutationState({ kind: "error", message: resolveRolloutError(error) });
      return false;
    }
  }, [refresh]);

  return {
    state,
    mutationState,
    reload: () => refresh(true),
    clearMutationState: () => setMutationState({ kind: "idle" }),
    create: (input: CreatePlatformRolloutInput) =>
      runMutation("rollout_create", undefined, () => createPlatformRollout(input)),
    advance: (id: string) =>
      runMutation("rollout_advance", id, () => advancePlatformRollout(id)),
    pause: (id: string) =>
      runMutation("rollout_pause", id, () => pausePlatformRollout(id)),
    abort: (id: string) =>
      runMutation("rollout_abort", id, () => abortPlatformRollout(id)),
    rollback: (id: string) =>
      runMutation("rollout_rollback", id, () => rollbackPlatformRollout(id)),
  };
}
