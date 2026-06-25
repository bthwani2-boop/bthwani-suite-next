import type { DshCart, DshCartItem, DshFulfillmentMode } from "./cart.types";
import { DSH_FULFILLMENT_MODE_META } from "./cart.types";

export type DshCartItemViewModel = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly priceReference: string;
  readonly quantity: number;
};

export type DshCartViewModel = {
  readonly id: string;
  readonly storeId: string;
  readonly fulfillmentModeLabel: string;
  readonly itemCount: number;
  readonly totalQuantity: number;
  readonly items: readonly DshCartItemViewModel[];
  readonly isEmpty: boolean;
  readonly isCheckedOut: boolean;
};

export function toCartItemViewModel(item: DshCartItem): DshCartItemViewModel {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    priceReference: item.priceReference,
    quantity: item.quantity,
  };
}

export function toCartViewModel(cart: DshCart): DshCartViewModel {
  const meta = DSH_FULFILLMENT_MODE_META[cart.fulfillmentMode];
  return {
    id: cart.id,
    storeId: cart.storeId,
    fulfillmentModeLabel: meta?.label ?? cart.fulfillmentMode,
    itemCount: cart.items.length,
    totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    items: cart.items.map(toCartItemViewModel),
    isEmpty: cart.items.length === 0,
    isCheckedOut: cart.state === "checked_out",
  };
}

export function fulfillmentModeLabel(mode: DshFulfillmentMode): string {
  return DSH_FULFILLMENT_MODE_META[mode]?.label ?? mode;
}
