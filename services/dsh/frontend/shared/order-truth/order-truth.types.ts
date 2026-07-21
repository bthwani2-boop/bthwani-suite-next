export type OrderTruthActor = "client" | "partner" | "operator";

export type OrderTruthCurrentOwner =
  | "client"
  | "partner"
  | "operations"
  | "captain"
  | "terminal";

export type OrderTruthItem = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotalMinorUnits: number;
  readonly snapshot: Readonly<Record<string, unknown>>;
};

export type OrderTruthEvent = {
  readonly id: string;
  readonly type: string;
  readonly actorRole: string;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly orderVersion: number;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
};

export type OrderTruth = {
  readonly id: string;
  readonly orderNumber: string;
  readonly checkoutIntentId: string;
  readonly storeId: string;
  readonly clientId?: string;
  readonly fulfillmentMode: "bthwani_delivery" | "partner_delivery" | "pickup";
  readonly status: string;
  readonly currentOwner: OrderTruthCurrentOwner;
  readonly allowedActions: readonly string[];
  readonly deliveryAddressSnapshot: Readonly<Record<string, unknown>>;
  readonly subtotalMinorUnits: number;
  readonly discountMinorUnits: number;
  readonly totalMinorUnits: number;
  readonly currency: string;
  readonly pricingSnapshotHash: string;
  readonly couponCodeLast4?: string;
  readonly wltPaymentRefId: string;
  readonly paymentStatusProjection: string;
  readonly paymentProjectionUpdatedAt?: string;
  readonly correlationId: string;
  readonly version: number;
  readonly items: readonly OrderTruthItem[];
  readonly statusTimeline: readonly OrderTruthEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreateOrderTruthInput = {
  readonly checkoutIntentId: string;
};

export type OrderTruthMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export type OrderTruthCreateState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly order: OrderTruth }
  | { readonly kind: "offline"; readonly message: string }
  | { readonly kind: "forbidden"; readonly message: string }
  | { readonly kind: "conflict"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

export type OrderTruthCollectionState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "success"; readonly orders: readonly OrderTruth[] }
  | { readonly kind: "partial"; readonly orders: readonly OrderTruth[]; readonly message: string }
  | { readonly kind: "offline"; readonly message: string }
  | { readonly kind: "forbidden"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

export type OrderTruthDetailState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly order: OrderTruth }
  | { readonly kind: "partial"; readonly order: OrderTruth; readonly message: string }
  | { readonly kind: "offline"; readonly message: string }
  | { readonly kind: "forbidden"; readonly message: string }
  | { readonly kind: "not_found"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

export type OrderTruthFailure = {
  readonly kind: "offline" | "forbidden" | "not_found" | "conflict" | "error";
  readonly message: string;
};
