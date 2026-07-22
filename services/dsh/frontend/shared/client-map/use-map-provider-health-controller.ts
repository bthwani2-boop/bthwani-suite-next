import React from "react";
import { getDshOperatorMapProviderHealth } from "./client-map.api";
import type { DshMapProviderHealthState } from "./client-map.types";

function resolveHealthError(error: unknown): string {
  const value = error as { kind?: string; status?: number; message?: string } | undefined;
  if (value?.kind === "network") return "لا يوجد اتصال بخدمة الخرائط المحكومة.";
  if (value?.status === 401) return "الجلسة منتهية.";
  if (value?.status === 403) return "لا تملك صلاحية قراءة حالة مزود الخرائط.";
  if (value?.status === 503) return "مزود الخرائط غير مهيأ.";
  if (value?.status === 504) return "انتهت مهلة فحص مزود الخرائط.";
  if (value?.status === 502) return "مزود الخرائط غير متاح حاليًا.";
  return value?.message?.trim() || "تعذر قراءة حالة مزود الخرائط.";
}

export function useMapProviderHealthController(enabled = true) {
  const [state, setState] = React.useState<DshMapProviderHealthState>({ kind: "loading" });

  const reload = React.useCallback(async () => {
    if (!enabled) {
      setState({ kind: "loading" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await getDshOperatorMapProviderHealth();
      setState({ kind: "success", data });
    } catch (error) {
      setState({ kind: "error", message: resolveHealthError(error) });
    }
  }, [enabled]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload } as const;
}
