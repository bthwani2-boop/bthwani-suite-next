import type { DshSupportAnalytics } from "../analytics/analytics.types";

export type MarketingMainTabId =
  | "visibility-gates"
  | "smart-bar"
  | "banners-carousel"
  | "homepage-promos"
  | "campaigns"
  | "partner-offers"
  | "loyalty"
  | "subscriptions"
  | "signals-measurement";

export type MarketingMainTabMeta = {
  readonly id: MarketingMainTabId;
  readonly label: string;
};

export const MARKETING_MAIN_TABS: readonly MarketingMainTabMeta[] = [
  { id: "visibility-gates", label: "بوابات الظهور" },
  { id: "smart-bar", label: "الشريط الذكي" },
  { id: "banners-carousel", label: "البنرات والكاروسيل" },
  { id: "homepage-promos", label: "بروموهات الرئيسية" },
  { id: "campaigns", label: "الحملات" },
  { id: "partner-offers", label: "عروض الشركاء" },
  { id: "loyalty", label: "الولاء" },
  { id: "subscriptions", label: "الاشتراكات" },
  { id: "signals-measurement", label: "الإشارات والقياس" },
] as const;

export type MarketingKpiMetrics = {
  readonly activeStoresRatio: string;
  readonly deliveredOrders: number;
  readonly openTickets: number;
  readonly openEscalations: number;
  readonly isBackedByApi: boolean;
  readonly disclosureReason?: string;
};

export function buildMarketingKpiMetrics(): MarketingKpiMetrics {
  return {
    activeStoresRatio: "—",
    deliveredOrders: 0,
    openTickets: 0,
    openEscalations: 0,
    isBackedByApi: false,
    disclosureReason: "تعذر تحميل مؤشرات DSH التشغيلية.",
  };
}

export type GovernanceBridgeId = "partners" | "catalogs" | "support";

export type GovernanceBridgeMeta = {
  readonly id: GovernanceBridgeId;
  readonly label: string;
  readonly targetRoute: string;
};

export const GOVERNANCE_BRIDGES: readonly GovernanceBridgeMeta[] = [
  { id: "partners", label: "الشركاء", targetRoute: "/dsh/partners" },
  { id: "catalogs", label: "الكتالوج", targetRoute: "/dsh/catalogs" },
  { id: "support", label: "الدعم", targetRoute: "/dsh/support" },
] as const;

export type DeliverySignalCardViewModel = {
  readonly id: string;
  readonly title: string;
  readonly statusLabel: string;
  readonly source: string;
  readonly intakeId: string;
  readonly generatedAt: string;
  readonly requiresAttention: boolean;
};

export function buildDeliverySignalCards(
  analytics: DshSupportAnalytics,
): readonly DeliverySignalCardViewModel[] {
  return analytics.byCategory.map((item) => ({
    id: `support-${item.category}`,
    title: `إشارة دعم تشغيلية: ${item.category}`,
    statusLabel: `${item.count.toLocaleString("ar")} تذكرة`,
    source: "dsh/operator/analytics/support",
    intakeId: item.category,
    generatedAt: analytics.generatedAt,
    requiresAttention: item.count > 0,
  }));
}
