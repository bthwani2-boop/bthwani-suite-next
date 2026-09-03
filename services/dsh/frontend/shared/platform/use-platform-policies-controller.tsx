import { useCallback, useEffect, useState } from "react";
import {
  createZone,
  fetchStoreOnboardingFeePolicy,
  fetchStoreOnboardingFeeReference,
  fetchZones,
  updateZone,
  upsertStoreOnboardingFeePolicy,
} from "./platform-policies.api";
import type {
  DshCreateZoneInput,
  DshPlatformState,
  DshStoreOnboardingFeePolicy,
  DshStoreOnboardingFeePolicyInput,
  DshZone,
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
