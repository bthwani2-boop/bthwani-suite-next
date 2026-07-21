export type DshPaymentMethod = "cod" | "wallet" | "mixed" | "official_wallet";

export type DshIntentState =
  | "pending"
  | "wlt_handoff_failed"
  | "payment_pending"
  | "confirmed"
  | "cancelled"
  | "payment_confirmed"
  | "payment_failed"
  | "expired";

import type { DshFulfillmentDeliveryMode } from "../delivery/delivery.contract";

export type DshFulfillmentMode = DshFulfillmentDeliveryMode;

export type DshCheckoutIntent = {
  readonly id: string;
  readonly clientId: string;
  readonly cartId: string;
  readonly storeId: string;
  readonly fulfillmentMode: DshFulfillmentMode;
  readonly state: DshIntentState;
  readonly paymentMethod: DshPaymentMethod;
  readonly wltPaymentSessionId: string;
  readonly deliveryAddress: string;
  readonly note: string;
  readonly subtotalMinorUnits: number;
  readonly deliveryFeeMinorUnits: number;
  readonly discountMinorUnits: number;
  readonly totalMinorUnits: number;
  readonly currency: string;
  readonly pricingSnapshotHash: string;
  readonly couponId?: string;
  readonly couponRedemptionId?: string;
  readonly couponCodeLast4?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCreateIntentInput = {
  readonly cartId: string;
  readonly storeId: string;
  readonly fulfillmentMode?: DshFulfillmentMode;
  readonly paymentMethod?: DshPaymentMethod;
  /** Required for delivery; the backend resolves ownership and snapshots it. */
  readonly deliveryAddressId?: string;
  readonly note?: string;
  readonly couponCode?: string;
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
