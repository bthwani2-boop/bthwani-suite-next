import React from "react";
import {
  anonymizeExpiredClientAddresses,
  fetchClientAddressPrivacyEvents,
  fetchClientAddressPrivacyPolicy,
  fetchClientAddressPrivacyStatus,
  updateClientAddressPrivacyPolicy,
} from "./client-address-privacy.api";
import type {
  DshClientAddressAnonymizationResult,
  DshClientAddressPrivacyState,
  DshUpdateClientAddressPrivacyPolicyInput,
} from "./client-address-privacy.types";

function resolvePrivacyError(error: unknown): string {
  const value = error as {
    kind?: string;
    status?: number;
    message?: string;
  } | undefined;
  if (value?.kind === "network") return "لا يوجد اتصال بخدمة خصوصية العناوين.";
  if (value?.kind === "invalid_request") return value.message?.trim() || "بيانات عملية الخصوصية غير صالحة.";
  if (value?.status === 401) return "الجلسة منتهية.";
  if (value?.status === 403) return "لا تملك صلاحية إدارة خصوصية العناوين.";
  if (value?.status === 409) return "تغيرت السياسة أو أعيد استخدام مفتاح العملية؛ أعد التحميل.";
  return value?.message?.trim() || "تعذر تنفيذ عملية خصوصية العناوين.";
}

export function useClientAddressPrivacyController(enabled = true) {
  const [state, setState] = React.useState<DshClientAddressPrivacyState>({
    kind: "idle",
  });
  const [mutating, setMutating] = React.useState(false);
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [lastResult, setLastResult] =
    React.useState<DshClientAddressAnonymizationResult | null>(null);

  const reload = React.useCallback(async () => {
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const [policy, status, events] = await Promise.all([
        fetchClientAddressPrivacyPolicy(),
        fetchClientAddressPrivacyStatus(),
        fetchClientAddressPrivacyEvents(50),
      ]);
      setState({ kind: "success", policy, status, events });
    } catch (error) {
      setState({ kind: "error", message: resolvePrivacyError(error) });
    }
  }, [enabled]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const save = React.useCallback(
    async (input: Omit<DshUpdateClientAddressPrivacyPolicyInput, "expectedVersion">) => {
      if (state.kind !== "success") {
        setMutationError("يجب تحميل السياسة الحالية قبل تعديلها.");
        return false;
      }
      setMutating(true);
      setMutationError(null);
      try {
        await updateClientAddressPrivacyPolicy({
          ...input,
          expectedVersion: state.policy.version,
        });
        await reload();
        return true;
      } catch (error) {
        setMutationError(resolvePrivacyError(error));
        return false;
      } finally {
        setMutating(false);
      }
    },
    [reload, state],
  );

  const anonymize = React.useCallback(
    async (limit: number, runId: string) => {
      setMutating(true);
      setMutationError(null);
      try {
        const response = await anonymizeExpiredClientAddresses(limit, runId);
        setLastResult(response.result);
        await reload();
        return response.result;
      } catch (error) {
        setMutationError(resolvePrivacyError(error));
        return null;
      } finally {
        setMutating(false);
      }
    },
    [reload],
  );

  return {
    state,
    mutating,
    mutationError,
    lastResult,
    reload,
    save,
    anonymize,
    clearMutationError: () => setMutationError(null),
  } as const;
}
