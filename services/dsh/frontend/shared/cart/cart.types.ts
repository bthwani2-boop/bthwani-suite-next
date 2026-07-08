export type DshFulfillmentMode = "bthwani_delivery" | "partner_delivery" | "pickup";

export type DshCartItem = {
  readonly id: string;
  readonly cartId: string;
  readonly productId: string;
  readonly productName: string;
  readonly priceReference: string;
  /** Snapshotted server-side from the catalog product at add-to-cart time. */
  readonly unitPrice: number;
  readonly quantity: number;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCart = {
  readonly id: string;
  readonly clientId: string;
  readonly storeId: string;
  readonly fulfillmentMode: DshFulfillmentMode;
  readonly state: "active" | "checked_out" | "abandoned";
  readonly note: string;
  readonly items: readonly DshCartItem[];
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshServiceabilityCode =
  | "serviceable"
  | "store_unavailable"
  | "out_of_area"
  | "catalog_unavailable";

export type DshServiceabilityResult = {
  readonly serviceable: boolean;
  readonly code: DshServiceabilityCode;
  readonly reason?: string;
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
  | { readonly kind: "serviceable" }
  | { readonly kind: "blocked"; readonly code: DshServiceabilityCode; readonly reason?: string }
  | { readonly kind: "error"; readonly message: string };

export type DshCartActionState = "idle" | "submitting" | "success" | "error";

function isDshFulfillmentMode(value: unknown): value is DshFulfillmentMode {
  return value === "bthwani_delivery" || value === "partner_delivery" || value === "pickup";
}
