import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { secureRandomId } from "../_kernel/secure-random.ts";
import type {
  DshFieldVisit,
  DshReadinessCheck,
  DshReadinessEscalation,
  DshOnboardingStatus,
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

export type FieldMutationContext = {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  /** Canonical local identity of the business intent. Never sent as an HTTP header. */
  readonly intentFingerprint?: string;
};

type MutationIdentityPart = readonly [
  "undefined" | "null" | "string" | "number" | "boolean" | "bigint",
  string,
];

function normalizeIdentityPart(part: unknown): MutationIdentityPart {
  if (part === undefined) return ["undefined", ""];
  if (part === null) return ["null", ""];
  if (typeof part === "string") return ["string", part.trim()];
  if (typeof part === "number") {
    if (!Number.isFinite(part)) throw new Error("field mutation identity contains a non-finite number");
    return ["number", String(part)];
  }
  if (typeof part === "boolean") return ["boolean", String(part)];
  if (typeof part === "bigint") return ["bigint", part.toString()];
  throw new Error("field mutation identity parts must be scalar values");
}

function buildIntentFingerprint(operation: string, identityParts: readonly unknown[]): string {
  const normalizedOperation = operation.trim();
  if (!normalizedOperation) throw new Error("field mutation operation is required");
  const normalizedParts = identityParts.map(normalizeIdentityPart);
  if (!normalizedParts.some(([, value]) => value.length > 0)) {
    throw new Error(`field mutation ${normalizedOperation} has no stable business identity`);
  }
  return JSON.stringify([normalizedOperation, normalizedParts]);
}

export function buildFieldMutationContext(
  operation: string,
  identityParts: readonly unknown[],
  supplied?: FieldMutationContext,
): FieldMutationContext {
  const normalizedOperation = operation.trim();
  const intentFingerprint = buildIntentFingerprint(normalizedOperation, identityParts);
  const suppliedCorrelation = supplied?.correlationId.trim() ?? "";
  const suppliedIdempotency = supplied?.idempotencyKey.trim() ?? "";
  const suppliedFingerprint = supplied?.intentFingerprint?.trim() ?? "";

  if (suppliedCorrelation || suppliedIdempotency || suppliedFingerprint) {
    if (!suppliedCorrelation || !suppliedIdempotency) {
      throw new Error("field mutation correlation and idempotency must be supplied together");
    }
    if (suppliedFingerprint && suppliedFingerprint !== intentFingerprint) {
      throw new Error("field mutation context does not match the current business intent");
    }
    return {
      correlationId: suppliedCorrelation,
      idempotencyKey: suppliedIdempotency,
      intentFingerprint,
    };
  }

  return {
    idempotencyKey: `field:${normalizedOperation}:${secureRandomId()}`,
    correlationId: `field:${normalizedOperation}:corr:${secureRandomId()}`,
    intentFingerprint,
  };
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
    "create-visit",
    [storeId, input.visitType ?? "onboarding", input.startLocation.capturedAt],
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
  const context = buildFieldMutationContext("complete-visit", [visitId], supplied);
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
    "upsert-check",
    [visitId, input.checkType, input.status, input.evidenceUrl ?? "", input.notes ?? ""],
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
    "create-escalation",
    [storeId, input.visitId ?? "", input.severity, input.category, input.description],
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
    "update-escalation",
    [escalationId, input.status, input.resolutionNote ?? ""],
    supplied,
  );
  const data = await request<{ escalation: DshReadinessEscalation }>(
    `/dsh/operator/field-readiness/escalations/${encodeURIComponent(escalationId)}`,
    { method: "PATCH", body: input, ...mutationRequestContext(context) },
  );
  return data.escalation;
}

export async function fetchPartnerOnboardingStatus(storeId: string): Promise<DshOnboardingStatus> {
  return request<DshOnboardingStatus>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/onboarding-status`);
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
