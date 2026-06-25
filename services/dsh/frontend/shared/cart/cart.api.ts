import { configureIdentitySession, getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  DshCart,
  DshCartItem,
  DshFulfillmentMode,
  DshServiceabilityResult,
} from "./cart.types";

const baseUrl = resolveDshApiBaseUrl();
configureIdentitySession(resolveIdentityApiBaseUrl());

type RequestOptions = {
  readonly method?: "GET" | "POST" | "DELETE";
  readonly body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Correlation-ID": corrId("cart"),
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
  }
  if (!response.ok) {
    throw { kind: "http", status: response.status, body: await response.text().catch(() => "") };
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function fetchCart(storeId: string): Promise<DshCart | null> {
  const data = await request<{ cart: DshCart | null }>(
    `/dsh/client/cart?storeId=${encodeURIComponent(storeId)}`,
  );
  return data.cart;
}

export async function upsertCartItem(input: {
  readonly storeId: string;
  readonly fulfillmentMode?: DshFulfillmentMode;
  readonly productId: string;
  readonly productName: string;
  readonly priceReference?: string;
  readonly quantity: number;
}): Promise<{ cartId: string; item: DshCartItem }> {
  return request<{ cartId: string; item: DshCartItem }>("/dsh/client/cart/items", {
    method: "POST",
    body: input,
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
): Promise<DshServiceabilityResult> {
  return request<DshServiceabilityResult>("/dsh/client/cart/serviceability", {
    method: "POST",
    body: { storeId, serviceAreaCode },
  });
}

export async function fetchOperatorCarts(state?: string): Promise<readonly DshCart[]> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  const params = state ? `?state=${encodeURIComponent(state)}` : "";
  let response: Response;
  try {
    response = await fetch(new URL(`/dsh/operator/carts${params}`, baseUrl), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
  }
  if (!response.ok) throw { kind: "http", status: response.status };
  const data = (await response.json()) as { carts: DshCart[] };
  return data.carts ?? [];
}

export function classifyCartError(error: unknown): { kind: "permission_denied" | "offline" | "error"; message?: string } {
  const typed = error as { kind?: string; status?: number; message?: string };
  if (typed.kind === "http" && (typed.status === 401 || typed.status === 403)) {
    return { kind: "permission_denied" };
  }
  if (typed.kind === "network") {
    return { kind: "offline" };
  }
  return { kind: "error", message: "تعذر تنفيذ عملية السلة." };
}

function corrId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

function resolveIdentityApiBaseUrl(): string {
  if (typeof process !== "undefined") {
    const env = process.env as Record<string, string | undefined>;
    const configured =
      env["NEXT_PUBLIC_IDENTITY_API_BASE_URL"] ??
      env["EXPO_PUBLIC_IDENTITY_API_BASE_URL"];
    if (configured && configured.trim().length > 0) return configured.trim();
  }
  return "http://localhost:58081";
}
