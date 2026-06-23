import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshOrder, DshCreateOrderInput, DshRejectOrderInput } from "./orders.types";

const baseUrl = resolveDshApiBaseUrl();

type RequestOptions = {
  readonly method?: "GET" | "POST" | "PATCH" | "DELETE";
  readonly body?: unknown;
  readonly token?: string;
};

function withOptionalToken(
  options: Omit<RequestOptions, "token">,
  token?: string,
): RequestOptions {
  return token === undefined ? options : { ...options, token };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token ?? getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Correlation-ID": corrId("order"),
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
  return response.json() as Promise<T>;
}

export async function createOrder(input: DshCreateOrderInput): Promise<DshOrder> {
  const data = await request<{ order: DshOrder }>("/dsh/client/orders", {
    method: "POST",
    body: input,
  });
  return data.order;
}

export async function fetchClientOrders(): Promise<readonly DshOrder[]> {
  const data = await request<{ orders: DshOrder[] }>("/dsh/client/orders");
  return data.orders ?? [];
}

export async function fetchClientOrder(orderId: string): Promise<DshOrder> {
  const data = await request<{ order: DshOrder }>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}`,
  );
  return data.order;
}

export async function fetchPartnerOrders(
  storeId: string,
  status?: string,
  token?: string,
): Promise<readonly DshOrder[]> {
  const params = new URLSearchParams({ storeId });
  if (status) params.set("status", status);
  const data = await request<{ orders: DshOrder[] }>(
    `/dsh/partner/orders?${params.toString()}`,
    withOptionalToken({}, token),
  );
  return data.orders ?? [];
}

export async function acceptOrder(orderId: string, token?: string): Promise<DshOrder> {
  const data = await request<{ order: DshOrder }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/accept`,
    withOptionalToken({ method: "POST" }, token),
  );
  return data.order;
}

export async function rejectOrder(
  orderId: string,
  input: DshRejectOrderInput,
  token?: string,
): Promise<DshOrder> {
  const data = await request<{ order: DshOrder }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/reject`,
    withOptionalToken({ method: "POST", body: input }, token),
  );
  return data.order;
}

export async function markOrderPreparing(orderId: string, token?: string): Promise<DshOrder> {
  const data = await request<{ order: DshOrder }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/preparing`,
    withOptionalToken({ method: "POST" }, token),
  );
  return data.order;
}

export async function markOrderReady(orderId: string, token?: string): Promise<DshOrder> {
  const data = await request<{ order: DshOrder }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/ready`,
    withOptionalToken({ method: "POST" }, token),
  );
  return data.order;
}

export async function fetchOperatorOrders(status?: string): Promise<readonly DshOrder[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await request<{ orders: DshOrder[] }>(`/dsh/operator/orders${params}`);
  return data.orders ?? [];
}

export function classifyOrderError(error: unknown): {
  kind: "permission_denied" | "offline" | "conflict" | "not_found" | "error";
  message?: string;
} {
  const typed = error as { kind?: string; status?: number };
  if (typed.kind === "http") {
    if (typed.status === 401 || typed.status === 403) return { kind: "permission_denied" };
    if (typed.status === 404) return { kind: "not_found" };
    if (typed.status === 409) return { kind: "conflict", message: "الطلب في حالة لا تسمح بهذا الإجراء." };
  }
  if (typed.kind === "network") return { kind: "offline" };
  return { kind: "error", message: "تعذر تنفيذ عملية الطلب." };
}

function corrId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}
