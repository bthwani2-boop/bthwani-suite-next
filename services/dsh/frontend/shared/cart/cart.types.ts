import type { DshFulfillmentDeliveryMode } from "../delivery/delivery.contract";

// Canonical source: shared/delivery/delivery.contract.ts (DshFulfillmentDeliveryMode).
export type DshFulfillmentMode = DshFulfillmentDeliveryMode;

export type DshCartItem = {
  readonly id: string;
  readonly cartId: string;
  readonly productId: string;
  /** Sovereign central-catalog master product id (equal to productId today). */
  readonly masterProductId: string;
  /** The store assortment row snapshotted when the line was written. */
  readonly storeAssortmentId: string | null;
  readonly productName: string;
  readonly priceReference: string;
  /** Snapshotted server-side from the store assortment at add-to-cart time. */
  readonly unitPrice: number;
  readonly quantity: number;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCartItemValidationStatus =
  | "ready"
  | "product_unlinked"
  | "assortment_unavailable"
  | "unavailable"
  | "assortment_changed"
  | "unpriced"
  | "price_changed";

export type DshCartItemValidation = {
  readonly itemId: string;
  readonly masterProductId: string;
  readonly status: DshCartItemValidationStatus;
  readonly reasonCode?: string;
  readonly snapshotUnitPrice: number;
  readonly currentUnitPrice?: number;
  readonly snapshotAssortmentId?: string;
  readonly currentAssortmentId?: string;
};

export type DshCartValidation = {
  readonly ready: boolean;
  readonly code: "ready" | "cart_requires_review";
  readonly priceChanged: boolean;
  readonly unavailableCount: number;
  readonly items: readonly DshCartItemValidation[];
  readonly validatedAt: string;
};

export type DshCart = {
  readonly id: string;
  readonly clientId: string;
  readonly storeId: string;
  readonly fulfillmentMode: DshFulfillmentMode;
  readonly state: "active" | "checked_out" | "abandoned";
  readonly note: string;
  readonly items: readonly DshCartItem[];
  readonly validation?: DshCartValidation;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshServiceabilityCode =
  | "serviceable"
  | "store_unavailable"
  | "out_of_area"
  | "catalog_unavailable"
  | "mode_unavailable"
  | "capacity_exhausted"
  | "capacity_throttled"
  | "policy_unavailable";

export type DshFulfillmentModeAvailability = {
  readonly mode: DshFulfillmentMode;
  readonly available: boolean;
  readonly unavailableReasonCode?: string;
};

export type DshCapacityState =
  | "available"
  | "throttled"
  | "exhausted"
  | "unconfigured"
  | "policy_unavailable";

export type DshServiceabilityResult = {
  readonly serviceable: boolean;
  readonly code: DshServiceabilityCode;
  readonly reason?: string;
  readonly availableModes?: readonly DshFulfillmentModeAvailability[];
  readonly addressId?: string;
  readonly addressVersion?: number;
  readonly requestedMode?: DshFulfillmentMode;
  readonly capacityState: DshCapacityState;
  readonly capacityConfigured: boolean;
  readonly activeOrders: number;
  readonly maxConcurrentOrders?: number;
  readonly capacityLoadRatio?: number;
  readonly slaConfigured: boolean;
  readonly slaPrepMinutes?: number;
  readonly slaDeliveryMinutes?: number;
  readonly checkedAt: string;
};

export type DshCartState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "success"; readonly cart: DshCart }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "offline" }
  | { readonly kind: "permission_denied" };

export type DshServiceabilityState =
  | { readonly kind: "idle" }
  | { readonly kind: "checking" }
  | {
      readonly kind: "serviceable";
      readonly result: DshServiceabilityResult;
      readonly availableModes: readonly DshFulfillmentModeAvailability[];
    }
  | {
      readonly kind: "blocked";
      readonly code: DshServiceabilityCode;
      readonly reason?: string;
      readonly result: DshServiceabilityResult;
      readonly availableModes: readonly DshFulfillmentModeAvailability[];
    }
  | { readonly kind: "error"; readonly message: string };

export type DshCartActionState = "idle" | "submitting" | "success" | "error";
