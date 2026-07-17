import { useCallback, useEffect, useState } from "react";
import {
  fetchZones, createZone, updateZone, fetchSlaRules, upsertSlaRule,
  fetchCapacityConfig, upsertCapacityConfig, fetchZoneServiceability,
  fetchStoreOnboardingFeePolicy, upsertStoreOnboardingFeePolicy, fetchStoreOnboardingFeeReference,
} from "./platform-policies.api";
import type {
  DshZone, DshSlaRule, DshCapacityConfig, DshZoneServiceability,
  DshPlatformState, DshStoreOnboardingFeePolicy, DshStoreOnboardingFeePolicyInput,
} from "./platform-policies.types";

function resolveMsg(err: unknown): string {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.kind === "network") return "لا يوجد اتصال";
  if (e?.status === 401) return "الجلسة منتهية";
  if (e?.status === 403) return "لا تملك الصلاحية";
  return "تعذّر تحميل البيانات";
}

export function useZonesController(authKind: string) {
  const [state, setState] = useState<DshPlatformState<DshZone[]>>({ kind: "idle" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { zones } = await fetchZones();
      setState({ kind: "success", data: zones });
    } catch (err) {
      setState({ kind: "error", message: resolveMsg(err) });
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") { setState({ kind: "idle" }); return; }
    void load();
  }, [authKind, load]);

  return {
    state, reload: load,
    create: async (body: { name: string; cityCode: string; description?: string }) => {
      await createZone(body); await load();
    },
    toggle: async (id: string, isActive: boolean) => { await updateZone(id, { isActive }); await load(); },
  };
}

export type DshAreaCapacityRuntime = {
  readonly capacityConfig: DshCapacityConfig;
  readonly serviceability: DshZoneServiceability;
};

export function useAreaCapacityController(authKind: string, zoneId?: string) {
  const [state, setState] = useState<DshPlatformState<DshAreaCapacityRuntime>>({ kind: "idle" });

  const load = useCallback(async () => {
    if (authKind !== "authenticated" || !zoneId) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const [{ capacityConfig }, serviceability] = await Promise.all([
        fetchCapacityConfig(zoneId),
        fetchZoneServiceability(zoneId),
      ]);
      setState({ kind: "success", data: { capacityConfig, serviceability } });
    } catch (err) {
      setState({ kind: "error", message: resolveMsg(err) });
    }
  }, [authKind, zoneId]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (input: {
    maxConcurrentOrders: number;
    maxCaptainsOnline: number;
    throttleThreshold: number;
  }) => {
    if (!zoneId) throw new Error("zoneId is required");
    await upsertCapacityConfig({ zoneId, ...input });
    await load();
  }, [zoneId, load]);

  return { state, reload: load, save };
}

export function useSlaRulesController(authKind: string, zoneId?: string) {
  const [state, setState] = useState<DshPlatformState<DshSlaRule[]>>({ kind: "idle" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { slaRules } = await fetchSlaRules(zoneId);
      setState({ kind: "success", data: slaRules });
    } catch (err) {
      setState({ kind: "error", message: resolveMsg(err) });
    }
  }, [zoneId]);

  useEffect(() => {
    if (authKind !== "authenticated") { setState({ kind: "idle" }); return; }
    void load();
  }, [authKind, load]);

  return {
    state, reload: load,
    upsert: async (body: { zoneId: string; category: string; maxPrepMins: number; maxDeliveryMins: number }) => {
      await upsertSlaRule(body); await load();
    },
  };
}

export function useStoreOnboardingFeePolicyController(authKind: string) {
  const [state, setState] = useState<DshPlatformState<DshStoreOnboardingFeePolicy>>({ kind: "idle" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { policy } = await fetchStoreOnboardingFeePolicy();
      setState({ kind: "success", data: policy });
    } catch (err) {
      setState({ kind: "error", message: resolveMsg(err) });
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") { setState({ kind: "idle" }); return; }
    void load();
  }, [authKind, load]);

  return {
    state, reload: load,
    save: async (body: DshStoreOnboardingFeePolicyInput) => {
      await upsertStoreOnboardingFeePolicy(body); await load();
    },
  };
}

export function useStoreOnboardingFeeReferenceController(authKind: string) {
  const [state, setState] = useState<DshPlatformState<DshStoreOnboardingFeePolicy>>({ kind: "idle" });

  useEffect(() => {
    if (authKind !== "authenticated") { setState({ kind: "idle" }); return; }
    let cancelled = false;
    setState({ kind: "loading" });
    fetchStoreOnboardingFeeReference()
      .then(({ policy }) => { if (!cancelled) setState({ kind: "success", data: policy }); })
      .catch((err) => { if (!cancelled) setState({ kind: "error", message: resolveMsg(err) }); });
    return () => { cancelled = true; };
  }, [authKind]);

  return { state };
}
