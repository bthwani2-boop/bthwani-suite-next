import { useCallback, useEffect, useState } from "react";
import {
  applyPlatformChangeSet,
  approvePlatformChangeSet,
  createPlatformChangeSet,
  fetchPlatformChangeSets,
  rejectPlatformChangeSet,
  rollbackPlatformChangeSet,
  submitPlatformChangeSet,
  validatePlatformChangeSet,
  type CreatePlatformChangeSetInput,
  type PlatformChangeSet,
} from "./platform-control.api";

export type PlatformChangeWorkflowState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly changeSets: readonly PlatformChangeSet[] }
  | { readonly kind: "error"; readonly message: string };

export type PlatformChangeMutationState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly action: string; readonly changeSetId?: string }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly message: string };

function resolveWorkflowError(error: unknown): string {
  const candidate = error as { status?: number; code?: string; message?: string } | undefined;
  if (candidate?.code) return candidate.code;
  if (candidate?.status === 401) return "PLATFORM_UNAUTHENTICATED";
  if (candidate?.status === 403) return "PLATFORM_ACTION_PERMISSION_REQUIRED";
  if (candidate?.status === 409) return "PLATFORM_WORKFLOW_CONFLICT";
  if (candidate?.status === 422) return "PLATFORM_CHANGE_VALIDATION_FAILED";
  return candidate?.message ?? "PLATFORM_CHANGE_WORKFLOW_UNAVAILABLE";
}

export function usePlatformChangeWorkflowController(enabled: boolean) {
  const [state, setState] = useState<PlatformChangeWorkflowState>({ kind: "idle" });
  const [mutationState, setMutationState] = useState<PlatformChangeMutationState>({ kind: "idle" });

  const refresh = useCallback(async (showLoading: boolean) => {
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }
    if (showLoading) setState({ kind: "loading" });
    try {
      const response = await fetchPlatformChangeSets();
      setState({ kind: "success", changeSets: response.changeSets });
    } catch (error) {
      setState({ kind: "error", message: resolveWorkflowError(error) });
    }
  }, [enabled]);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  const runMutation = useCallback(async (
    action: string,
    changeSetId: string | undefined,
    operation: () => Promise<{ changeSet: PlatformChangeSet }>,
  ): Promise<boolean> => {
    setMutationState({ kind: "loading", action, ...(changeSetId ? { changeSetId } : {}) });
    try {
      await operation();
      await refresh(false);
      setMutationState({ kind: "success", message: `${action}_COMPLETED` });
      return true;
    } catch (error) {
      setMutationState({ kind: "error", message: resolveWorkflowError(error) });
      return false;
    }
  }, [refresh]);

  return {
    state,
    mutationState,
    reload: () => refresh(true),
    clearMutationState: () => setMutationState({ kind: "idle" }),
    create: (input: CreatePlatformChangeSetInput) =>
      runMutation("create", undefined, () => createPlatformChangeSet(input)),
    validate: (id: string) =>
      runMutation("validate", id, () => validatePlatformChangeSet(id)),
    submit: (id: string) =>
      runMutation("submit", id, () => submitPlatformChangeSet(id)),
    approve: (id: string) =>
      runMutation("approve", id, () => approvePlatformChangeSet(id)),
    reject: (id: string, reason: string) =>
      runMutation("reject", id, () => rejectPlatformChangeSet(id, { reason })),
    apply: (id: string) =>
      runMutation("apply", id, () => applyPlatformChangeSet(id)),
    rollback: (id: string) =>
      runMutation("rollback", id, () => rollbackPlatformChangeSet(id)),
  };
}
