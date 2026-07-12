"use client";

import { useEffect, useState } from "react";
import { createDshHttpClient } from "../_kernel/dsh-http-request";

export type ControlPanelServiceHealth = "checking" | "healthy" | "unhealthy";

const client = createDshHttpClient("/api/dsh", "health-poll");

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
        await client.request("/dsh/health");
        if (!cancelled) setStatus("healthy");
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
