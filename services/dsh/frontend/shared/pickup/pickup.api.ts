import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient, corrId } from "../_kernel/dsh-http-request";
import type {
  ClassifiedPickupError,
  DshPickupCustomerArrivedResponse,
  DshPickupMarkReadyResponse,
  DshPickupNotifyResponse,
  DshPickupSession,
  DshPickupSessionListResponse,
  DshPickupSessionResponse,
  PickupErrorCode,
} from "./pickup.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "pickup");

export type PartnerPickupStage = "not_ready" | "ready" | "notified" | "customer_arrived" | "verified" | "no_show" | "cancelled";
export type DshPartnerPickupStateResponse = {
  readonly session: DshPickupSession | null;
  readonly stage: PartnerPickupStage;
};

// --- Partner (store) side --------------------------------------------------

export async function fetchPartnerPickupState(orderId: string): Promise<DshPartnerPickupStateResponse> {
  return request<DshPartnerPickupStateResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/pickup`,
  );
}

export async function markPickupReady(
  orderId: string,
  expectedVersion: number,
): Promise<DshPickupMarkReadyResponse> {
  return request<DshPickupMarkReadyResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/pickup/mark-ready`,
    { method: "POST", body: { expectedVersion, commandId: corrId("pk-ready") } },
  );
}

export async function notifyPickupCustomer(
  orderId: string,
  input: { readonly expectedVersion: number; readonly clientId?: string } = { expectedVersion: 0 },
): Promise<DshPickupNotifyResponse> {
  return request<DshPickupNotifyResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/pickup/notify`,
    { method: "POST", body: { ...input, commandId: corrId("pk-notify") } },
  );
}

export async function markPickupCustomerArrived(
  orderId: string,
  expectedVersion: number,
): Promise<DshPickupCustomerArrivedResponse> {
  return request<DshPickupCustomerArrivedResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/pickup/customer-arrived`,
    { method: "POST", body: { expectedVersion, commandId: corrId("pk-arrived") } },
  );
}

export async function verifyPickupSession(
  orderId: string,
  input: { readonly expectedVersion: number; readonly code: string },
): Promise<DshPickupSessionResponse> {
  return request<DshPickupSessionResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/pickup/verify`,
    { method: "POST", body: { ...input, commandId: corrId("pk-verify") } },
  );
}

export async function markPickupNoShow(
  orderId: string,
  input: { readonly expectedVersion: number; readonly reason: string },
): Promise<DshPickupSessionResponse> {
  return request<DshPickupSessionResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/pickup/no-show`,
    { method: "POST", body: { ...input, commandId: corrId("pk-no-show") } },
  );
}

// --- Operator side --------------------------------------------------------

export async function fetchOperatorPickups(params: {
  readonly storeId?: string;
  readonly limit?: number;
  readonly offset?: number;
} = {}): Promise<DshPickupSessionListResponse> {
  const query = new URLSearchParams();
  if (params.storeId) query.set("storeId", params.storeId);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  return request<DshPickupSessionListResponse>(`/dsh/operator/pickups${qs ? `?${qs}` : ""}`);
}

export async function fetchOperatorPickup(orderId: string): Promise<DshPickupSessionResponse> {
  return request<DshPickupSessionResponse>(`/dsh/operator/pickups/${encodeURIComponent(orderId)}`);
}

export async function extendPickupWindow(
  orderId: string,
  input: { readonly expectedVersion: number; readonly reason: string; readonly newExpiry: string },
): Promise<DshPickupSessionResponse> {
  return request<DshPickupSessionResponse>(
    `/dsh/operator/pickups/${encodeURIComponent(orderId)}/extend-window`,
    { method: "POST", body: { ...input, commandId: corrId("pk-extend") } },
  );
}

function classified(
  kind: ClassifiedPickupError["kind"],
  code: PickupErrorCode | undefined,
  message: string | undefined,
): ClassifiedPickupError {
  return { kind, ...(code ? { code } : {}), ...(message ? { message } : {}) };
}

export function classifyPickupError(error: unknown): ClassifiedPickupError {
  const typed = error as { kind?: string; status?: number; code?: string; message?: string };
  if (typed?.kind === "network") return classified("network", undefined, typed.message);
  if (typed?.kind === "http") {
    const code = typed.code as PickupErrorCode | undefined;
    if (typed.status === 409) return classified("conflict", code ?? "VERSION_CONFLICT", typed.message);
    if (typed.status === 404) return classified("not_found", code ?? "NOT_FOUND", typed.message);
    if (typed.status === 403 || typed.status === 401) return classified("forbidden", code, typed.message);
    if (typed.status === 422) return classified("invalid", code, typed.message);
    if (typed.status === 400) return classified("invalid", code ?? "INVALID_REQUEST", typed.message);
    if (typed.status === 503) return classified("unavailable", code, typed.message);
  }
  return classified("unknown", undefined, typed?.message);
}
