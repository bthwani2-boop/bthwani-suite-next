import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolvePlatformControlApiBaseUrl } from "../_kernel/platform-control-api-base-url";
import type { components } from "@bthwani/core-platform-control";

export type PlatformRuntimeSnapshot = components["schemas"]["PlatformRuntimeSnapshot"];
export type PlatformEffectiveRuntimeConfig = components["schemas"]["PlatformEffectiveRuntimeConfig"];
export type PlatformVariable = components["schemas"]["PlatformVariable"];
export type PlatformFeatureFlag = components["schemas"]["PlatformFeatureFlag"];
export type PlatformServicePosture = components["schemas"]["PlatformServicePosture"];
export type PlatformHealthSnapshot = components["schemas"]["PlatformHealthSnapshot"];
export type PlatformAuditEvent = components["schemas"]["PlatformAuditEvent"];
export type PlatformChangeSet = components["schemas"]["PlatformChangeSet"];

const { request } = createDshHttpClient(resolvePlatformControlApiBaseUrl(), "platform-control", 10000);

export function fetchPlatformRuntimeConfig(): Promise<PlatformRuntimeSnapshot> {
  return request<PlatformRuntimeSnapshot>("/platform/v1/runtime-config", { method: "GET" });
}

export function fetchEffectiveRuntimeConfig(): Promise<PlatformEffectiveRuntimeConfig> {
  return request<PlatformEffectiveRuntimeConfig>("/platform/v1/runtime-config/effective", { method: "GET" });
}

export function fetchPlatformVariables(): Promise<{ variables: PlatformVariable[] }> {
  return request<{ variables: PlatformVariable[] }>("/platform/v1/variables", { method: "GET" });
}

export function fetchPlatformFeatureFlags(): Promise<{ flags: PlatformFeatureFlag[] }> {
  return request<{ flags: PlatformFeatureFlag[] }>("/platform/v1/feature-flags", { method: "GET" });
}

export function fetchPlatformServices(): Promise<{ services: PlatformServicePosture[] }> {
  return request<{ services: PlatformServicePosture[] }>("/platform/v1/services", { method: "GET" });
}

export function fetchPlatformHealth(): Promise<PlatformHealthSnapshot> {
  return request<PlatformHealthSnapshot>("/platform/v1/health", { method: "GET" });
}

export function fetchPlatformAuditEvents(): Promise<{ events: PlatformAuditEvent[] }> {
  return request<{ events: PlatformAuditEvent[] }>("/platform/v1/audit-events", { method: "GET" });
}

export function fetchPlatformChangeSets(): Promise<{ changeSets: PlatformChangeSet[] }> {
  return request<{ changeSets: PlatformChangeSet[] }>("/platform/v1/change-sets", { method: "GET" });
}
