// Loyalty, subscriptions and client-benefits contracts shared by the control
// panel and app-client. Runtime data comes only from DSH APIs; no seed registry
// or screen fixture is authoritative.

export type LoyaltyTierStatus = "draft" | "active" | "paused" | "archived";

export type LoyaltyTierRecord = {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly minPoints: number;
  readonly discountPercent: number;
  readonly freeDeliveryThreshold: number;
  readonly badge: string;
  readonly status: LoyaltyTierStatus;
  readonly version: number;
  readonly createdByActorId?: string;
  readonly approvedByActorId?: string;
  readonly approvedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type LoyaltyProgramSummary = {
  readonly activeTiers: number;
  readonly totalEnrolledClients: number;
  readonly pointsIssuedThisMonth: number;
  readonly isBackedByApi: boolean;
};

export type SubscriptionPlanStatus = "draft" | "active" | "paused" | "archived";
export type SubscriptionBillingCycle = "monthly" | "quarterly" | "annual";

export type SubscriptionPlanRecord = {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly priceYer: number;
  readonly billingCycle: SubscriptionBillingCycle;
  readonly includeFreeDelivery: boolean;
  readonly pointsMultiplier: number;
  readonly orderCap: number;
  readonly badge: string;
  readonly status: SubscriptionPlanStatus;
  readonly subscriberCount: number;
  readonly wltProductReference?: string;
  readonly version: number;
  readonly createdByActorId?: string;
  readonly approvedByActorId?: string;
  readonly approvedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SubscriptionsSummary = {
  readonly activePlans: number;
  readonly totalActiveSubscribers: number;
  /** Monthly-normalized configured revenue for verified active entitlements. */
  readonly mrr: number;
  readonly isBackedByApi: boolean;
};

export type ClientLoyaltyAccount = {
  readonly pointsBalance: number;
  readonly lifetimePoints: number;
  readonly tier?: LoyaltyTierRecord;
};

export type ClientSubscriptionEntitlement = {
  readonly id: string;
  readonly status: "active" | "paused" | "expired" | "cancelled" | "payment_failed" | "pending_payment";
  readonly wltSubscriptionReference?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly plan: SubscriptionPlanRecord;
};

export type PublishedPartnerOffer = {
  readonly id: string;
  readonly title: string;
  readonly partnerName: string;
  readonly storeId: string;
  readonly storeLabel: string;
  readonly productId?: string;
  readonly productLabel?: string;
  readonly category?: string;
  readonly offerType: "discount" | "free-delivery" | "bundle" | "buy-x-get-y" | "coupon" | string;
  readonly status: "published";
  readonly valueLabel: string;
  readonly eligibility: string;
  readonly activeFromDate?: string;
  readonly activeToDate?: string;
  readonly version: number;
};

export type ClientBenefitsPayload = {
  readonly loyaltyAccount?: ClientLoyaltyAccount;
  readonly availableTiers: readonly LoyaltyTierRecord[];
  readonly availablePlans: readonly SubscriptionPlanRecord[];
  readonly activeSubscription?: ClientSubscriptionEntitlement;
  readonly offers: readonly PublishedPartnerOffer[];
};

export type ClientBenefitItem = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly kind: "loyalty" | "subscription" | "promo";
  readonly badgeLabel?: string;
};

export function buildClientBenefitItems(
  tiers: readonly LoyaltyTierRecord[],
  plans: readonly SubscriptionPlanRecord[],
): readonly ClientBenefitItem[] {
  const tierItems: ClientBenefitItem[] = tiers
    .filter((tier) => tier.status === "active")
    .map((tier) => ({
      id: `tier-${tier.id}`,
      title: tier.nameAr,
      description: `خصم ${tier.discountPercent}% ابتداءً من ${tier.minPoints.toLocaleString("ar")} نقطة`,
      icon: tier.badge || "⭐",
      kind: "loyalty",
      badgeLabel: "ولاء",
    }));

  const planItems: ClientBenefitItem[] = plans
    .filter((plan) => plan.status === "active")
    .map((plan) => ({
      id: `plan-${plan.id}`,
      title: plan.nameAr,
      description: `${plan.priceYer.toLocaleString("ar")} ر.ي / ${
        plan.billingCycle === "monthly" ? "شهر" : plan.billingCycle === "quarterly" ? "ربع سنة" : "سنة"
      }`,
      icon: plan.badge || "🎟",
      kind: "subscription",
      badgeLabel: "اشتراك",
    }));

  return [...tierItems, ...planItems];
}

export type BenefitRowTone = "success" | "warning" | "danger" | "info" | "action" | "neutral";

export type BenefitRow = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly badgeLabel?: string;
  readonly badgeTone?: BenefitRowTone;
  readonly actionLabel?: string;
  readonly helperText?: string;
};
