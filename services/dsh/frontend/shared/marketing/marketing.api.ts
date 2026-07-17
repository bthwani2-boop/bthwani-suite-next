import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshRawHttpClient } from "../_kernel/dsh-http-request";
import type { DshCampaign, MarketingNewsTickerItem } from "./marketing.types";
import type {
  ClientBenefitsPayload,
  LoyaltyProgramSummary,
  LoyaltyTierRecord,
  SubscriptionBillingCycle,
  SubscriptionPlanRecord,
  SubscriptionsSummary,
} from "./loyalty-subscriptions.types";

const { req } = createDshRawHttpClient(resolveDshApiBaseUrl(), "mkt");

type MarketingTargetFields = {
  targetType?: string;
  targetId?: string;
  audience?: string;
  placement?: string;
};

export const fetchCampaigns = () => req<{ campaigns: DshCampaign[] }>("/dsh/operator/marketing/campaigns");
export const createCampaign = (
  body: { title: string; description?: string; startDate?: string; endDate?: string } & MarketingTargetFields,
) => req<{ campaign: DshCampaign }>("/dsh/operator/marketing/campaigns", {
  method: "POST",
  body: JSON.stringify(body),
});
export const getCampaign = (id: string) =>
  req<{ campaign: DshCampaign }>(`/dsh/operator/marketing/campaigns/${id}`);
export const updateCampaign = (
  id: string,
  body: { status?: string; title?: string; description?: string } & MarketingTargetFields,
) => req<{ campaign: DshCampaign }>(`/dsh/operator/marketing/campaigns/${id}`, {
  method: "PATCH",
  body: JSON.stringify(body),
});
export const archiveCampaign = (id: string) =>
  req<{ archived: boolean }>(`/dsh/operator/marketing/campaigns/${id}`, { method: "DELETE" });

export type MarketingTickerWritePayload = Partial<
  Omit<MarketingNewsTickerItem, "id" | "clicks" | "impressions" | "updatedAt">
>;

export const fetchTickers = () =>
  req<{ tickers: MarketingNewsTickerItem[] }>("/dsh/operator/marketing/tickers");
export const createTicker = (body: MarketingTickerWritePayload & { message: string }) =>
  req<{ ticker: MarketingNewsTickerItem }>("/dsh/operator/marketing/tickers", {
    method: "POST",
    body: JSON.stringify(body),
  });
export const updateTicker = (id: string, body: MarketingTickerWritePayload) =>
  req<{ ticker: MarketingNewsTickerItem }>(`/dsh/operator/marketing/tickers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
export const deleteTicker = (id: string) =>
  req<{ deleted: boolean }>(`/dsh/operator/marketing/tickers/${id}`, { method: "DELETE" });

export type PartnerOfferWritePayload = {
  status?: string;
  title?: string;
  valueLabel?: string;
  eligibility?: string;
  activeFromDate?: string;
  activeToDate?: string;
  rejectionReason?: string;
  marginRiskNote?: string;
};

export type PartnerOfferSubmitPayload = {
  title: string;
  partnerName?: string;
  storeLabel?: string;
  productId?: string;
  productLabel?: string;
  category?: string;
  offerType?: string;
  valueLabel: string;
  eligibility?: string;
};

export const fetchPartnerOffers = () =>
  req<{ offers: import("../partner/dsh-partner-offer-types").PartnerOfferRecord[] }>(
    "/dsh/operator/marketing/partner-offers",
  );
export const updatePartnerOffer = (id: string, body: PartnerOfferWritePayload) =>
  req<{ offer: import("../partner/dsh-partner-offer-types").PartnerOfferRecord }>(
    `/dsh/operator/marketing/partner-offers/${id}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
export const archivePartnerOffer = (id: string) =>
  req<{ archived: boolean }>(`/dsh/operator/marketing/partner-offers/${id}`, { method: "DELETE" });

export const fetchPartnerSelfOffers = () =>
  req<{ offers: import("../partner/dsh-partner-offer-types").PartnerOfferRecord[] }>(
    "/dsh/partner/marketing/offers",
  );
export const submitPartnerSelfOffer = (body: PartnerOfferSubmitPayload) =>
  req<{ offer: import("../partner/dsh-partner-offer-types").PartnerOfferRecord }>(
    "/dsh/partner/marketing/offers",
    { method: "POST", body: JSON.stringify(body) },
  );

export type LoyaltyTierCreatePayload = {
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly minPoints: number;
  readonly discountPercent: number;
  readonly freeDeliveryThreshold?: number;
  readonly badge?: string;
};

export type LoyaltyTierUpdatePayload = Partial<LoyaltyTierCreatePayload> & {
  readonly status?: LoyaltyTierRecord["status"];
  readonly expectedVersion: number;
};

export const fetchLoyaltyTiers = () =>
  req<{ tiers: LoyaltyTierRecord[]; summary: LoyaltyProgramSummary }>(
    "/dsh/operator/marketing/loyalty-tiers",
  );

export const createLoyaltyTier = (body: LoyaltyTierCreatePayload) =>
  req<{ tier: LoyaltyTierRecord }>("/dsh/operator/marketing/loyalty-tiers", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateLoyaltyTier = (id: string, body: LoyaltyTierUpdatePayload) =>
  req<{ tier: LoyaltyTierRecord }>(`/dsh/operator/marketing/loyalty-tiers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export type SubscriptionPlanCreatePayload = {
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly priceYer: number;
  readonly billingCycle: SubscriptionBillingCycle;
  readonly includeFreeDelivery?: boolean;
  readonly pointsMultiplier?: number;
  readonly orderCap?: number;
  readonly badge?: string;
  readonly wltProductReference?: string;
};

export type SubscriptionPlanUpdatePayload = Partial<SubscriptionPlanCreatePayload> & {
  readonly status?: SubscriptionPlanRecord["status"];
  readonly expectedVersion: number;
};

export const fetchSubscriptionPlans = () =>
  req<{ plans: SubscriptionPlanRecord[]; summary: SubscriptionsSummary }>(
    "/dsh/operator/marketing/subscription-plans",
  );

export const createSubscriptionPlan = (body: SubscriptionPlanCreatePayload) =>
  req<{ plan: SubscriptionPlanRecord }>("/dsh/operator/marketing/subscription-plans", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateSubscriptionPlan = (id: string, body: SubscriptionPlanUpdatePayload) =>
  req<{ plan: SubscriptionPlanRecord }>(`/dsh/operator/marketing/subscription-plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const fetchClientBenefits = () =>
  req<{ benefits: ClientBenefitsPayload }>("/dsh/client/benefits");
