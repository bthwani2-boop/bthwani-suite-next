import type { PartnerOfferRecord, PartnerOfferStatus } from "../partner/dsh-partner-offer-types";
import type {
  CampaignRecord,
  CampaignStatus,
  CampaignAudience,
  CampaignPlacement,
  CampaignTargetType,
} from "./marketing.types";

export type CommercialLifecycleStatus =
  | "inbound"
  | "review"
  | "marketing-ready"
  | "published"
  | "paused"
  | "archived"
  | "draft"
  | "rejected";

export type PartnerOffer = {
  readonly id: string;
  readonly title: string;
  readonly partnerName: string;
  readonly storeId: string;
  readonly storeLabel: string;
  readonly productId?: string;
  readonly productLabel?: string;
  readonly category: string;
  readonly offerKind: string;
  readonly status: CommercialLifecycleStatus;
  readonly source: string;
  readonly target: "product" | "store" | "category";
  readonly valueLabel: string;
  readonly displayBadge: string;
  readonly rejectionReason?: string;
  readonly linkedCampaignId?: string;
  readonly activeFromDate?: string;
  readonly activeToDate?: string;
  readonly marginRiskNote?: string;
  readonly placement: "store-card";
  readonly measurement: { readonly impressions: number; readonly clicks: number };
};

export type CommercialCampaign = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly status: CommercialLifecycleStatus;
  readonly priority: string;
  readonly goal: string;
  readonly audience: "customer" | "operations" | "all";
  readonly placements: readonly string[];
  readonly channels: readonly string[];
  readonly targetType: string;
  readonly targetId?: string;
  readonly linkedOfferId?: string;
  readonly linkedBannerId?: string;
  readonly linkedVideoId?: string;
  readonly linkedLoyaltyBenefitId?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly measurement: { readonly impressions: number; readonly clicks: number };
};

export type SubscriptionPlan = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly tier?: string;
  readonly weeklyFee?: number;
  readonly monthlyFee?: number;
  readonly features: readonly string[];
};

export type CommercialEntitlement = {
  readonly type: string;
  readonly status: string;
};

export type CommercialSourceMapEntry = {
  readonly sourceOwner: "partner-offer" | "campaign" | "subscription" | "loyalty";
  readonly sourceRecordId: string;
  readonly lifecycleStatus: CommercialLifecycleStatus;
  readonly conflictSeverity: "none" | "warning" | "blocker";
  readonly conflictReason?: string;
};

export type CommercialSourceMap = {
  readonly [key: string]: CommercialSourceMapEntry;
};

export type CommercialConflict = {
  readonly conflictId: string;
  readonly severity: "none" | "warning" | "blocker";
  readonly reason: string;
  readonly sourceA: string;
};

export type CommercialBadge = {
  readonly label: string;
  readonly source: "partner" | "campaign" | "subscription" | "loyalty";
};

export type CommercialProjection = {
  readonly storeId?: string;
  readonly badges: readonly CommercialBadge[];
  readonly offerLabel?: string;
  readonly hasCouponAvailable: boolean;
  readonly deliveryFeeLabel?: string;
  readonly hasBthwaniPro: boolean;
  readonly subscriptionChips: readonly string[];
  readonly hasLoyaltyReward: boolean;
  readonly sourceMap: CommercialSourceMap;
  readonly conflicts: readonly CommercialConflict[];
  readonly isClientVisible: boolean;
};

export type SubscriptionClientCard = {
  readonly id: string;
  readonly title: string;
  readonly price: string;
  readonly cadence: string;
  readonly note: string;
  readonly highlight: string;
  readonly featured: boolean;
  readonly current: boolean;
};

export type LoyaltyReward = {
  readonly id: string;
  readonly title: string;
  readonly pointsCost: number;
  readonly status: string;
  readonly description?: string;
};

export type LoyaltyTier = {
  readonly name: string;
  readonly minimumPoints: number;
  readonly benefits: ReadonlyArray<{ readonly label: string; readonly description: string }>;
};

