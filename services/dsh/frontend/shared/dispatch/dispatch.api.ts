import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshCaptainDispatchCandidate,
  DshCaptainDispatchProfileInput,
  DshCaptainAvailability,
  DshCaptainAvailabilityStatus,
  DshCaptainReadiness,
  DshDeliveryException,
  DshDeliveryExceptionResolutionAction,
  DshDeliveryStatus,
  DshDispatchAssignment,
  DshDispatchDecision,
  DshGovernedCreateAssignmentInput,
  DshPartnerDispatchReference,
  DshReassignAssignmentInput,
	DshReportDeliveryExceptionInput,
} from "./dispatch.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "dispatch");

export function fetchOwnCaptainReadiness(): Promise<DshCaptainReadiness> {
  return request<DshCaptainReadiness>("/dsh/captain/me/readiness");
}

export function fetchOwnCaptainAvailability(): Promise<DshCaptainAvailability> {
  return request<DshCaptainAvailability>("/dsh/captain/dispatch/availability");
}

export type DshCaptainCommandContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};
export type DshOperatorCommandContext = DshCaptainCommandContext;
export type DshCaptainAvailabilityMutationContext = DshCaptainCommandContext;

export async function setOwnCaptainAvailability(
  status: Extract<DshCaptainAvailabilityStatus, "available" | "unavailable">,
  expectedVersion: number,
  mutation: DshCaptainCommandContext,
): Promise<DshCaptainAvailability> {
  const readback = await request<DshCaptainAvailability>("/dsh/captain/dispatch/availability", {
    method: "PATCH",
    body: { status, expectedVersion },
    idempotencyKey: mutation.idempotencyKey,
    correlationId: mutation.correlationId,
    expectedVersion,
  });
  if (readback.status !== status || readback.version <= expectedVersion) {
    throw new Error("Captain availability mutation returned a non-canonical readback");
  }
  return readback;
}

export function fetchOperatorCaptainReadiness(captainId: string): Promise<DshCaptainReadiness> {
  return request<DshCaptainReadiness>(
    `/dsh/operator/dispatch/captains/${encodeURIComponent(captainId)}/readiness`,
  );
}

export async function createGovernedDispatchAssignment(
  input: DshGovernedCreateAssignmentInput,
  mutation: DshOperatorCommandContext,
): Promise<{ readonly assignment: DshDispatchAssignment; readonly replayed: boolean }> {
  const { idempotencyKey, ...body } = input;
  if (idempotencyKey !== mutation.idempotencyKey) {
    throw new Error("dispatch assignment idempotency key does not match its command context");
  }
  const data = await request<{ assignment: DshDispatchAssignment; replayed?: boolean }>(
    "/dsh/operator/dispatch/assignments",
    {
      method: "POST",
      body,
      idempotencyKey: mutation.idempotencyKey,
      correlationId: mutation.correlationId,
    },
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
): Promise<readonly DshCaptainDispatchCandidate[]> {
  const params = new URLSearchParams({ serviceAreaCode });
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

export async function acceptDispatchAssignment(
  assignmentId: string,
  mutation: DshCaptainCommandContext,
): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/accept`,
    {
      method: "POST",
      idempotencyKey: mutation.idempotencyKey,
      correlationId: mutation.correlationId,
    },
  );
  return data.assignment;
}

export async function declineDispatchAssignment(
  assignmentId: string,
  reason: string,
  mutation: DshCaptainCommandContext,
  reasonCode = "captain_declined",
): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/decline`,
    {
      method: "POST",
      body: { reasonCode, reason },
      idempotencyKey: mutation.idempotencyKey,
      correlationId: mutation.correlationId,
    },
  );
  return data.assignment;
}

