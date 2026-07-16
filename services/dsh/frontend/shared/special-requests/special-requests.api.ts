import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  ClassifiedSpecialRequestError,
  DshCreateSpecialRequest,
  DshSpecialRequestListResponse,
  DshSpecialRequestResponse,
  DshUpdateSpecialRequest,
} from "./special-requests.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "special-requests");

// --- Client-side ---------------------------------------------------------

export async function createSpecialRequest(
  input: DshCreateSpecialRequest,
  opts: { readonly idempotencyKey: string },
): Promise<DshSpecialRequestResponse> {
  return request<DshSpecialRequestResponse>("/dsh/client/special-requests", {
    method: "POST",
    body: input,
    idempotencyKey: opts.idempotencyKey,
  });
}

export async function fetchClientSpecialRequests(params: {
  readonly limit?: number;
  readonly offset?: number;
} = {}): Promise<DshSpecialRequestListResponse> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  return request<DshSpecialRequestListResponse>(`/dsh/client/special-requests${qs ? `?${qs}` : ""}`);
}

export async function fetchClientSpecialRequest(id: string): Promise<DshSpecialRequestResponse> {
  return request<DshSpecialRequestResponse>(`/dsh/client/special-requests/${encodeURIComponent(id)}`);
}

export async function cancelSpecialRequest(
  id: string,
  expectedVersion?: number,
): Promise<DshSpecialRequestResponse> {
  return request<DshSpecialRequestResponse>(
    `/dsh/client/special-requests/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      ...(expectedVersion !== undefined ? { body: { expectedVersion } } : {}),
    },
  );
}

export async function approveSpecialRequestQuote(
  id: string,
  expectedVersion: number,
): Promise<DshSpecialRequestResponse> {
  return request<DshSpecialRequestResponse>(
    `/dsh/client/special-requests/${encodeURIComponent(id)}/approve-quote`,
    {
      method: "POST",
      body: { expectedVersion },
    },
  );
}

// --- Operator-side ---------------------------------------------------------

export async function fetchOperatorSpecialRequests(params: {
  readonly limit?: number;
  readonly offset?: number;
  readonly requestType?: string;
  readonly status?: string;
  readonly workflowStage?: string;
} = {}): Promise<DshSpecialRequestListResponse> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.requestType) query.set("requestType", params.requestType);
  if (params.status) query.set("status", params.status);
  if (params.workflowStage) query.set("workflowStage", params.workflowStage);
  const qs = query.toString();
  return request<DshSpecialRequestListResponse>(`/dsh/operator/special-requests${qs ? `?${qs}` : ""}`);
}

export async function fetchOperatorSpecialRequest(id: string): Promise<DshSpecialRequestResponse> {
  return request<DshSpecialRequestResponse>(`/dsh/operator/special-requests/${encodeURIComponent(id)}`);
}

export async function updateOperatorSpecialRequest(
  id: string,
  input: DshUpdateSpecialRequest,
): Promise<DshSpecialRequestResponse> {
  return request<DshSpecialRequestResponse>(`/dsh/operator/special-requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function assignSpecialRequestDispatch(
  id: string,
  captainId: string,
): Promise<DshSpecialRequestResponse> {
  return request<DshSpecialRequestResponse>(
    `/dsh/operator/special-requests/${encodeURIComponent(id)}/dispatch`,
    {
      method: "POST",
      body: { captainId },
    },
  );
}

// --- Error classification ---------------------------------------------------------

function classified(
  kind: ClassifiedSpecialRequestError["kind"],
  message: string | undefined,
): ClassifiedSpecialRequestError {
  return message !== undefined ? { kind, message } : { kind };
}

export function classifySpecialRequestError(error: unknown): ClassifiedSpecialRequestError {
  const typed = error as { kind?: string; status?: number; code?: string; message?: string };
  if (typed?.kind === "network") {
    return classified("network", typed.message);
  }
  if (typed?.kind === "http") {
    if (typed.status === 409) {
      return classified("conflict", typed.message);
    }
    if (typed.status === 404) {
      return classified("not_found", typed.message);
    }
    if (typed.status === 403 || typed.status === 401) {
      return classified("forbidden", typed.message);
    }
    if (typed.status === 400) {
      return classified("invalid", typed.message);
    }
    if (typed.status === 503) {
      return classified("unavailable", typed.message);
    }
  }
  return classified("unknown", typed?.message);
}
