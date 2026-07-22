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
  DshPreparationSlaAnalytics,
  DshCaptainPerformanceAnalytics,
  DshFieldPerformanceAnalytics,
  DshOperationalAnalyticsDrilldown,
  WltAnalyticsFinancialSnapshot,
} from "./analytics.types";

const baseUrl = resolveDshApiBaseUrl();
const { request: rawRequest } = createDshHttpClient(baseUrl, "analytics", 12000);
async function request<T>(path: string): Promise<T> {
  return rawRequest<T>(path);
}

function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
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

export async function fetchPreparationSlaAnalytics(
  period: DshAnalyticsPeriod,
  storeId?: string,
): Promise<DshPreparationSlaAnalytics> {
  return request<DshPreparationSlaAnalytics>(
    `/dsh/operator/analytics/preparation-sla${queryString({ period, storeId })}`,
  );
}

export async function fetchCaptainPerformanceAnalytics(
  period: DshAnalyticsPeriod,
  limit = 25,
): Promise<DshCaptainPerformanceAnalytics> {
  return request<DshCaptainPerformanceAnalytics>(
    `/dsh/operator/analytics/captains${queryString({ period, limit })}`,
  );
}

export async function fetchFieldPerformanceAnalytics(
  period: DshAnalyticsPeriod,
  limit = 25,
): Promise<DshFieldPerformanceAnalytics> {
  return request<DshFieldPerformanceAnalytics>(
    `/dsh/operator/analytics/field${queryString({ period, limit })}`,
  );
}

export async function fetchOrderAnalyticsDrilldown(
  period: DshAnalyticsPeriod,
  filters: { storeId?: string; status?: string; limit?: number } = {},
): Promise<DshOperationalAnalyticsDrilldown> {
  return request<DshOperationalAnalyticsDrilldown>(
    `/dsh/operator/analytics/drill-down/orders${queryString({
      period,
      storeId: filters.storeId,
      status: filters.status,
      limit: filters.limit ?? 25,
    })}`,
  );
}

export async function fetchFinancialAnalyticsSnapshot(): Promise<WltAnalyticsFinancialSnapshot> {
  const envelope = await request<{ financialSnapshot: WltAnalyticsFinancialSnapshot }>(
    "/dsh/operator/analytics/financial-snapshot",
  );
  return envelope.financialSnapshot;
}

export function buildOperationalAnalyticsExportUrl(period: DshAnalyticsPeriod): string {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return `${normalizedBase}/dsh/operator/analytics/export.csv?period=${encodeURIComponent(period)}`;
}
