import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  DshAnalyticsPeriod,
  DshPlatformKpis,
  DshOrderAnalytics,
  DshDeliveryAnalytics,
  DshSupportAnalytics,
  DshStoreAnalytics,
  DshPartnerPerformance,
} from "./analytics.types";

const baseUrl = resolveDshApiBaseUrl();

let corrCounter = 0;
function corrId() {
  return `analytics-${Date.now()}-${++corrCounter}`;
}

async function request<T>(path: string): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Correlation-ID": corrId(),
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
  }
  if (!response.ok) {
    throw { kind: "http", status: response.status, body: await response.text().catch(() => "") };
  }
  return response.json() as Promise<T>;
}

export async function fetchPlatformKpis(period: DshAnalyticsPeriod = "today"): Promise<DshPlatformKpis> {
  return request<DshPlatformKpis>(`/dsh/operator/analytics/platform?period=${period}`);
}

export async function fetchOrderAnalytics(period: DshAnalyticsPeriod = "today"): Promise<DshOrderAnalytics> {
  return request<DshOrderAnalytics>(`/dsh/operator/analytics/orders?period=${period}`);
}

export async function fetchDeliveryAnalytics(period: DshAnalyticsPeriod = "today"): Promise<DshDeliveryAnalytics> {
  return request<DshDeliveryAnalytics>(`/dsh/operator/analytics/delivery?period=${period}`);
}

export async function fetchSupportAnalytics(period: DshAnalyticsPeriod = "today"): Promise<DshSupportAnalytics> {
  return request<DshSupportAnalytics>(`/dsh/operator/analytics/support?period=${period}`);
}

export async function fetchStoreAnalytics(): Promise<DshStoreAnalytics> {
  return request<DshStoreAnalytics>(`/dsh/operator/analytics/stores`);
}

export async function fetchPartnerPerformance(period: DshAnalyticsPeriod = "today"): Promise<DshPartnerPerformance> {
  return request<DshPartnerPerformance>(`/dsh/partner/analytics/performance?period=${period}`);
}
