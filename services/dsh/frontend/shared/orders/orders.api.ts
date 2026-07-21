import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient, type DshRequestOptions } from "../_kernel/dsh-http-request";
import type {
  DshOrder,
  DshOrderPreparation,
  DshPartnerOrder,
  DshCreateOrderInput,
  DshRejectOrderInput,
  DshStoreCaptainHandoff,
  DshStorePreparationPolicy,
} from "./orders.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "order");

function withOptionalToken(
  options: Omit<DshRequestOptions, "token">,
  token?: string,
): DshRequestOptions {
  return token === undefined ? options : { ...options, token };
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

export async function fetchOrderPreparation(
  orderId: string,
  token?: string,
): Promise<DshOrderPreparation> {
  const data = await request<{ preparation: DshOrderPreparation }>(
    `/dsh/orders/${encodeURIComponent(orderId)}/preparation`,
    withOptionalToken({}, token),
  );
  return data.preparation;
}

/**
 * Partner order scope and executable actions are resolved exclusively by DSH
 * from the authenticated actor. Surfaces must not derive mutation authority
 * from status labels or a caller-provided store identifier.
 */
export async function fetchPartnerOrders(
  status?: string,
  token?: string,
): Promise<readonly DshPartnerOrder[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const query = params.toString();
  const data = await request<{ orders: DshPartnerOrder[] }>(
    `/dsh/partner/order-workboard${query ? `?${query}` : ""}`,
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

export async function confirmStoreCaptainHandoff(
  orderId: string,
  token?: string,
): Promise<DshStoreCaptainHandoff> {
  const data = await request<{ handoff: DshStoreCaptainHandoff }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/captain-handoff/confirm`,
    withOptionalToken({ method: "POST" }, token),
  );
  return data.handoff;
}

export async function reviseOrderPreparationEstimate(
  orderId: string,
  input: { readonly remainingMinutes: number; readonly reason: string },
  token?: string,
): Promise<DshOrderPreparation> {
  const data = await request<{ preparation: DshOrderPreparation }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/preparation-estimate`,
    withOptionalToken({ method: "POST", body: input }, token),
  );
  return data.preparation;
}

export async function fetchStorePreparationPolicy(
  storeId: string,
  token?: string,
): Promise<DshStorePreparationPolicy> {
  const data = await request<{ policy: DshStorePreparationPolicy }>(
    `/dsh/partner/stores/${encodeURIComponent(storeId)}/order-preparation-policy`,
    withOptionalToken({}, token),
  );
  return data.policy;
}

export async function updateStorePreparationPolicy(
  storeId: string,
  input: {
    readonly expectedVersion: number;
    readonly defaultPreparationMinutes: number;
    readonly warningBeforeMinutes: number;
    readonly reason: string;
  },
  token?: string,
): Promise<DshStorePreparationPolicy> {
  const data = await request<{ policy: DshStorePreparationPolicy }>(
    `/dsh/partner/stores/${encodeURIComponent(storeId)}/order-preparation-policy`,
    withOptionalToken({ method: "PUT", body: input }, token),
  );
  return data.policy;
}

export function classifyOrderError(error: unknown): {
  kind: "permission_denied" | "offline" | "conflict" | "not_found" | "error";
  message?: string;
} {
  const typed = error as { kind?: string; status?: number; message?: string };
  if (typed.kind === "http") {
    if (typed.status === 401 || typed.status === 403) return { kind: "permission_denied" };
    if (typed.status === 404) return { kind: "not_found" };
    if (typed.status === 409) return { kind: "conflict", message: typed.message ?? "الطلب في حالة لا تسمح بهذا الإجراء." };
  }
  if (typed.kind === "network") return { kind: "offline" };
  return { kind: "error", message: typed.message ?? "تعذر تنفيذ عملية الطلب." };
}
