import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshCart,
  DshCartItem,
  DshFulfillmentMode,
  DshServiceabilityResult,
} from "./cart.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "cart");

export async function fetchCart(storeId: string): Promise<DshCart | null> {
  const data = await request<{ cart: DshCart | null }>(
    `/dsh/client/cart?storeId=${encodeURIComponent(storeId)}`,
  );
  return data.cart;
}

// productName/priceReference are accepted here for caller convenience (e.g.
// optimistic UI updates) but are never sent to the server: DSH derives the
// authoritative name/price snapshot server-side from the store assortment.
export async function upsertCartItem(input: {
  readonly storeId: string;
  readonly fulfillmentMode?: DshFulfillmentMode;
  readonly masterProductId: string;
  readonly productName?: string;
  readonly priceReference?: string;
  readonly quantity: number;
  readonly options?: readonly string[];
  readonly note?: string;
  readonly expectedVersion?: number;
  readonly idempotencyKey: string;
  readonly deviceId: string;
  readonly sessionId: string;
}): Promise<{ cartId: string; item: DshCartItem }> {
  return request<{ cartId: string; item: DshCartItem }>("/dsh/client/cart/items", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    deviceId: input.deviceId,
    sessionId: input.sessionId,
    ...(input.expectedVersion !== undefined ? { expectedVersion: input.expectedVersion } : {}),
    body: {
      storeId: input.storeId,
      ...(input.fulfillmentMode ? { fulfillmentMode: input.fulfillmentMode } : {}),
      masterProductId: input.masterProductId,
      quantity: input.quantity,
      ...(input.options ? { options: input.options } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    },
  });
}

export async function removeCartItem(cartId: string, itemId: string, idempotencyKey: string, expectedVersion: number, deviceId: string, sessionId: string): Promise<void> {
  await request(
    `/dsh/client/cart/items/${encodeURIComponent(itemId)}?cartId=${encodeURIComponent(cartId)}`,
    { 
      method: "DELETE",
      idempotencyKey,
      expectedVersion,
      deviceId,
      sessionId,
    },
  );
}

export async function clearCart(idempotencyKey: string, cartId: string | undefined, storeId: string | undefined, expectedVersion: number | undefined, deviceId: string, sessionId: string): Promise<void> {
  const params = new URLSearchParams();
  if (cartId) params.set("cartId", cartId);
  if (storeId) params.set("storeId", storeId);
  
  await request(`/dsh/client/cart?${params.toString()}`, { 
    method: "DELETE",
    idempotencyKey,
    deviceId,
    sessionId,
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
  });
}

export async function checkServiceability(
  storeId: string,
  addressId: string,
  fulfillmentMode: DshFulfillmentMode,
): Promise<DshServiceabilityResult> {
  return request<DshServiceabilityResult>("/dsh/client/cart/serviceability", {
    method: "POST",
    body: { storeId, addressId, fulfillmentMode },
  });
}

export async function fetchFulfillmentModes(
  storeId: string,
  serviceAreaCode?: string,
) {
  const params = new URLSearchParams();
  params.set("storeId", storeId);
  if (serviceAreaCode) params.set("serviceAreaCode", serviceAreaCode);
  return request<import("../checkout/checkout.types").DshFulfillmentModesResponse>(
    `/dsh/client/cart/fulfillment-modes?${params.toString()}`,
  );
}

export async function fetchOperatorCarts(state?: string): Promise<readonly DshCart[]> {
  const params = state ? `?state=${encodeURIComponent(state)}` : "";
  const data = await request<{ carts: DshCart[] }>(`/dsh/operator/carts${params}`);
  return data.carts ?? [];
}
