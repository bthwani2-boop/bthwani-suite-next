export type DshWltCodView = {
  readonly id: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly partnerId: string;
  readonly statusLabel: string;
  readonly statusBadge: "success" | "warning" | "error" | "neutral";
  readonly amountLabel: string;
  readonly currency: string;
  readonly collectedAt: string | null;
  readonly remittedAt: string | null;
};

export type DshWltCommissionView = {
  readonly id: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly partnerId: string;
  readonly commissionTypeLabel: string;
  readonly statusLabel: string;
  readonly statusBadge: "success" | "warning" | "error" | "neutral";
  readonly amountLabel: string;
  readonly currency: string;
  readonly settledAt: string | null;
};

export type DshWltCodState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly records: readonly DshWltCodView[] }
  | { readonly kind: "error"; readonly message: string };

export type DshWltCommissionState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly commissions: readonly DshWltCommissionView[] }
  | { readonly kind: "error"; readonly message: string };
