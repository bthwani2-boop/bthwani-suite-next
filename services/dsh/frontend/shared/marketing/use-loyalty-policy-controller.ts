"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createLoyaltyEarningPolicy,
  listLoyaltyEarningPolicies,
  updateLoyaltyEarningPolicy,
  type LoyaltyEarningPolicy,
  type LoyaltyPolicyCreateInput,
  type LoyaltyPolicyStatus,
} from "./loyalty-policy.api";

export type LoyaltyPolicyControllerState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "success"; readonly policies: readonly LoyaltyEarningPolicy[] }
  | { readonly kind: "error"; readonly message: string };

function resolveError(error: unknown): string {
  const candidate = error as { readonly status?: number; readonly message?: string } | undefined;
  if (candidate?.status === 409) return candidate.message || "تعارض في سياسة الولاء. أعد التحميل قبل المتابعة.";
  if (candidate?.status === 403) return "لا تملك صلاحية إدارة سياسة الولاء.";
  return candidate?.message || "تعذر تنفيذ عملية سياسة الولاء.";
}

export function useLoyaltyPolicyController(authKind: string) {
  const [state, setState] = useState<LoyaltyPolicyControllerState>({ kind: "loading" });
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const isAuthenticated = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setState({ kind: "error", message: "يلزم تسجيل الدخول بصلاحية التسويق." });
      return false;
    }
    setState({ kind: "loading" });
    try {
      const response = await listLoyaltyEarningPolicies();
      setState(response.policies.length
        ? { kind: "success", policies: response.policies }
        : { kind: "empty" });
      setMutationError(null);
      return true;
    } catch (error) {
      setState({ kind: "error", message: resolveError(error) });
      return false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (input: LoyaltyPolicyCreateInput) => {
    setMutationLoading(true);
    setMutationError(null);
    try {
      await createLoyaltyEarningPolicy(input);
      await load();
      return true;
    } catch (error) {
      setMutationError(resolveError(error));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, [load]);

  const setStatus = useCallback(async (
    policy: LoyaltyEarningPolicy,
    status: LoyaltyPolicyStatus,
  ) => {
    setMutationLoading(true);
    setMutationError(null);
    try {
      await updateLoyaltyEarningPolicy(policy.id, {
        status,
        expectedVersion: policy.version,
      });
      await load();
      return true;
    } catch (error) {
      setMutationError(resolveError(error));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, [load]);

  return { state, mutationLoading, mutationError, reload: load, create, setStatus };
}
