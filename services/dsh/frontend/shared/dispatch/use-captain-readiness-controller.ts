import React from "react";
import { fetchOwnCaptainReadiness } from "./dispatch.api";
import type { DshCaptainReadiness } from "./dispatch.types";

export type CaptainReadinessState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly readiness: DshCaptainReadiness }
  | { readonly kind: "error" };

export function useCaptainReadinessController(enabled: boolean) {
  const [state, setState] = React.useState<CaptainReadinessState>({ kind: "idle" });

  const load = React.useCallback(async () => {
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const readiness = await fetchOwnCaptainReadiness();
      setState({ kind: "ready", readiness });
    } catch {
      setState({ kind: "error" });
    }
  }, [enabled]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { state, retry: load } as const;
}
