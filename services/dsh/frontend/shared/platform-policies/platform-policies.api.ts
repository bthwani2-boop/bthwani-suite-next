import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshRawHttpClient } from "../_kernel/dsh-http-request";
import type { DshZone, DshSlaRule, DshCapacityConfig, DshZoneServiceability } from "./platform-policies.types";

const { req } = createDshRawHttpClient(resolveDshApiBaseUrl(), "pp");

export const fetchZones = () => req<{ zones: DshZone[] }>("/dsh/operator/platform/zones");
export const createZone = (body: { name: string; cityCode: string; description?: string }) =>
  req<{ zone: DshZone }>("/dsh/operator/platform/zones", { method: "POST", body: JSON.stringify(body) });
export const updateZone = (id: string, body: { isActive: boolean; name?: string; description?: string }) =>
  req<{ zone: DshZone }>(`/dsh/operator/platform/zones/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const fetchSlaRules = (zoneId?: string) =>
  req<{ slaRules: DshSlaRule[] }>(`/dsh/operator/platform/sla-rules${zoneId ? `?zoneId=${zoneId}` : ""}`);
export const upsertSlaRule = (body: { zoneId: string; category: string; maxPrepMins: number; maxDeliveryMins: number }) =>
  req<{ slaRule: DshSlaRule }>("/dsh/operator/platform/sla-rules", { method: "PUT", body: JSON.stringify(body) });

export const fetchCapacityConfig = (zoneId: string) =>
  req<{ capacityConfig: DshCapacityConfig }>(`/dsh/operator/platform/capacity?zoneId=${zoneId}`);
export const upsertCapacityConfig = (body: { zoneId: string; maxConcurrentOrders: number; maxCaptainsOnline: number; throttleThreshold: number }) =>
  req<{ capacityConfig: DshCapacityConfig }>("/dsh/operator/platform/capacity", { method: "PUT", body: JSON.stringify(body) });

export const fetchZoneServiceability = (zoneId: string) =>
  req<DshZoneServiceability>(`/dsh/operator/platform/serviceability/${zoneId}`);
