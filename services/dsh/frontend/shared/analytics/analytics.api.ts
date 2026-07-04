import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshAnalyticsPeriod,
  DshPlatformKpis,
  DshOrderAnalytics,
  DshDeliveryAnalytics,
  DshSupportAnalytics,
  DshStoreAnalytics,
  DshPartnerPerformance,
} from "./analytics.types";

const { request: rawRequest } = createDshHttpClient(resolveDshApiBaseUrl(), "analytics", 12000);
async function request<T>(path: string): Promise<T> {
  return rawRequest<T>(path);
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
