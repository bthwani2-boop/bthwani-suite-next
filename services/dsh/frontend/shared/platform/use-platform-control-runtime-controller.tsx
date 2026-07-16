import { useCallback, useEffect, useState } from "react";
import {
  fetchPlatformRuntimeConfig,
  type PlatformRuntimeSnapshot,
} from "./platform-control.api";

export type PlatformControlRuntimeState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly snapshot: PlatformRuntimeSnapshot }
  | { readonly kind: "error"; readonly message: string };

function resolveMsg(err: unknown): string {
  const e = err as { kind?: string; status?: number; code?: string; message?: string } | undefined;
  if (e?.kind === "network") return "تعذر الوصول إلى platform-control";
  if (e?.status === 401) return "الجلسة منتهية";
  if (e?.status === 403) return "صلاحية platform:read مطلوبة";
  return e?.message ?? "تعذر تحميل حالة المنصة";
}

export function usePlatformControlRuntimeController(authKind: string): {
  readonly state: PlatformControlRuntimeState;
  readonly reload: () => Promise<void>;
} {
  const [state, setState] = useState<PlatformControlRuntimeState>({ kind: "idle" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const snapshot = await fetchPlatformRuntimeConfig();
      setState({ kind: "success", snapshot });
    } catch (err) {
      setState({ kind: "error", message: resolveMsg(err) });
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") {
      setState({ kind: "idle" });
      return;
    }
    void load();
  }, [authKind, load]);

  return { state, reload: load };
}
