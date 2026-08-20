import { useCallback, useEffect, useState } from "react";
import {
  createZone,
  fetchCapacityConfig,
  fetchSlaRules,
  fetchStoreOnboardingFeePolicy,
  fetchStoreOnboardingFeeReference,
  fetchZoneServiceability,
  fetchZones,
  updateZone,
  upsertCapacityConfig,
  upsertSlaRule,
  upsertStoreOnboardingFeePolicy,
} from "./platform-policies.api";
import type {
  DshCapacityConfig,
  DshCreateZoneInput,
  DshPlatformState,
  DshSlaRule,
  DshStoreOnboardingFeePolicy,
  DshStoreOnboardingFeePolicyInput,
  DshUpsertCapacityInput,
  DshUpsertSlaRuleInput,
  DshZone,
  DshZoneServiceability,
} from "./platform-policies.types";

function resolveMsg(error: unknown): string {
  const value = error as {
    kind?: string;
    status?: number;
    code?: string;
    message?: string;
  } | undefined;
  if (value?.kind === "network") return "لا يوجد اتصال بخدمة DSH.";
  if (value?.status === 401) return "الجلسة منتهية.";
  if (value?.status === 403) return "لا تملك صلاحية إدارة سياسات المنصة.";
  if (value?.status === 409) return "تغيرت البيانات؛ أعد التحميل ثم كرر العملية.";
  if (value?.status === 404) return "السجل المطلوب غير موجود.";
  return value?.message?.trim() || "تعذر تحميل أو تحديث سياسات المنصة.";
}

export function useZonesController(authKind: string) {
  const [state, setState] = useState<DshPlatformState<DshZone[]>>({ kind: "idle" });
  const [mutationError, setMutationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authKind !== "authenticated") {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const { zones } = await fetchZones();
      setState({ kind: "success", data: zones });
    } catch (error) {
      setState({ kind: "error", message: resolveMsg(error) });
    }
  }, [authKind]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (body: DshCreateZoneInput) => {
      setMutationError(null);
      try {
        await createZone(body);
        await load();
        return true;
      } catch (error) {
        setMutationError(resolveMsg(error));
        return false;
      }
    },
    [load],
  );

  const toggle = useCallback(
    async (zone: DshZone, isActive: boolean) => {
      setMutationError(null);
      try {
        await updateZone(zone.id, {
          isActive,
          expectedVersion: zone.version,
          reason: isActive ? "إعادة تفعيل منطقة الخدمة" : "تعطيل منطقة الخدمة",
        });
        await load();
        return true;
      } catch (error) {
        setMutationError(resolveMsg(error));
        return false;
      }
    },
    [load],
  );

  return {
    state,
    mutationError,
    clearMutationError: () => setMutationError(null),
    reload: load,
    create,
    toggle,
  } as const;
}

export type DshAreaCapacityRuntime = {
  readonly capacityConfig: DshCapacityConfig | null;
  readonly serviceability: DshZoneServiceability;
};

export function useAreaCapacityController(authKind: string, zoneId?: string) {
  const [state, setState] = useState<DshPlatformState<DshAreaCapacityRuntime>>({ kind: "idle" });
  const [mutationError, setMutationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authKind !== "authenticated" || !zoneId) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const serviceabilityPromise = fetchZoneServiceability(zoneId);
      const capacityPromise = fetchCapacityConfig(zoneId)
        .then(({ capacityConfig }) => capacityConfig)
        .catch((error: unknown) => {
          const value = error as { status?: number } | undefined;
          if (value?.status === 404) return null;
          throw error;
        });
      const [capacityConfig, serviceability] = await Promise.all([
        capacityPromise,
        serviceabilityPromise,
      ]);
      setState({ kind: "success", data: { capacityConfig, serviceability } });
    } catch (error) {
      setState({ kind: "error", message: resolveMsg(error) });
    }
  }, [authKind, zoneId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (
      input: Omit<
        DshUpsertCapacityInput,
        "zoneId" | "expectedVersion" | "reason"
      > & { readonly reason: string },
    ) => {
      if (!zoneId) throw new Error("zoneId is required");
      const expectedVersion =
        state.kind === "success" && state.data.capacityConfig
          ? state.data.capacityConfig.version
          : 0;
      setMutationError(null);
      try {
        await upsertCapacityConfig({
          zoneId,
          ...input,
          expectedVersion,
        });
        await load();
        return true;
      } catch (error) {
        setMutationError(resolveMsg(error));
        return false;
      }
    },
    [load, state, zoneId],
  );

  return {
    state,
    mutationError,
    clearMutationError: () => setMutationError(null),
    reload: load,
    save,
  } as const;
}

