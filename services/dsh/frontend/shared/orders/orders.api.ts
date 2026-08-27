import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { corrId, createDshHttpClient, type DshRequestOptions } from "../_kernel/dsh-http-request";
import type { DshDeliveryException } from "../dispatch/dispatch.types";
import type {
  DshOrder,
  DshOrderPreparation,
  DshPartnerOrder,
  DshRejectOrderInput,
  DshStoreCaptainHandoff,
  DshStorePreparationPolicy,
  DshPreparationIssue,
  DshPreparationIssueList,
  DshCreatePreparationIssueInput,
  DshDecidePreparationIssueInput,
  DshResolvePreparationIssueInput,
  DshReportStoreCaptainHandoffExceptionInput,
} from "./orders.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "order");

export type PartnerOrderMutationOptions = {
  readonly expectedVersion: number;
  readonly idempotencyKey?: string;
};

function partnerMutationOptions(options: PartnerOrderMutationOptions): DshRequestOptions {
  return {
    method: "POST",
    expectedVersion: options.expectedVersion,
    idempotencyKey: options.idempotencyKey ?? corrId("partner-order-command"),
  };
}

function withOptionalToken(
  options: Omit<DshRequestOptions, "token">,
  token?: string,
): DshRequestOptions {
  return token === undefined ? options : { ...options, token };
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

export async function fetchOrderPreparationIssues(
  orderId: string,
  token?: string,
): Promise<DshPreparationIssueList> {
  const data = await request<{
    issues: DshPreparationIssue[];
    openCount: number;
    pendingCustomerDecisionCount: number;
  }>(
    `/dsh/orders/${encodeURIComponent(orderId)}/preparation-issues`,
    withOptionalToken({}, token),
  );
  return {
    issues: data.issues ?? [],
    openCount: Math.max(0, Number(data.openCount ?? 0)),
    pendingCustomerDecisionCount: Math.max(0, Number(data.pendingCustomerDecisionCount ?? 0)),
  };
}

/**
 * Partner order scope and executable actions are resolved exclusively by DSH
 * from the authenticated actor. Surfaces must not derive mutation authority
 * from status labels or a caller-provided store identifier.
 */
export async function fetchPartnerOrders(
  status?: string,
  storeId?: string,
  token?: string,
): Promise<readonly DshPartnerOrder[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (storeId?.trim()) params.set("storeId", storeId.trim());
  const query = params.toString();
  const data = await request<{ orders: DshPartnerOrder[] }>(
    `/dsh/partner/order-workboard${query ? `?${query}` : ""}`,
    withOptionalToken({}, token),
  );
  return data.orders ?? [];
}

export async function acceptOrder(orderId: string, options: PartnerOrderMutationOptions, token?: string): Promise<DshOrder> {
  const data = await request<{ order: DshOrder }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/accept`,
    withOptionalToken(partnerMutationOptions(options), token),
  );
  return data.order;
}

export async function markOrderPreparing(orderId: string, options: PartnerOrderMutationOptions, token?: string): Promise<DshOrder> {
  const data = await request<{ order: DshOrder }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/preparing`,
    withOptionalToken(partnerMutationOptions(options), token),
  );
  return data.order;
}

export async function markOrderReady(orderId: string, options: PartnerOrderMutationOptions, token?: string): Promise<DshOrder> {
  const data = await request<{ order: DshOrder }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/ready`,
    withOptionalToken(partnerMutationOptions(options), token),
  );
  return data.order;
}

export async function confirmStoreCaptainHandoff(
  orderId: string,
  token?: string,
  idempotencyKey?: string,
): Promise<DshStoreCaptainHandoff> {
  const data = await request<{ handoff: DshStoreCaptainHandoff }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/captain-handoff/confirm`,
    withOptionalToken({ method: "POST", idempotencyKey: idempotencyKey ?? corrId("partner-handoff-confirm") }, token),
  );
  return data.handoff;
}

export async function reportPartnerStoreCaptainHandoffException(
  orderId: string,
  input: DshReportStoreCaptainHandoffExceptionInput,
  token?: string,
): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/captain-handoff/exceptions`,
    withOptionalToken({ method: "POST", body: input, idempotencyKey: input.correlationId }, token),
  );
  return data.exception;
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

export async function createOrderPreparationIssue(
  orderId: string,
  input: DshCreatePreparationIssueInput,
  token?: string,
): Promise<DshPreparationIssue> {
  const data = await request<{ issue: DshPreparationIssue }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/preparation-issues`,
    withOptionalToken({ method: "POST", body: input }, token),
  );
  return data.issue;
}

export async function decideOrderPreparationIssue(
  orderId: string,
  issueId: string,
  input: DshDecidePreparationIssueInput,
  token?: string,
): Promise<DshPreparationIssue> {
  const data = await request<{ issue: DshPreparationIssue }>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}/preparation-issues/${encodeURIComponent(issueId)}/decision`,
    withOptionalToken({ method: "POST", body: input }, token),
  );
  return data.issue;
}

export async function resolveOrderPreparationIssue(
  orderId: string,
  issueId: string,
  input: DshResolvePreparationIssueInput,
  token?: string,
): Promise<DshPreparationIssue> {
  const data = await request<{ issue: DshPreparationIssue }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/preparation-issues/${encodeURIComponent(issueId)}/resolve`,
    withOptionalToken({ method: "POST", body: input }, token),
  );
  return data.issue;
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
