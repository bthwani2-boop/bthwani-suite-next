import type { DshPlatformKpis, DshOrderAnalytics, DshDeliveryAnalytics, DshPartnerPerformance, DshStoreAnalytics } from "./analytics.types";

export type DshPlatformKpisViewModel = {
  readonly fulfillmentRate: string;
  readonly cancellationRate: string;
  readonly healthTone: "success" | "warning" | "danger";
  readonly platformLabel: string;
};

export function buildPlatformKpisViewModel(kpis: DshPlatformKpis): DshPlatformKpisViewModel {
  const total = kpis.totalOrders;
  const fulfillmentRate = total > 0 ? Math.round((kpis.deliveredOrders / total) * 100) : 0;
  const cancellationRate = total > 0 ? Math.round((kpis.cancelledOrders / total) * 100) : 0;
  const healthTone =
    kpis.openIncidents > 0 ? "danger"
    : fulfillmentRate < 70 ? "warning"
    : "success";
  return {
    fulfillmentRate: `${fulfillmentRate}%`,
    cancellationRate: `${cancellationRate}%`,
    healthTone,
    platformLabel: `${kpis.activeStores} متجر نشط`,
  };
}

export type DshOrderAnalyticsViewModel = {
  readonly statusRows: readonly { readonly label: string; readonly count: number; readonly tone: "success" | "warning" | "danger" | "info" }[];
  readonly fulfillmentRate: string;
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  store_accepted: "قبل المتجر",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  driver_assigned: "كابتن مسند",
  driver_arrived_store: "الكابتن في المتجر",
  picked_up: "تم الاستلام",
  arrived_customer: "وصل للعميل",
  delivered: "تم التوصيل",
  cancelled: "ملغى",
};

const STATUS_TONES: Record<string, "success" | "warning" | "danger" | "info"> = {
  delivered: "success",
  cancelled: "danger",
  pending: "warning",
  store_accepted: "info",
  preparing: "info",
  ready_for_pickup: "info",
};

export function buildOrderAnalyticsViewModel(data: DshOrderAnalytics): DshOrderAnalyticsViewModel {
  const delivered = data.byStatus.find((s) => s.status === "delivered")?.count ?? 0;
  const fulfillmentRate = data.totalOrders > 0 ? `${Math.round((delivered / data.totalOrders) * 100)}%` : "—";
  return {
    statusRows: data.byStatus.map((s) => ({
      label: ORDER_STATUS_LABELS[s.status] ?? s.status,
      count: s.count,
      tone: STATUS_TONES[s.status] ?? "info",
    })),
    fulfillmentRate,
  };
}

export type DshDeliveryAnalyticsViewModel = {
  readonly acceptanceRate: string;
  readonly completionRate: string;
  readonly healthTone: "success" | "warning" | "danger";
};

export function buildDeliveryAnalyticsViewModel(data: DshDeliveryAnalytics): DshDeliveryAnalyticsViewModel {
  const acceptanceRate = data.totalAssignments > 0
    ? Math.round((data.acceptedAssignments / data.totalAssignments) * 100)
    : 0;
  const completionRate = data.totalAssignments > 0
    ? Math.round((data.completedAssignments / data.totalAssignments) * 100)
    : 0;
  const healthTone = completionRate >= 80 ? "success" : completionRate >= 60 ? "warning" : "danger";
  return {
    acceptanceRate: `${acceptanceRate}%`,
    completionRate: `${completionRate}%`,
    healthTone,
  };
}

export type DshStoreAnalyticsViewModel = {
  readonly readinessRate: string;
  readonly healthTone: "success" | "warning" | "danger";
};

export function buildStoreAnalyticsViewModel(data: DshStoreAnalytics): DshStoreAnalyticsViewModel {
  const readinessRate = data.totalStores > 0
    ? Math.round((data.readinessComplete / data.totalStores) * 100)
    : 0;
  const healthTone = readinessRate >= 80 ? "success" : readinessRate >= 50 ? "warning" : "danger";
  return {
    readinessRate: `${readinessRate}%`,
    healthTone,
  };
}

export type DshPartnerPerformanceViewModel = {
  readonly acceptanceRate: string;
  readonly rejectionRate: string;
  readonly healthTone: "success" | "warning" | "danger";
};

export function buildPartnerPerformanceViewModel(data: DshPartnerPerformance): DshPartnerPerformanceViewModel {
  const total = data.totalOrders;
  const acceptanceRate = total > 0 ? Math.round((data.acceptedOrders / total) * 100) : 0;
  const rejectionRate = total > 0 ? Math.round((data.rejectedOrders / total) * 100) : 0;
  const healthTone = acceptanceRate >= 90 ? "success" : acceptanceRate >= 70 ? "warning" : "danger";
  return {
    acceptanceRate: `${acceptanceRate}%`,
    rejectionRate: `${rejectionRate}%`,
    healthTone,
  };
}
