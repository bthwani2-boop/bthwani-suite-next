"use client";

import { useEffect, useState } from "react";

export type ControlPanelServiceHealth = "checking" | "healthy" | "unhealthy";

/**
 * Polls DSH's real /dsh/health through the control-panel BFF proxy. Replaces
 * a hardcoded "نشط" label with an actual service-health signal.
 */
export function useControlPanelServiceHealth(pollMs = 30000): ControlPanelServiceHealth {
  const [status, setStatus] = useState<ControlPanelServiceHealth>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check(): Promise<void> {
      try {
        const response = await fetch("/api/dsh/health", { credentials: "same-origin" });
        if (!cancelled) setStatus(response.ok ? "healthy" : "unhealthy");
      } catch {
        if (!cancelled) setStatus("unhealthy");
      }
    }

    void check();
    const interval = setInterval(() => void check(), pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return status;
}
