import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import {
  createFieldMutationIdentity,
  validateFieldMutationIdentity,
  type FieldMutationIdentityContext,
} from "./field-intent-identity.ts";
import type {
  DshFieldVisit,
  DshReadinessCheck,
  DshReadinessEscalation,
  DshCreateVisitInput,
  DshCompleteVisitInput,
  DshUpsertCheckInput,
  DshCreateEscalationInput,
  DshUpdateEscalationInput,
  DshFieldWorkQueue,
  DshChecklistPolicy,
  DshChecklistPolicyItem,
} from "./field-readiness.types";

export {
  classifyGovernedError,
  createGovernedProblem,
} from "../_kernel/governed-problem";
export type {
  GovernedNextAction,
  GovernedProblem,
  GovernedProblemKind,
} from "../_kernel/governed-problem";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "field-readiness");

export type FieldMutationContext = FieldMutationIdentityContext;

export function buildFieldMutationContext(
  operation: string,
  payload: unknown,
  supplied?: Partial<FieldMutationContext>,
): FieldMutationContext {
  return supplied && (supplied.idempotencyKey || supplied.correlationId || supplied.intentFingerprint || supplied.operationId)
    ? validateFieldMutationIdentity(operation, payload, supplied)
    : createFieldMutationIdentity(operation, payload);
}

function mutationRequestContext(context: FieldMutationContext) {
  return {
    correlationId: context.correlationId,
    idempotencyKey: context.idempotencyKey,
  };
}

export async function createFieldVisit(
  storeId: string,
  input: DshCreateVisitInput,
  supplied?: FieldMutationContext,
): Promise<DshFieldVisit> {
  const context = buildFieldMutationContext(
    "create_visit",
    { storeId, input },
    supplied,
  );
  const data = await request<{ visit: DshFieldVisit }>(
    `/dsh/field/stores/${encodeURIComponent(storeId)}/visits`,
    { method: "POST", body: input, ...mutationRequestContext(context) },
  );
  return data.visit;
}

export async function fetchFieldVisits(storeId: string): Promise<readonly DshFieldVisit[]> {
  const data = await request<{ visits: DshFieldVisit[] }>(
    `/dsh/field/stores/${encodeURIComponent(storeId)}/visits`,
  );
  return data.visits ?? [];
}

export async function completeFieldVisit(
  visitId: string,
  input: DshCompleteVisitInput,
  supplied?: FieldMutationContext,
): Promise<DshFieldVisit> {
  const context = buildFieldMutationContext("complete_visit", { visitId, input }, supplied);
  const data = await request<{ visit: DshFieldVisit }>(
    `/dsh/field/visits/${encodeURIComponent(visitId)}/complete`,
    { method: "POST", body: input, ...mutationRequestContext(context) },
  );
  return data.visit;
}

export async function upsertReadinessCheck(
  visitId: string,
  input: DshUpsertCheckInput,
  supplied?: FieldMutationContext,
): Promise<DshReadinessCheck> {
  const context = buildFieldMutationContext(
    "upsert_readiness_check",
    { visitId, input },
    supplied,
  );
  const data = await request<{ check: DshReadinessCheck }>(
    `/dsh/field/visits/${encodeURIComponent(visitId)}/checks`,
    { method: "PUT", body: input, ...mutationRequestContext(context) },
  );
  return data.check;
}

export async function fetchVisitChecks(visitId: string): Promise<readonly DshReadinessCheck[]> {
  const data = await request<{ checks: DshReadinessCheck[] }>(
    `/dsh/field/visits/${encodeURIComponent(visitId)}/checks`,
  );
  return data.checks ?? [];
}

export async function createReadinessEscalation(
  storeId: string,
  input: DshCreateEscalationInput,
  supplied?: FieldMutationContext,
): Promise<DshReadinessEscalation> {
  const context = buildFieldMutationContext(
    "create_escalation",
    { storeId, input },
    supplied,
  );
  const data = await request<{ escalation: DshReadinessEscalation }>(
    `/dsh/field/stores/${encodeURIComponent(storeId)}/escalations`,
    { method: "POST", body: input, ...mutationRequestContext(context) },
  );
  return data.escalation;
}

export async function fetchOperatorEscalations(statusFilter?: string): Promise<readonly DshReadinessEscalation[]> {
  const path = statusFilter
    ? `/dsh/operator/field-readiness/escalations?status=${encodeURIComponent(statusFilter)}`
    : "/dsh/operator/field-readiness/escalations";
  const data = await request<{ escalations: DshReadinessEscalation[] }>(path);
  return data.escalations ?? [];
}

export async function updateEscalation(
  escalationId: string,
  input: DshUpdateEscalationInput,
  supplied?: FieldMutationContext,
): Promise<DshReadinessEscalation> {
  const context = buildFieldMutationContext(
    "update_escalation",
    { escalationId, input },
    supplied,
  );
  const data = await request<{ escalation: DshReadinessEscalation }>(
    `/dsh/operator/field-readiness/escalations/${encodeURIComponent(escalationId)}`,
    { method: "PATCH", body: input, ...mutationRequestContext(context) },
  );
  return data.escalation;
}

export async function fetchFieldWorkQueue(): Promise<DshFieldWorkQueue> {
  return request<DshFieldWorkQueue>("/dsh/field/work-queue");
}

export async function fetchChecklistPolicy(businessVerticalId: string): Promise<DshChecklistPolicy> {
  const data = await request<{ policy: DshChecklistPolicy }>(
    `/dsh/operator/field-readiness/checklist-policies/${encodeURIComponent(businessVerticalId)}`,
  );
  return data.policy;
}

export async function replaceChecklistPolicy(
  businessVerticalId: string,
  expectedVersion: number,
  items: readonly DshChecklistPolicyItem[],
): Promise<DshChecklistPolicy> {
  const data = await request<{ policy: DshChecklistPolicy }>(
    `/dsh/operator/field-readiness/checklist-policies/${encodeURIComponent(businessVerticalId)}`,
    { method: "PUT", body: { expectedVersion, items } },
  );
  return data.policy;
}

/**
 * Reads DSH's actor-scoped receipt after a response was lost. `false` is a
 * proved-not-committed result; transport failures remain errors and therefore
 * keep the queue in its persisted unknown state.
 */
export async function reconcileFieldMutation(
  operation: string,
  idempotencyKey: string,
): Promise<boolean> {
  try {
    await request(
      `/dsh/field/mutations/${encodeURIComponent(operation)}/${encodeURIComponent(idempotencyKey)}`,
    );
    return true;
  } catch (error) {
    const typed = (error && typeof error === "object" ? error : {}) as {
      readonly status?: unknown;
      readonly code?: unknown;
    };
    if (typed.status === 404 && typed.code === "MUTATION_NOT_COMMITTED") return false;
    throw error;
  }
}