export function useSlaRulesController(authKind: string, zoneId?: string) {
  const [state, setState] = useState<DshPlatformState<DshSlaRule[]>>({ kind: "idle" });
  const [mutationError, setMutationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authKind !== "authenticated") {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const { slaRules } = await fetchSlaRules(zoneId);
      setState({ kind: "success", data: slaRules });
    } catch (error) {
      setState({ kind: "error", message: resolveMsg(error) });
    }
  }, [authKind, zoneId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upsert = useCallback(
    async (
      input: Omit<DshUpsertSlaRuleInput, "expectedVersion">,
    ) => {
      const existing =
        state.kind === "success"
          ? state.data.find(
              (rule) =>
                rule.zoneId === input.zoneId &&
                rule.category === input.category.trim().toLowerCase(),
            )
          : undefined;
      setMutationError(null);
      try {
        await upsertSlaRule({
          ...input,
          expectedVersion: existing?.version ?? 0,
        });
        await load();
        return true;
      } catch (error) {
        setMutationError(resolveMsg(error));
        return false;
      }
    },
    [load, state],
  );

  return {
    state,
    mutationError,
    clearMutationError: () => setMutationError(null),
    reload: load,
    upsert,
  } as const;
}

export function useStoreOnboardingFeePolicyController(authKind: string) {
  const [state, setState] = useState<
    DshPlatformState<DshStoreOnboardingFeePolicy>
  >({ kind: "idle" });

  const load = useCallback(async () => {
    if (authKind !== "authenticated") {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const { policy } = await fetchStoreOnboardingFeePolicy();
      setState({ kind: "success", data: policy });
    } catch (error) {
      setState({ kind: "error", message: resolveMsg(error) });
    }
  }, [authKind]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (body: DshStoreOnboardingFeePolicyInput) => {
      await upsertStoreOnboardingFeePolicy(body);
      await load();
    },
    [load],
  );

  return { state, reload: load, save } as const;
}

export function useStoreOnboardingFeeReferenceController(authKind: string) {
  const [state, setState] = useState<
    DshPlatformState<DshStoreOnboardingFeePolicy>
  >({ kind: "idle" });

  useEffect(() => {
    if (authKind !== "authenticated") {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    fetchStoreOnboardingFeeReference()
      .then(({ policy }) => {
        if (!cancelled) setState({ kind: "success", data: policy });
      })
      .catch((error) => {
        if (!cancelled) setState({ kind: "error", message: resolveMsg(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [authKind]);

  return { state } as const;
}

export function useOperationalPolicyEditor(onSaved: () => Promise<void>) {
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    setMutating(true);
    setError(null);
    try {
      await action();
      await onSaved();
      return true;
    } catch (caught) {
      setError(resolveMsg(caught));
      return false;
    } finally {
      setMutating(false);
    }
  }, [onSaved]);

  const saveZone = useCallback((
    current: DshZone | null,
    input: {
      readonly id?: string;
      readonly name: string;
      readonly cityCode: string;
      readonly description: string;
      readonly isActive: boolean;
      readonly reason: string;
    },
  ) => execute(async () => {
    if (current) {
      await updateZone(current.id, {
        name: input.name,
        description: input.description,
        isActive: input.isActive,
        expectedVersion: current.version,
        reason: input.reason,
      });
      return;
    }
    await createZone(input);
  }), [execute]);

  const saveSla = useCallback((
    current: DshSlaRule | null,
    input: Omit<DshUpsertSlaRuleInput, "expectedVersion">,
  ) => execute(async () => {
    await upsertSlaRule({ ...input, expectedVersion: current?.version ?? 0 });
  }), [execute]);

  const saveCapacity = useCallback((
    current: DshCapacityConfig | null,
    input: Omit<DshUpsertCapacityInput, "expectedVersion">,
  ) => execute(async () => {
    await upsertCapacityConfig({ ...input, expectedVersion: current?.version ?? 0 });
  }), [execute]);

  return {
    mutating,
    error,
    clearError: () => setError(null),
    saveZone,
    saveSla,
    saveCapacity,
  } as const;
}
