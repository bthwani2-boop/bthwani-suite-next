import { useCallback, useEffect, useState } from "react";
import { fetchZones, createZone, updateZone, fetchSlaRules, upsertSlaRule } from "./platform-policies.api";
import type { DshZone, DshSlaRule, DshPlatformState } from "./platform-policies.types";

function resolveMsg(err: unknown): string {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.kind === "network") return "لا يوجد اتصال";
  if (e?.status === 401) return "الجلسة منتهية";
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
    load();
  }, [authKind, load]);

  return {
    state, reload: load,
    create: async (body: { name: string; cityCode: string; description?: string }) => {
      await createZone(body); await load();
    },
    toggle: async (id: string, isActive: boolean) => { await updateZone(id, { isActive }); await load(); },
  };
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
    load();
  }, [authKind, zoneId, load]);

  return {
    state, reload: load,
    upsert: async (body: { zoneId: string; category: string; maxPrepMins: number; maxDeliveryMins: number }) => {
      await upsertSlaRule(body); await load();
    },
  };
}
