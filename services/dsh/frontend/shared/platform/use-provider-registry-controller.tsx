import { useCallback, useEffect, useState } from "react";
import {
  getProviderHealth,
  listProviders,
  type ExternalProvider,
  type ExternalProviderHealthItem,
} from "./providers.api";
import {
  PROVIDER_AFFECTED_SURFACES,
  WLT_BOUNDARY_PROVIDER_KINDS,
} from "./platform-provider.policy";
import type { ProviderVisibleFields } from "./platform-provider-visibility.policy";

export type ProviderRegistryItem = ProviderVisibleFields & {
  readonly providerId: string;
  readonly code: string;
  readonly active: boolean;
  readonly healthMessage: string | null;
};

export type ProviderRegistryState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly items: readonly ProviderRegistryItem[] }
  | { readonly kind: "error"; readonly message: string };

function resolveProviderError(error: unknown): string {
  const candidate = error as { status?: number; code?: string; message?: string } | undefined;
  if (candidate?.status === 401) return "PROVIDERS_UNAUTHENTICATED";
  if (candidate?.status === 403) return "PROVIDERS_PERMISSION_REQUIRED";
  if (candidate?.code) return candidate.code;
  return candidate?.message ?? "PROVIDERS_RUNTIME_UNAVAILABLE";
}

function stringParameter(parameters: ExternalProvider["parameters"], key: string): string | null {
  if (!parameters || typeof parameters !== "object") return null;
  const value = (parameters as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isWltBoundaryProvider(kind: string): boolean {
  return WLT_BOUNDARY_PROVIDER_KINDS.some(
    (boundaryKind) => boundaryKind === kind || (boundaryKind === "payments" && kind === "payment"),
  );
}

function toRegistryItem(
  provider: ExternalProvider,
  health: readonly ExternalProviderHealthItem[],
): ProviderRegistryItem {
  const healthItem = health.find((item) => item.kind === provider.kind);
  const healthStatus = healthItem?.status ?? "unknown";

  return {
    providerId: provider.providerId,
    code: provider.code,
    active: provider.active,
    id: provider.providerId,
    kind: provider.kind,
    label: provider.kind === "maps" ? "خرائط قوقل وسحابة الموقع (Google Maps)" : provider.code,
    selectedProvider: provider.code,
    fallbackProvider: null,
    environment: stringParameter(provider.parameters, "environment") ?? "unknown",
    status: provider.active ? "active" : "inactive",
    credentialVisibility: "backend_secret_only",
    maskedCredential: null,
    lastHealthStatus: healthStatus,
    lastHealthCheckedAt: healthItem?.checkedAt ?? null,
    affectedSurfaces: PROVIDER_AFFECTED_SURFACES[
      provider.kind as keyof typeof PROVIDER_AFFECTED_SURFACES
    ] ?? [],
    wltBoundary: isWltBoundaryProvider(provider.kind),
    auditRequired: false,
    rollbackTarget: null,
    publicRuntimeConfig: {},
    healthMessage: healthItem?.message ?? null,
  };
}

export function useProviderRegistryController(enabled: boolean): {
  readonly state: ProviderRegistryState;
  readonly reload: () => Promise<void>;
} {
  const [state, setState] = useState<ProviderRegistryState>({ kind: "idle" });

  const load = useCallback(async () => {
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }

    setState({ kind: "loading" });
    try {
      const [providers, healthResponse] = await Promise.all([
        listProviders(),
        getProviderHealth(),
      ]);
      setState({
        kind: "success",
        items: providers.map((provider) => toRegistryItem(provider, healthResponse.providers ?? [])),
      });
    } catch (error) {
      setState({ kind: "error", message: resolveProviderError(error) });
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