export async function reassignDispatchAssignment(
  assignmentId: string,
  input: DshReassignAssignmentInput,
  mutation: DshOperatorCommandContext,
): Promise<DshDispatchAssignment> {
  const { idempotencyKey, ...body } = input;
  if (idempotencyKey !== mutation.idempotencyKey) {
    throw new Error("dispatch reassignment idempotency key does not match its command context");
  }
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/operator/dispatch/assignments/${encodeURIComponent(assignmentId)}/reassign`,
    {
      method: "POST",
      body,
      idempotencyKey: mutation.idempotencyKey,
      correlationId: mutation.correlationId,
    },
  );
  return data.assignment;
}

export async function cancelDispatchAssignment(
  assignmentId: string,
  reasonCode: string,
  reason: string,
  mutation: DshOperatorCommandContext,
): Promise<void> {
  await request<void>(
    `/dsh/operator/dispatch/assignments/${encodeURIComponent(assignmentId)}/cancel`,
    {
      method: "POST",
      body: { reasonCode, reason },
      idempotencyKey: mutation.idempotencyKey,
      correlationId: mutation.correlationId,
    },
  );
}

export async function expireDispatchAssignments(
  limit = 100,
  mutation: DshOperatorCommandContext,
): Promise<number> {
  const data = await request<{ expiredCount: number }>(
    "/dsh/operator/dispatch/assignments/expire",
    {
      method: "POST",
      body: { limit },
      idempotencyKey: mutation.idempotencyKey,
      correlationId: mutation.correlationId,
    },
  );
  return Math.max(0, Number(data.expiredCount ?? 0));
}

export async function fetchDispatchDecisions(input: {
  readonly assignmentId?: string;
  readonly orderId?: string;
  readonly limit?: number;
}): Promise<readonly DshDispatchDecision[]> {
  const params = new URLSearchParams();
  if (input.assignmentId) params.set("assignmentId", input.assignmentId);
  if (input.orderId) params.set("orderId", input.orderId);
  if (input.limit) params.set("limit", String(input.limit));
  const data = await request<{ decisions: DshDispatchDecision[] }>(
    `/dsh/operator/dispatch/decisions?${params.toString()}`,
  );
  return data.decisions ?? [];
}

export type DshDeliveryStatusUpdateOptions = {
  readonly expectedVersion: number;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly mutation: DshCaptainCommandContext;
};

export async function updateDeliveryStatus(
  assignmentId: string,
  status: DshDeliveryStatus,
  options: DshDeliveryStatusUpdateOptions,
): Promise<DshDispatchAssignment> {
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/status`,
    {
      method: "POST",
      body: {
        status,
        version: options.expectedVersion,
        ...(options.latitude !== undefined ? { latitude: options.latitude } : {}),
        ...(options.longitude !== undefined ? { longitude: options.longitude } : {}),
      },
      expectedVersion: options.expectedVersion,
      idempotencyKey: options.mutation.idempotencyKey,
      correlationId: options.mutation.correlationId,
    },
  );
  return data.assignment;
}

export async function reportDeliveryException(
  assignmentId: string,
  input: DshReportDeliveryExceptionInput,
  mutation: DshCaptainCommandContext,
): Promise<DshDeliveryException> {
	await request<{ exception: DshDeliveryException }>(
		`/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/exceptions`,
		{
			method: "POST",
			body: { ...input, correlationId: mutation.correlationId },
			idempotencyKey: mutation.idempotencyKey,
			correlationId: mutation.correlationId,
		},
	);
  return fetchCaptainDeliveryException(assignmentId);
}

export async function reportCaptainHandoffException(
  assignmentId: string,
  input: DshReportDeliveryExceptionInput,
  mutation: DshCaptainCommandContext,
): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
		`/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/handoff-exceptions`,
		{
			method: "POST",
			body: { ...input, correlationId: mutation.correlationId },
			idempotencyKey: mutation.idempotencyKey,
			correlationId: mutation.correlationId,
		},
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

