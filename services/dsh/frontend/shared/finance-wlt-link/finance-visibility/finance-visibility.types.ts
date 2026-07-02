export type DshFinanceVisibilityState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: DshPartnerFinanceSummary }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "wlt_unavailable" };

export type DshPartnerFinanceSummary = {
  readonly orderId: string;
  readonly paymentStatus: string;
  readonly settlementStatus: string;
  readonly refundStatus: string | null;
  readonly walletStatus: string | null;
  readonly updatedAt: string;
};

export type DshOperatorFinanceSummary = {
  readonly paymentRef: WltPaymentStatusRef | null;
  readonly settlementRef: WltSettlementStatusRef | null;
  readonly refundRef: WltRefundStatusRef | null;
};

export type WltPaymentStatusRef = {
  readonly id: string;
  readonly orderId: string;
  readonly status: string;
  readonly updatedAt: string;
};

export type WltSettlementStatusRef = {
  readonly id: string;
  readonly orderId: string;
  readonly status: string;
  readonly updatedAt: string;
};

export type WltRefundStatusRef = {
  readonly id: string;
  readonly orderId: string;
  readonly status: string;
  readonly updatedAt: string;
};
