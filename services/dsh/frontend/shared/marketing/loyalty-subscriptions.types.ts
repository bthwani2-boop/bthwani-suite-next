import type { PartnerOfferRecord } from "../partner/dsh-partner-offer-types";

export type CommercialProgramStatus = "draft" | "active" | "paused" | "archived";

export type LoyaltyTierRecord = {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly minPoints: number;
  readonly discountPercent: number;
  readonly freeDeliveryThreshold: number;
  readonly badge: string;
  readonly status: CommercialProgramStatus;
  readonly version: number;
  readonly createdByActorId: string;
  readonly approvedByActorId?: string;
  readonly approvedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

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
  readonly status: CommercialProgramStatus;
  readonly subscriberCount: number;
  readonly wltProductReference?: string;
  readonly version: number;
  readonly createdByActorId: string;
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

export type SubscriptionsSummary = {
  readonly activePlans: number;
  readonly totalActiveSubscribers: number;
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
  readonly status: string;
  readonly wltSubscriptionReference?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly plan: SubscriptionPlanRecord;
};

export type PublishedPartnerOffer = PartnerOfferRecord & {
  readonly status: "published";
};

export type ClientBenefitsPayload = {
  readonly loyaltyAccount?: ClientLoyaltyAccount;
  readonly availableTiers: readonly LoyaltyTierRecord[];
  readonly availablePlans: readonly SubscriptionPlanRecord[];
  readonly activeSubscription?: ClientSubscriptionEntitlement;
  readonly offers: readonly PublishedPartnerOffer[];
};
