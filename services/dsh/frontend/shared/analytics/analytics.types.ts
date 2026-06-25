export type DshAnalyticsPeriod = "today" | "week" | "month";

export type DshPlatformKpis = {
  readonly totalOrders: number;
  readonly deliveredOrders: number;
  readonly cancelledOrders: number;
  readonly activeStores: number;
  readonly openTickets: number;
  readonly fieldVisitsCompleted: number;
  readonly openEscalations: number;
  readonly openIncidents: number;
  readonly period: string;
  readonly generatedAt: string;
};

export type DshOrderStatusCount = {
  readonly status: string;
  readonly count: number;
};

export type DshOrderAnalytics = {
  readonly totalOrders: number;
  readonly byStatus: readonly DshOrderStatusCount[];
  readonly period: string;
  readonly generatedAt: string;
};

export type DshDeliveryAnalytics = {
  readonly totalAssignments: number;
  readonly acceptedAssignments: number;
  readonly completedAssignments: number;
  readonly declinedAssignments: number;
  readonly period: string;
  readonly generatedAt: string;
};

export type DshTicketCategoryCount = {
  readonly category: string;
  readonly count: number;
};

export type DshSupportAnalytics = {
  readonly totalTickets: number;
  readonly openTickets: number;
  readonly resolvedTickets: number;
  readonly byCategory: readonly DshTicketCategoryCount[];
  readonly period: string;
  readonly generatedAt: string;
};

export type DshStoreAnalytics = {
  readonly totalStores: number;
  readonly activeStores: number;
  readonly suspendedStores: number;
  readonly pendingReadiness: number;
  readonly readinessComplete: number;
  readonly generatedAt: string;
};

export type DshPartnerPerformance = {
  readonly storeId: string;
  readonly totalOrders: number;
  readonly acceptedOrders: number;
  readonly rejectedOrders: number;
  readonly period: string;
  readonly generatedAt: string;
};
