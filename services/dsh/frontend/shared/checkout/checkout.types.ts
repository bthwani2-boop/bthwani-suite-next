export type DshPaymentMethod = "cod" | "wallet" | "mixed" | "official_wallet";

export type DshIntentState =
  | "pending"
  | "payment_pending"
  | "confirmed"
  | "cancelled"
  | "expired";

export type DshFulfillmentMode = "bthwani_delivery" | "partner_delivery" | "pickup";

export type DshCheckoutIntent = {
  readonly id: string;
  readonly clientId: string;
  readonly cartId: string;
  readonly storeId: string;
  readonly fulfillmentMode: DshFulfillmentMode;
  readonly state: DshIntentState;
  readonly paymentMethod: DshPaymentMethod;
  /** Opaque WLT-owned payment-session reference. */
  readonly wltPaymentSessionId: string;
  readonly deliveryAddress: string;
  readonly note: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCreateIntentInput = {
  readonly cartId: string;
  readonly storeId: string;
  readonly fulfillmentMode?: DshFulfillmentMode;
  readonly paymentMethod?: DshPaymentMethod;
  readonly deliveryAddress?: string;
  readonly note?: string;
};

export type DshCheckoutState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "confirming" }
  | { readonly kind: "success"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "payment_pending"; readonly intent: DshCheckoutIntent }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "blocked_payment_unavailable" }
  | { readonly kind: "out_of_area" };