export type LoyaltyClientBenefits = {
  readonly title: string;
  readonly subtitle: string;
  readonly note: string;
  readonly metrics: ReadonlyArray<{ readonly label: string; readonly value: string; readonly helperText: string; readonly tone: string }>;
  readonly sections: ReadonlyArray<{ readonly title: string; readonly subtitle: string; readonly badgeLabel: string; readonly tone: string; readonly items: ReadonlyArray<{ readonly label: string; readonly value: string; readonly helperText: string; readonly tone: string }> }>;
};

export type LoyaltyClientSection = {
  readonly title: string;
  readonly subtitle: string;
  readonly badgeLabel: string;
  readonly tone: "info" | "success" | "warning" | "danger" | "brand";
  readonly items: ReadonlyArray<{ readonly label: string; readonly value: string; readonly helperText: string; readonly tone: "info" | "success" | "warning" | "danger" | "brand" }>;
};

// --- Mappers ---

const ALL_LIFECYCLE_STATUSES: readonly CommercialLifecycleStatus[] = [
  "inbound", "review", "marketing-ready", "published", "paused", "archived", "draft", "rejected"
];

export function normalizeCommercialStatus(status: string): CommercialLifecycleStatus | undefined {
  return ALL_LIFECYCLE_STATUSES.includes(status as CommercialLifecycleStatus)
    ? (status as CommercialLifecycleStatus)
    : undefined;
}

export function isClientVisibleStatus(status: CommercialLifecycleStatus): boolean {
  const s = status as string;
  return s === "published" || s === "active";
}

export function evaluateCommercialConflicts(sourceMap: CommercialSourceMap): CommercialConflict[] {
  return Object.entries(sourceMap)
    .filter(([, entry]) => entry.conflictSeverity !== "none")
    .map(([key, entry]) => ({
      conflictId: key,
      severity: entry.conflictSeverity,
      reason: entry.conflictReason ?? key,
      sourceA: entry.sourceRecordId,
    }));
}

export function buildCommercialProjection(input: CommercialProjectionInput): CommercialProjection {
  const badges: CommercialBadge[] = [];
  const sourceMap: CommercialSourceMap = input.sourceMap ?? {};

  const visibleOffers = (input.partnerOffers ?? []).filter(o => isClientVisibleStatus(o.status));
  visibleOffers.slice(0, 2).forEach(o => badges.push({ label: o.displayBadge, source: "partner" }));

  (input.campaigns ?? [])
    .filter(c => isClientVisibleStatus(c.status) && c.placements?.includes("store-card"))
    .slice(0, 1)
    .forEach(c => badges.push({ label: `حملة: ${c.title}`, source: "campaign" }));

  const hasPro = (input.subscriptionPlans ?? []).some(s => s.id === "sub-pro" && isClientVisibleStatus(s.status as any));
  if (hasPro) badges.push({ label: "بثواني برو نشط", source: "subscription" });

  const hasReward = (input.entitlements ?? []).some(e => e.type === "loyalty-reward" && e.status === "active");
  if (hasReward) badges.push({ label: "مكافأة برنامج الولاء", source: "loyalty" });

  const conflicts = evaluateCommercialConflicts(sourceMap);
  const hasBlocker = conflicts.some(c => c.severity === "blocker");

  const projection: any = {
    badges: hasBlocker ? [] : badges,
    offerLabel: visibleOffers[0]?.displayBadge,
    hasCouponAvailable: visibleOffers.some(o => o.offerKind === "coupon"),
    deliveryFeeLabel: visibleOffers.some(o => o.offerKind === "free-delivery") ? "توصيل مجاني" : undefined,
    hasBthwaniPro: hasPro,
    subscriptionChips: hasPro ? ["بثواني برو نشط", "توصيل سريع مجاني"] : [],
    hasLoyaltyReward: hasReward,
    sourceMap,
    conflicts,
    isClientVisible: !hasBlocker && badges.length > 0,
  };

  if (input.storeId !== undefined) {
    projection.storeId = input.storeId;
  }

  return projection as CommercialProjection;
}

export type CommercialProjectionInput = {
  storeId?: string;
  partnerOffers?: PartnerOffer[];
  campaigns?: CommercialCampaign[];
  subscriptionPlans?: SubscriptionPlan[];
  entitlements?: CommercialEntitlement[];
  sourceMap?: CommercialSourceMap;
};
