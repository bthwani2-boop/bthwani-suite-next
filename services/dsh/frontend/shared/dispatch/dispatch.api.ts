import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshCaptainDispatchCandidate,
  DshCaptainDispatchProfileInput,
  DshCreateAssignmentInput,
  DshDeliveryException,
  DshDeliveryExceptionResolutionAction,
  DshDeliveryStatus,
  DshDispatchAssignment,
  DshDispatchDecision,
  DshGovernedCreateAssignmentInput,
  DshPartnerDispatchReference,
  DshReassignAssignmentInput,
  DshSubmitPoDInput,
  DshReportDeliveryExceptionInput,
} from "./dispatch.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "dispatch");

/** @deprecated JRN-014 operator surfaces must call createGovernedDispatchAssignment. */
export async function createDispatchAssignment(input: DshCreateAssignmentInput): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>("/dsh/operator/dispatch/assignments", {
    method: "POST",
    body: input,
  });
  return data.assignment;
}

export async function createGovernedDispatchAssignment(
  input: DshGovernedCreateAssignmentInput,
): Promise<{ readonly assignment: DshDispatchAssignment; readonly replayed: boolean }> {
  const data = await request<{ assignment: DshDispatchAssignment; replayed?: boolean }>(
    "/dsh/operator/dispatch/assignments",
    { method: "POST", body: input },
  );
  return { assignment: data.assignment, replayed: data.replayed === true };
}

export async function fetchOperatorDispatchAssignments(): Promise<readonly DshDispatchAssignment[]> {
  const data = await request<{ assignments: DshDispatchAssignment[] }>("/dsh/operator/dispatch/assignments");
  return data.assignments ?? [];
}

export async function fetchCaptainDispatchAssignments(): Promise<readonly DshDispatchAssignment[]> {
  const data = await request<{ assignments: DshDispatchAssignment[] }>("/dsh/captain/dispatch/assignments");
  return data.assignments ?? [];
}

export async function fetchCaptainDispatchCandidates(
  serviceAreaCode: string,
  tenantId = "default",
): Promise<readonly DshCaptainDispatchCandidate[]> {
  const params = new URLSearchParams({ serviceAreaCode, tenantId });
  const data = await request<{ candidates: DshCaptainDispatchCandidate[] }>(
    `/dsh/operator/dispatch/candidates?${params.toString()}`,
  );
  return data.candidates ?? [];
}

export async function upsertCaptainDispatchProfile(
  captainId: string,
  input: DshCaptainDispatchProfileInput,
): Promise<DshCaptainDispatchCandidate> {
  const data = await request<{ candidate: DshCaptainDispatchCandidate }>(
    `/dsh/operator/dispatch/captains/${encodeURIComponent(captainId)}/profile`,
    { method: "PUT", body: input },
  );
  return data.candidate;
}

export async function acceptDispatchAssignment(assignmentId: string): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/accept`,
    { method: "POST" },
  );
  return data.assignment;
}

export async function declineDispatchAssignment(
  assignmentId: string,
  reason: string,
  reasonCode = "captain_declined",
): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/decline`,
    { method: "POST", body: { reasonCode, reason } },
  );
  return data.assignment;
}

export async function reassignDispatchAssignment(
  assignmentId: string,
  input: DshReassignAssignmentInput,
): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/operator/dispatch/assignments/${encodeURIComponent(assignmentId)}/reassign`,
    { method: "POST", body: input },
  );
  return data.assignment;
}

export async function cancelDispatchAssignment(
  assignmentId: string,
  reasonCode: string,
  reason: string,
): Promise<void> {
  await request<void>(
    `/dsh/operator/dispatch/assignments/${encodeURIComponent(assignmentId)}/cancel`,
    { method: "POST", body: { reasonCode, reason } },
  );
}

export async function expireDispatchAssignments(
  tenantId = "default",
  limit = 100,
): Promise<number> {
  const data = await request<{ expiredCount: number }>(
    "/dsh/operator/dispatch/assignments/expire",
    { method: "POST", body: { tenantId, limit } },
  );
  return Math.max(0, Number(data.expiredCount ?? 0));
}

export async function fetchDispatchDecisions(input: {
  readonly tenantId?: string;
  readonly assignmentId?: string;
  readonly orderId?: string;
  readonly limit?: number;
}): Promise<readonly DshDispatchDecision[]> {
  const params = new URLSearchParams();
  if (input.tenantId) params.set("tenantId", input.tenantId);
  if (input.assignmentId) params.set("assignmentId", input.assignmentId);
  if (input.orderId) params.set("orderId", input.orderId);
  if (input.limit) params.set("limit", String(input.limit));
  const data = await request<{ decisions: DshDispatchDecision[] }>(
    `/dsh/operator/dispatch/decisions?${params.toString()}`,
  );
  return data.decisions ?? [];
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

export async function reportDeliveryException(
  assignmentId: string,
  input: DshReportDeliveryExceptionInput,
): Promise<DshDeliveryException> {
  await request<{ exception: DshDeliveryException }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/exceptions`,
    { method: "POST", body: input },
  );
  return fetchCaptainDeliveryException(assignmentId);
}

