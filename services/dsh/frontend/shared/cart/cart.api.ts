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
// authoritative name/price snapshot server-side from the store assortment,
// never from the client (see dsh-033 migration).
export async function upsertCartItem(input: {
  readonly storeId: string;
  readonly fulfillmentMode?: DshFulfillmentMode;
  readonly masterProductId: string;
  readonly productName?: string;
  readonly priceReference?: string;
  readonly quantity: number;
}): Promise<{ cartId: string; item: DshCartItem }> {
  return request<{ cartId: string; item: DshCartItem }>("/dsh/client/cart/items", {
    method: "POST",
    body: {
      storeId: input.storeId,
      ...(input.fulfillmentMode ? { fulfillmentMode: input.fulfillmentMode } : {}),
      masterProductId: input.masterProductId,
      quantity: input.quantity,
    },
  });
}

export async function removeCartItem(cartId: string, itemId: string): Promise<void> {
  await request(
    `/dsh/client/cart/items/${encodeURIComponent(itemId)}?cartId=${encodeURIComponent(cartId)}`,
    { method: "DELETE" },
  );
}

export async function clearCart(cartId?: string, storeId?: string): Promise<void> {
  const params = new URLSearchParams();
  if (cartId) params.set("cartId", cartId);
  if (storeId) params.set("storeId", storeId);
  await request(`/dsh/client/cart?${params.toString()}`, { method: "DELETE" });
}

export async function checkServiceability(
  storeId: string,
  serviceAreaCode: string,
  latitude?: number,
  longitude?: number,
): Promise<DshServiceabilityResult> {
  return request<DshServiceabilityResult>("/dsh/client/cart/serviceability", {
    method: "POST",
    body: { storeId, serviceAreaCode, latitude, longitude },
  });
}

export async function fetchOperatorCarts(state?: string): Promise<readonly DshCart[]> {
  const params = state ? `?state=${encodeURIComponent(state)}` : "";
  const data = await request<{ carts: DshCart[] }>(`/dsh/operator/carts${params}`);
  return data.carts ?? [];
}

function classifyCartError(error: unknown): { kind: "permission_denied" | "offline" | "error"; message?: string } {
  const typed = error as { kind?: string; status?: number; message?: string };
  if (typed.kind === "http" && (typed.status === 401 || typed.status === 403)) {
    return { kind: "permission_denied" };
  }
  if (typed.kind === "network") {
    return { kind: "offline" };
  }
  return { kind: "error", message: "تعذر تنفيذ عملية السلة." };
}
