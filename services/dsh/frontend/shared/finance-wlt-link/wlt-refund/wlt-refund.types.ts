export type DshWltRefundView = {
  readonly id: string;
  readonly orderId: string;
  readonly statusLabel: string;
  readonly statusBadge: "success" | "warning" | "error" | "neutral";
  readonly amountLabel: string;
  readonly currency: string;
  readonly resolvedAt: string | null;
};

export type DshWltRefundState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly refund: DshWltRefundView | null }
  | { readonly kind: "error"; readonly message: string };
