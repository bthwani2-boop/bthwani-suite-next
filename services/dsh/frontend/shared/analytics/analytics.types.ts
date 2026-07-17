import type { components } from "../../../clients/generated/dsh-api";

export type DshAnalyticsPeriod = "today" | "week" | "month";

export type DshPlatformKpis = components["schemas"]["DshPlatformKpisResponse"];
export type DshOrderStatusCount = components["schemas"]["DshOrderStatusCount"];
export type DshOrderAnalytics = components["schemas"]["DshOrderAnalyticsResponse"];
export type DshDeliveryAnalytics = components["schemas"]["DshDeliveryAnalyticsResponse"];
export type DshTicketCategoryCount = components["schemas"]["DshTicketCategoryCount"];
export type DshSupportAnalytics = components["schemas"]["DshSupportAnalyticsResponse"];
export type DshStoreAnalytics = components["schemas"]["DshStoreAnalyticsResponse"];
export type DshPartnerPerformance = components["schemas"]["DshPartnerPerformanceResponse"];
