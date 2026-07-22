import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient, corrId } from "../_kernel/dsh-http-request";
import type {
  ClassifiedPartnerDeliveryError,
  DshPartnerDeliveryTask,
  DshPartnerDeliveryTaskListResponse,
  DshPartnerDeliveryTaskResponse,
  PartnerDeliveryErrorCode,
} from "./partner-delivery.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "partner-delivery");

export type DshPartnerDeliveryStateResponse = {
  readonly task: DshPartnerDeliveryTask | null;
  readonly stage: string;
};

function commandId(prefix: string, supplied?: string): string {
  return supplied?.trim() || corrId(prefix);
}

export async function fetchClientPartnerDeliveryTask(orderId: string): Promise<DshPartnerDeliveryStateResponse> {
  return request<DshPartnerDeliveryStateResponse>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}/partner-delivery`,
  );
}

export async function fetchPartnerDeliveryTask(orderId: string): Promise<DshPartnerDeliveryStateResponse> {
  return request<DshPartnerDeliveryStateResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/partner-delivery`,
  );
}

export async function assignPartnerDeliveryTask(
  orderId: string,
  input: {
    readonly storeCourierId: string;
    readonly expectedVersion: number;
    readonly reason?: string;
    readonly commandId?: string;
  },
): Promise<DshPartnerDeliveryTaskResponse> {
  const { commandId: suppliedCommandId, ...body } = input;
  return request<DshPartnerDeliveryTaskResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/partner-delivery/assign`,
    { method: "POST", body: { ...body, commandId: commandId("assign-partner-delivery", suppliedCommandId) } },
  );
}

export async function markPartnerDeliveryPickedUp(
  orderId: string,
  expectedVersion: number,
  suppliedCommandId?: string,
): Promise<DshPartnerDeliveryTaskResponse> {
  return request<DshPartnerDeliveryTaskResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/partner-delivery/pickup`,
    { method: "POST", body: { expectedVersion, commandId: commandId("pd-pickup", suppliedCommandId) } },
  );
}

export async function departPartnerDeliveryTask(
  orderId: string,
  expectedVersion: number,
  suppliedCommandId?: string,
): Promise<DshPartnerDeliveryTaskResponse> {
  return request<DshPartnerDeliveryTaskResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/partner-delivery/depart`,
    { method: "POST", body: { expectedVersion, commandId: commandId("pd-depart", suppliedCommandId) } },
  );
}

export async function arrivePartnerDeliveryTask(
  orderId: string,
  expectedVersion: number,
  suppliedCommandId?: string,
): Promise<DshPartnerDeliveryTaskResponse> {
  return request<DshPartnerDeliveryTaskResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/partner-delivery/arrive`,
    { method: "POST", body: { expectedVersion, commandId: commandId("pd-arrive", suppliedCommandId) } },
  );
}

export async function submitPartnerDeliveryProof(
  orderId: string,
  input: {
    readonly expectedVersion: number;
    readonly proofMethod: string;
    readonly proofReference: string;
    readonly commandId?: string;
  },
): Promise<DshPartnerDeliveryTaskResponse> {
  const { commandId: suppliedCommandId, ...body } = input;
  return request<DshPartnerDeliveryTaskResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/partner-delivery/proof`,
    { method: "POST", body: { ...body, commandId: commandId("pd-proof", suppliedCommandId) } },
  );
}

export async function fetchOperatorPartnerDeliveries(params: {
  readonly storeId?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly offset?: number;
} = {}): Promise<DshPartnerDeliveryTaskListResponse> {
  const query = new URLSearchParams();
  if (params.storeId) query.set("storeId", params.storeId);
  if (params.status) query.set("status", params.status);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  return request<DshPartnerDeliveryTaskListResponse>(`/dsh/operator/partner-deliveries${qs ? `?${qs}` : ""}`);
}

export async function fetchOperatorPartnerDelivery(taskId: string): Promise<DshPartnerDeliveryTaskResponse> {
  return request<DshPartnerDeliveryTaskResponse>(`/dsh/operator/partner-deliveries/${encodeURIComponent(taskId)}`);
}

export async function fetchOperatorPartnerDeliveryByOrder(orderId: string): Promise<DshPartnerDeliveryTaskResponse> {
  return request<DshPartnerDeliveryTaskResponse>(
    `/dsh/operator/partner-deliveries/order/${encodeURIComponent(orderId)}`,
  );
}

export async function raisePartnerDeliveryException(
  orderId: string,
  input: {
    readonly expectedVersion: number;
    readonly reason: string;
    readonly evidenceReferences?: readonly string[];
    readonly commandId?: string;
  },
): Promise<DshPartnerDeliveryTaskResponse> {
  const { commandId: suppliedCommandId, ...body } = input;
  return request<DshPartnerDeliveryTaskResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/partner-delivery/exception`,
    { method: "POST", body: { ...body, commandId: commandId("pd-exception", suppliedCommandId) } },
  );
}

function classified(
  kind: ClassifiedPartnerDeliveryError["kind"],
  code: PartnerDeliveryErrorCode | undefined,
  message: string | undefined,
): ClassifiedPartnerDeliveryError {
  return { kind, ...(code ? { code } : {}), ...(message ? { message } : {}) };
}

export function classifyPartnerDeliveryError(error: unknown): ClassifiedPartnerDeliveryError {
  const typed = error as { kind?: string; status?: number; code?: string; message?: string };
  if (typed?.kind === "network") return classified("network", undefined, typed.message);
  if (typed?.kind === "http") {
    const code = typed.code as PartnerDeliveryErrorCode | undefined;
    if (typed.status === 409) return classified("conflict", code ?? "VERSION_CONFLICT", typed.message);
    if (typed.status === 404) return classified("not_found", code ?? "NOT_FOUND", typed.message);
    if (typed.status === 403 || typed.status === 401) return classified("forbidden", code, typed.message);
    if (typed.status === 422) return classified("invalid", code, typed.message);
    if (typed.status === 400) return classified("invalid", code ?? "INVALID_REQUEST", typed.message);
    if (typed.status === 503) return classified("unavailable", code, typed.message);
  }
  return classified("unknown", undefined, typed?.message);
}
