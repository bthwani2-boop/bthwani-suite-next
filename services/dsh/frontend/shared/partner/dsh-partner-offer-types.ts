export type PartnerOfferStatus =
  | "inbound"
  | "review"
  | "marketing-ready"
  | "published"
  | "paused"
  | "rejected"
  | "archived"
  | "expired"
  | "exhausted";

export type PartnerOfferType = "discount" | "free-delivery" | "bundle" | "buy-x-get-y" | "coupon";

export type PartnerOfferRecord = {
  readonly id: string;
  readonly title: string;
  readonly partnerName: string;
  readonly storeLabel: string;
  readonly storeId: string;
  readonly productId: string;
  readonly productLabel: string;
  readonly category: string;
  readonly offerType: PartnerOfferType;
  readonly couponId?: string;
  readonly status: PartnerOfferStatus;
  readonly source: "partner" | "control-panel";
  readonly valueLabel: string;
  readonly eligibility: string;
  readonly activeFromDate?: string;
  readonly activeToDate?: string;
  readonly rejectionReason?: string;
  readonly marginRiskNote?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly linkedCampaignId?: string;
};
