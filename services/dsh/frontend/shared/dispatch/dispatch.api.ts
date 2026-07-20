import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshCreateAssignmentInput,
  DshDeliveryException,
  DshDeliveryStatus,
  DshDispatchAssignment,
  DshSubmitPoDInput,
  DshReportDeliveryExceptionInput,
} from "./dispatch.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "dispatch");

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

export async function reportDeliveryException(assignmentId: string, input: DshReportDeliveryExceptionInput): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/exceptions`,
    { method: "POST", body: input },
  );
  return data.exception;
}

export async function fetchCaptainDeliveryException(assignmentId: string): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/exceptions`,
  );
  return data.exception;
}

export async function fetchOperatorDeliveryExceptions(status: "open" | "acknowledged" | "resolved"): Promise<readonly DshDeliveryException[]> {
  const data = await request<{ exceptions: DshDeliveryException[] }>(
    `/dsh/operator/delivery-exceptions?status=${encodeURIComponent(status)}`,
  );
  return data.exceptions ?? [];
}

export async function acknowledgeDeliveryException(id: string, expectedVersion: number): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/operator/delivery-exceptions/${encodeURIComponent(id)}/acknowledge`,
    { method: "POST", body: { expectedVersion } },
  );
  return data.exception;
}

export async function resolveDeliveryExceptionRetrySameCaptain(
  id: string,
  expectedVersion: number,
  note: string,
): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/operator/delivery-exceptions/${encodeURIComponent(id)}/resolve`,
    { method: "POST", body: { expectedVersion, action: "retry_same_captain", note } },
  );
  return data.exception;
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

export function getDshOrderLifecycleRuntimeClient() {
  return {
    assignCaptain(orderId: string, input: { readonly captain_id: string }) {
      return createDispatchAssignment({ orderId, captainId: input.captain_id });
    },
  };
}
