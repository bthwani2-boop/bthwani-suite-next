import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  DshCreateAssignmentInput,
  DshDeliveryStatus,
  DshDispatchAssignment,
  DshSubmitPoDInput,
} from "./dispatch.types";

const baseUrl = resolveDshApiBaseUrl();

type RequestOptions = {
  readonly method?: "GET" | "POST";
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
        "X-Correlation-ID": corrId("dispatch"),
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

export async function createDispatchAssignment(input: DshCreateAssignmentInput): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>("/dsh/operator/dispatch/assignments", {
    method: "POST",
    body: input,
  });
  return data.assignment;
}

export async function fetchOperatorDispatchAssignments(): Promise<readonly DshDispatchAssignment[]> {
  const data = await request<{ assignments: DshDispatchAssignment[] }>("/dsh/operator/dispatch/assignments");
  return data.assignments ?? [];
}

export async function fetchCaptainDispatchAssignments(): Promise<readonly DshDispatchAssignment[]> {
  const data = await request<{ assignments: DshDispatchAssignment[] }>("/dsh/captain/dispatch/assignments");
  return data.assignments ?? [];
}

export async function acceptDispatchAssignment(assignmentId: string): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/accept`,
    { method: "POST" },
  );
  return data.assignment;
}

export async function declineDispatchAssignment(assignmentId: string, reason: string): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/decline`,
    { method: "POST", body: { reason } },
  );
  return data.assignment;
}

export async function updateDeliveryStatus(assignmentId: string, status: DshDeliveryStatus): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/status`,
    { method: "POST", body: { status } },
  );
  return data.assignment;
}

export async function submitPoD(assignmentId: string, input: DshSubmitPoDInput): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/pod`,
    { method: "POST", body: input },
  );
  return data.assignment;
}

export async function fetchClientOrderTracking(orderId: string): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}/tracking`,
  );
  return data.assignment;
}

export function classifyDispatchError(error: unknown): {
  kind: "permission_denied" | "offline" | "conflict" | "not_found" | "error";
} {
  const typed = error as { kind?: string; status?: number };
  if (typed.kind === "http") {
    if (typed.status === 401 || typed.status === 403) return { kind: "permission_denied" };
    if (typed.status === 404) return { kind: "not_found" };
    if (typed.status === 409) return { kind: "conflict" };
  }
  if (typed.kind === "network") return { kind: "offline" };
  return { kind: "error" };
}

function corrId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}