export async function acknowledgeDeliveryException(
  id: string,
  expectedVersion: number,
  mutation: DshOperatorCommandContext,
): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/operator/delivery-exceptions/${encodeURIComponent(id)}/acknowledge`,
    {
      method: "POST",
      body: { expectedVersion },
      idempotencyKey: mutation.idempotencyKey,
      correlationId: mutation.correlationId,
    },
  );
  return data.exception;
}

type DeliveryExceptionResolutionInput = {
  readonly action: DshDeliveryExceptionResolutionAction;
  readonly note: string;
  readonly newCaptainId?: string;
};

async function resolveAcknowledgedDeliveryException(
  id: string,
  expectedVersion: number,
  input: DeliveryExceptionResolutionInput,
  mutation: DshOperatorCommandContext,
): Promise<DshDeliveryException> {
  const path = `/dsh/operator/delivery-exceptions/${encodeURIComponent(id)}/resolve`;
  const data = await request<{ exception: DshDeliveryException }>(path, {
    method: "POST",
    body: { expectedVersion, ...input },
    idempotencyKey: mutation.idempotencyKey,
    correlationId: mutation.correlationId,
  });
  return data.exception;
}

export function resolveDeliveryExceptionRetrySameCaptain(
  id: string,
  expectedVersion: number,
  note: string,
  mutation: DshOperatorCommandContext,
): Promise<DshDeliveryException> {
  return resolveAcknowledgedDeliveryException(id, expectedVersion, {
    action: "retry_same_captain",
    note,
  }, mutation);
}

export function resolveDeliveryExceptionReassignCaptain(
  id: string,
  expectedVersion: number,
  newCaptainId: string,
  note: string,
  mutation: DshOperatorCommandContext,
): Promise<DshDeliveryException> {
  return resolveAcknowledgedDeliveryException(id, expectedVersion, {
    action: "reassign_captain",
    newCaptainId,
    note,
  }, mutation);
}

export function resolveDeliveryExceptionReturnToStore(
  id: string,
  expectedVersion: number,
  note: string,
  mutation: DshOperatorCommandContext,
): Promise<DshDeliveryException> {
  return resolveAcknowledgedDeliveryException(id, expectedVersion, {
    action: "return_to_store",
    note,
  }, mutation);
}

export function resolveDeliveryExceptionCancelOrder(
  id: string,
  expectedVersion: number,
  note: string,
  mutation: DshOperatorCommandContext,
): Promise<DshDeliveryException> {
  return resolveAcknowledgedDeliveryException(id, expectedVersion, {
    action: "cancel_order",
    note,
  }, mutation);
}

export async function arriveCaptainReturnToStore(
  assignmentId: string,
  mutation: DshCaptainCommandContext,
): Promise<DshDeliveryException> {
	await request<{ exception: DshDeliveryException }>(
		`/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/return-to-store/arrive`,
		{
			method: "POST",
			idempotencyKey: mutation.idempotencyKey,
			correlationId: mutation.correlationId,
		},
	);
  return fetchCaptainDeliveryException(assignmentId);
}

export async function fetchPartnerReturnToStore(orderId: string): Promise<DshDeliveryException> {
  const data = await request<{ exception: DshDeliveryException }>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/return-to-store`,
  );
  return data.exception;
}

export async function acceptPartnerReturnToStore(
  orderId: string,
  mutation: DshCaptainCommandContext,
): Promise<DshDeliveryException> {
	await request<{ exception: DshDeliveryException }>(
		`/dsh/partner/orders/${encodeURIComponent(orderId)}/return-to-store/accept`,
		{
			method: "POST",
			idempotencyKey: mutation.idempotencyKey,
			correlationId: mutation.correlationId,
		},
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
      mutation: DshOperatorCommandContext,
    ) {
      return createGovernedDispatchAssignment({
        orderId,
        captainId: input.captain_id,
        serviceAreaCode: input.service_area_code,
        idempotencyKey: input.idempotency_key,
        ...(input.priority === undefined ? {} : { priority: input.priority }),
        ...(input.distance_meters === undefined ? {} : { distanceMeters: input.distance_meters }),
      }, mutation).then((result) => result.assignment);
    },
  };
}
