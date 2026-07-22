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

export type DshAnalyticsMetadata = {
  sourceSystem: "DSH";
  readOnly: true;
  generatedAt: string;
  windowFrom: string;
  windowTo: string;
  freshnessSeconds: number;
  lineage: readonly string[];
};

export type DshPreparationSlaAnalytics = {
  totalMeasured: number;
  withinSla: number;
  breachedSla: number;
  openPastEstimate: number;
  averagePreparationMinutes: number;
  metadata: DshAnalyticsMetadata;
};

export type DshCaptainPerformanceRow = {
  captainId: string;
  assignments: number;
  accepted: number;
  declined: number;
  completed: number;
  acceptanceRate: number;
  completionRate: number;
  averageResponseSeconds: number;
};

export type DshCaptainPerformanceAnalytics = {
  rows: readonly DshCaptainPerformanceRow[];
  metadata: DshAnalyticsMetadata;
};

export type DshFieldPerformanceRow = {
  fieldAgentId: string;
  visits: number;
  completed: number;
  escalated: number;
  completionRate: number;
  averageVisitMinutes: number;
};

export type DshFieldPerformanceAnalytics = {
  rows: readonly DshFieldPerformanceRow[];
  metadata: DshAnalyticsMetadata;
};

export type DshOperationalAnalyticsRecord = {
  id: string;
  kind: "order";
  status: string;
  storeId: string;
  createdAt: string;
  updatedAt: string;
  detailUrl: string;
};

export type DshOperationalAnalyticsDrilldown = {
  records: readonly DshOperationalAnalyticsRecord[];
  metadata: DshAnalyticsMetadata;
};

export type WltAnalyticsAccountBalance = {
  accountType: string;
  category: string;
  normalBalanceSide: string;
  currency: string;
  balanceMinorUnits: number;
};

export type WltAnalyticsCurrencySummary = {
  currency: string;
  assetsMinorUnits: number;
  liabilitiesMinorUnits: number;
  revenueMinorUnits: number;
  expensesMinorUnits: number;
  netPositionMinorUnits: number;
  accounts: readonly WltAnalyticsAccountBalance[];
};

export type WltAnalyticsFinancialSnapshot = {
  owner: "WLT";
  readOnly: true;
  readState: "available" | "unavailable";
  generatedAt: string;
  summary: {
    currencies: readonly WltAnalyticsCurrencySummary[];
    dataCompleteness: readonly string[];
  } | null;
};
