import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshZone, DshSlaRule, DshCapacityConfig, DshZoneServiceability } from "./platform-policies.types";

const base = resolveDshApiBaseUrl();
let c = 0;
const corrId = () => `pp-${Date.now()}-${++c}`;

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  const res = await fetch(new URL(path, base), {
    ...init,
    headers: {
      Accept: "application/json", "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, "X-Correlation-ID": corrId(),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw { kind: "http", status: res.status };
  return res.json() as Promise<T>;
}

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
