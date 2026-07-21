import { useCallback, useEffect, useState } from "react";
import {
  fetchEffectiveRuntimeConfig,
  fetchPlatformAuditEvents,
  fetchPlatformChangeSets,
  fetchPlatformFeatureFlags,
  fetchPlatformHealth,
  fetchPlatformRuntimeConfig,
  fetchPlatformServices,
  fetchPlatformVariables,
  type PlatformAuditEvent,
  type PlatformChangeSet,
  type PlatformEffectiveRuntimeConfig,
  type PlatformFeatureFlag,
  type PlatformHealthSnapshot,
  type PlatformRuntimeSnapshot,
  type PlatformServicePosture,
  type PlatformVariable,
} from "./platform-control.api";

export type PlatformControlResource =
  | "effective-config"
  | "variables"
  | "feature-flags"
  | "services"
  | "health"
  | "audit-events"
  | "change-sets";

export type PlatformControlResourceFailure = {
  readonly resource: PlatformControlResource;
  readonly message: string;
};

export type PlatformControlReadModel = {
  readonly snapshot: PlatformRuntimeSnapshot;
  readonly effectiveConfig: PlatformEffectiveRuntimeConfig | null;
  readonly variables: readonly PlatformVariable[];
  readonly featureFlags: readonly PlatformFeatureFlag[];
  readonly services: readonly PlatformServicePosture[];
  readonly health: PlatformHealthSnapshot | null;
  readonly auditEvents: readonly PlatformAuditEvent[];
  readonly changeSets: readonly PlatformChangeSet[];
  readonly unavailable: readonly PlatformControlResourceFailure[];
  readonly restricted: readonly PlatformControlResource[];
};

export type PlatformControlRuntimeState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: PlatformControlReadModel }
  | { readonly kind: "error"; readonly message: string };

export type PlatformControlReadCapabilities = {
  readonly enabled: boolean;
  readonly health: boolean;
  readonly audit: boolean;
};

type OptionalRead<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

function resolveMsg(err: unknown): string {
  const e = err as { kind?: string; status?: number; code?: string; message?: string } | undefined;
  if (e?.kind === "network") return "تعذر الوصول إلى platform-control";
  if (e?.status === 401) return "الجلسة منتهية";
  if (e?.status === 403) return "الصلاحية السيادية المطلوبة غير متاحة";
  if (e?.code) return e.code;
  return e?.message ?? "تعذر تحميل حالة المنصة";
}

async function optionalRead<T>(read: () => Promise<T>): Promise<OptionalRead<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    return { ok: false, message: resolveMsg(error) };
  }
}

export function usePlatformControlRuntimeController(
  capabilities: PlatformControlReadCapabilities,
): {
  readonly state: PlatformControlRuntimeState;
  readonly reload: () => Promise<void>;
} {
  const [state, setState] = useState<PlatformControlRuntimeState>({ kind: "idle" });

  const load = useCallback(async () => {
    if (!capabilities.enabled) {
      setState({ kind: "idle" });
      return;
    }

    setState({ kind: "loading" });
    try {
      const snapshot = await fetchPlatformRuntimeConfig();
      const [
        effectiveConfigResult,
        variablesResult,
        featureFlagsResult,
        servicesResult,
        healthResult,
        auditResult,
        changeSetsResult,
      ] = await Promise.all([
        optionalRead(fetchEffectiveRuntimeConfig),
        optionalRead(fetchPlatformVariables),
        optionalRead(fetchPlatformFeatureFlags),
        optionalRead(fetchPlatformServices),
        capabilities.health
          ? optionalRead(fetchPlatformHealth)
          : Promise.resolve<OptionalRead<PlatformHealthSnapshot>>({
              ok: false,
              message: "PLATFORM_HEALTH_PERMISSION_REQUIRED",
            }),
        capabilities.audit
          ? optionalRead(fetchPlatformAuditEvents)
          : Promise.resolve<OptionalRead<{ events: PlatformAuditEvent[] }>>({
              ok: false,
              message: "PLATFORM_AUDIT_PERMISSION_REQUIRED",
            }),
        optionalRead(fetchPlatformChangeSets),
      ]);

      const unavailable: PlatformControlResourceFailure[] = [];
      const restricted: PlatformControlResource[] = [];

      if (!effectiveConfigResult.ok) {
        unavailable.push({ resource: "effective-config", message: effectiveConfigResult.message });
      }
      if (!variablesResult.ok) {
        unavailable.push({ resource: "variables", message: variablesResult.message });
      }
      if (!featureFlagsResult.ok) {
        unavailable.push({ resource: "feature-flags", message: featureFlagsResult.message });
      }
      if (!servicesResult.ok) {
        unavailable.push({ resource: "services", message: servicesResult.message });
      }
      if (!capabilities.health) {
        restricted.push("health");
      } else if (!healthResult.ok) {
        unavailable.push({ resource: "health", message: healthResult.message });
      }
      if (!capabilities.audit) {
        restricted.push("audit-events");
      } else if (!auditResult.ok) {
        unavailable.push({ resource: "audit-events", message: auditResult.message });
      }
      if (!changeSetsResult.ok) {
        unavailable.push({ resource: "change-sets", message: changeSetsResult.message });
      }

      setState({
        kind: "success",
        data: {
          snapshot,
          effectiveConfig: effectiveConfigResult.ok ? effectiveConfigResult.value : null,
          variables: variablesResult.ok ? variablesResult.value.variables : [],
          featureFlags: featureFlagsResult.ok ? featureFlagsResult.value.flags : [],
          services: servicesResult.ok ? servicesResult.value.services : [],
          health: capabilities.health && healthResult.ok ? healthResult.value : null,
          auditEvents: capabilities.audit && auditResult.ok ? auditResult.value.events : [],
          changeSets: changeSetsResult.ok ? changeSetsResult.value.changeSets : [],
          unavailable,
          restricted,
        },
      });
    } catch (error) {
      setState({ kind: "error", message: resolveMsg(error) });
    }
  }, [capabilities.audit, capabilities.enabled, capabilities.health]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
