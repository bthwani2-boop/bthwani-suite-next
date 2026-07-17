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
export type CreatePlatformChangeSetInput = components["schemas"]["CreatePlatformChangeSetInput"];
export type RejectPlatformChangeSetInput = components["schemas"]["RejectPlatformChangeSetInput"];

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

export function fetchPlatformVariable(key: string, scopeType = "global", scopeId = ""): Promise<{ variable: PlatformVariable }> {
  const query = new URLSearchParams({ scopeType, scopeId });
  return request<{ variable: PlatformVariable }>(
    `/platform/v1/variables/${encodeURIComponent(key)}?${query.toString()}`,
    { method: "GET" },
  );
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

export function fetchPlatformChangeSet(id: string): Promise<{ changeSet: PlatformChangeSet }> {
  return request<{ changeSet: PlatformChangeSet }>(`/platform/v1/change-sets/${encodeURIComponent(id)}`, { method: "GET" });
}

export function createPlatformChangeSet(input: CreatePlatformChangeSetInput): Promise<{ changeSet: PlatformChangeSet }> {
  return request<{ changeSet: PlatformChangeSet }>("/platform/v1/change-sets", { method: "POST", body: input });
}

function transitionPlatformChangeSet(
  id: string,
  transition: "validate" | "submit" | "approve" | "apply" | "rollback",
): Promise<{ changeSet: PlatformChangeSet }> {
  return request<{ changeSet: PlatformChangeSet }>(
    `/platform/v1/change-sets/${encodeURIComponent(id)}/${transition}`,
    { method: "POST" },
  );
}

export function validatePlatformChangeSet(id: string): Promise<{ changeSet: PlatformChangeSet }> {
  return transitionPlatformChangeSet(id, "validate");
}

export function submitPlatformChangeSet(id: string): Promise<{ changeSet: PlatformChangeSet }> {
  return transitionPlatformChangeSet(id, "submit");
}

export function approvePlatformChangeSet(id: string): Promise<{ changeSet: PlatformChangeSet }> {
  return transitionPlatformChangeSet(id, "approve");
}

export function applyPlatformChangeSet(id: string): Promise<{ changeSet: PlatformChangeSet }> {
  return transitionPlatformChangeSet(id, "apply");
}

export function rollbackPlatformChangeSet(id: string): Promise<{ changeSet: PlatformChangeSet }> {
  return transitionPlatformChangeSet(id, "rollback");
}

export function rejectPlatformChangeSet(
  id: string,
  input: RejectPlatformChangeSetInput,
): Promise<{ changeSet: PlatformChangeSet }> {
  return request<{ changeSet: PlatformChangeSet }>(
    `/platform/v1/change-sets/${encodeURIComponent(id)}/reject`,
    { method: "POST", body: input },
  );
}
