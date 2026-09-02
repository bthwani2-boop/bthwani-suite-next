export type DshWltSettlementView = {
  readonly id: string;
  readonly partnerId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly statusLabel: string;
  readonly statusBadge: "success" | "warning" | "error" | "neutral";
  readonly netAmountLabel: string;
  readonly currency: string;
  readonly orderCount: number;
  readonly settledAt: string | null;
};

export type DshWltSettlementSummaryView = {
  readonly partnerId: string;
  readonly totalSettledLabel: string;
  readonly pendingAmountLabel: string;
  readonly currency: string;
  readonly settlementCount: number;
};

export type DshWltSettlementState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly settlements: readonly DshWltSettlementView[] }
  | { readonly kind: "error"; readonly message: string };

export type DshWltSettlementSummaryState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly summary: DshWltSettlementSummaryView }
  | { readonly kind: "error"; readonly message: string };