export async function reportCaptainHandoffException(
  assignmentId: string,
  input: DshReportDeliveryExceptionInput,
): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/handoff-exceptions`,
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

type DeliveryExceptionResolutionInput = {
  readonly action: DshDeliveryExceptionResolutionAction;
  readonly note: string;
  readonly newCaptainId?: string;
};

function requiresDeliveryExceptionAcknowledgement(error: unknown): boolean {
  const typed = error as { status?: number; body?: { message?: string }; message?: string };
  const message = typed.body?.message ?? typed.message ?? "";
  return typed.status === 409 && message.includes("acknowledge the exception");
}

async function resolveAcknowledgedDeliveryException(
  id: string,
  expectedVersion: number,
  input: DeliveryExceptionResolutionInput,
): Promise<DshDeliveryException> {
  const path = `/dsh/operator/delivery-exceptions/${encodeURIComponent(id)}/resolve`;
  const execute = async (version: number) => {
    const data = await request<{ exception: DshDeliveryException }>(path, {
      method: "POST",
      body: { expectedVersion: version, ...input },
    });
    return data.exception;
  };

  try {
    return await execute(expectedVersion);
  } catch (error) {
    if (!requiresDeliveryExceptionAcknowledgement(error)) throw error;
    const acknowledged = await acknowledgeDeliveryException(id, expectedVersion);
    return execute(acknowledged.version);
  }
}

export function resolveDeliveryExceptionRetrySameCaptain(
  id: string,
  expectedVersion: number,
  note: string,
): Promise<DshDeliveryException> {
  return resolveAcknowledgedDeliveryException(id, expectedVersion, {
    action: "retry_same_captain",
    note,
  });
}

export function resolveDeliveryExceptionReassignCaptain(
  id: string,
  expectedVersion: number,
  newCaptainId: string,
  note: string,
): Promise<DshDeliveryException> {
  return resolveAcknowledgedDeliveryException(id, expectedVersion, {
    action: "reassign_captain",
    newCaptainId,
    note,
  });
}

export function resolveDeliveryExceptionReturnToStore(
  id: string,
  expectedVersion: number,
  note: string,
): Promise<DshDeliveryException> {
  return resolveAcknowledgedDeliveryException(id, expectedVersion, {
    action: "return_to_store",
    note,
  });
}

export function resolveDeliveryExceptionCancelOrder(
  id: string,
  expectedVersion: number,
  note: string,
): Promise<DshDeliveryException> {
  return resolveAcknowledgedDeliveryException(id, expectedVersion, {
    action: "cancel_order",
    note,
  });
}

export async function arriveCaptainReturnToStore(assignmentId: string): Promise<DshDeliveryException> {
  await request<{ exception: DshDeliveryException }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/return-to-store/arrive`,
    { method: "POST" },
  );
  return fetchCaptainDeliveryException(assignmentId);
}

export async function fetchPartnerReturnToStore(orderId: string): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/return-to-store`,
  );
  return data.exception;
}

export async function acceptPartnerReturnToStore(orderId: string): Promise<DshDeliveryException> {
  await request<{ exception: DshDeliveryException }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/return-to-store/accept`,
    { method: "POST" },
  );
  return fetchPartnerReturnToStore(orderId);
}

export async function fetchClientOrderTracking(orderId: string): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}/tracking`,
  );
  return data.assignment;
}

export async function fetchPartnerDispatchTracking(orderId: string): Promise<DshPartnerDispatchReference | null> {
  const data = await request<{ assignment: DshPartnerDispatchReference | null }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/dispatch-tracking`,
  );
  return data.assignment;
}

export type DshDispatchError = {
  readonly kind: "permission_denied" | "offline" | "conflict" | "not_found" | "error";
  readonly code?: string;
  readonly message?: string;
};

export function classifyDispatchError(error: unknown): DshDispatchError {
  const typed = error as {
    kind?: string;
    status?: number;
    message?: string;
    body?: { code?: string; message?: string };
  };
  const code = typed.body?.code;
  const message = typed.body?.message ?? typed.message;
  const details = {
    ...(code !== undefined ? { code } : {}),
    ...(message !== undefined ? { message } : {}),
  };
  if (typed.kind === "http") {
    if (typed.status === 401 || typed.status === 403) return { kind: "permission_denied", ...details };
    if (typed.status === 404) return { kind: "not_found", ...details };
    if (typed.status === 409) return { kind: "conflict", ...details };
  }
  if (typed.kind === "network") return { kind: "offline", ...details };
  return { kind: "error", ...details };
}

export function getDshOrderLifecycleRuntimeClient() {
  return {
    assignCaptain(
      orderId: string,
      input: {
        readonly captain_id: string;
        readonly service_area_code: string;
        readonly idempotency_key: string;
        readonly priority?: number;
        readonly distance_meters?: number;
      },
    ) {
      return createGovernedDispatchAssignment({
        orderId,
        captainId: input.captain_id,
        serviceAreaCode: input.service_area_code,
        idempotencyKey: input.idempotency_key,
        ...(input.priority === undefined ? {} : { priority: input.priority }),
        ...(input.distance_meters === undefined ? {} : { distanceMeters: input.distance_meters }),
      }).then((result) => result.assignment);
    },
  };
}
