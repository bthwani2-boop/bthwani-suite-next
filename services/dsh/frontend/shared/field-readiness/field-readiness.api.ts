import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
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
} from "./field-readiness.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "field-readiness");

export type FieldMutationContext = {
  readonly correlationId: string;
  readonly idempotencyKey: string;
};

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function mutationContext(
  operation: string,
  identityParts: readonly unknown[],
  supplied?: FieldMutationContext,
): FieldMutationContext {
  const suppliedCorrelation = supplied?.correlationId.trim() ?? "";
  const suppliedIdempotency = supplied?.idempotencyKey.trim() ?? "";
  if (suppliedCorrelation || suppliedIdempotency) {
    if (!suppliedCorrelation || !suppliedIdempotency) {
      throw new Error("field mutation correlation and idempotency must be supplied together");
    }
    return {
      correlationId: suppliedCorrelation,
      idempotencyKey: suppliedIdempotency,
    };
  }

  const identity = identityParts
    .map((part) => (part === undefined || part === null ? "" : String(part).trim()))
    .join("|");
  if (!identity.replaceAll("|", "")) {
    throw new Error(`field mutation ${operation} has no stable business identity`);
  }
  const fingerprint = stableHash(`${operation}|${identity}`);
  return {
    correlationId: `field:${operation}:${fingerprint}`,
    idempotencyKey: `field:${operation}:${fingerprint}`,
  };
}

export async function createFieldVisit(
  storeId: string,
  input: DshCreateVisitInput,
  supplied?: FieldMutationContext,
): Promise<DshFieldVisit> {
  const headers = mutationContext(
    "create-visit",
    [storeId, input.visitType ?? "onboarding", input.startLocation.capturedAt],
    supplied,
  );
  const data = await request<{ visit: DshFieldVisit }>(
    `/dsh/field/stores/${encodeURIComponent(storeId)}/visits`,
    { method: "POST", body: input, ...headers },
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
  const headers = mutationContext("complete-visit", [visitId], supplied);
  const data = await request<{ visit: DshFieldVisit }>(
    `/dsh/field/visits/${encodeURIComponent(visitId)}/complete`,
    { method: "POST", body: input, ...headers },
  );
  return data.visit;
}

export async function upsertReadinessCheck(
  visitId: string,
  input: DshUpsertCheckInput,
  supplied?: FieldMutationContext,
): Promise<DshReadinessCheck> {
  const headers = mutationContext(
    "upsert-check",
    [visitId, input.checkType, input.status, input.evidenceUrl ?? "", input.notes ?? ""],
    supplied,
  );
  const data = await request<{ check: DshReadinessCheck }>(
    `/dsh/field/visits/${encodeURIComponent(visitId)}/checks`,
    { method: "PUT", body: input, ...headers },
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
  const headers = mutationContext(
    "create-escalation",
    [storeId, input.visitId ?? "", input.severity, input.category, input.description],
    supplied,
  );
  const data = await request<{ escalation: DshReadinessEscalation }>(
    `/dsh/field/stores/${encodeURIComponent(storeId)}/escalations`,
    { method: "POST", body: input, ...headers },
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
  const headers = mutationContext(
    "update-escalation",
    [escalationId, input.status, input.resolutionNote ?? ""],
    supplied,
  );
  const data = await request<{ escalation: DshReadinessEscalation }>(
    `/dsh/operator/field-readiness/escalations/${encodeURIComponent(escalationId)}`,
    { method: "PATCH", body: input, ...headers },
  );
  return data.escalation;
}

export async function fetchPartnerOnboardingStatus(storeId: string): Promise<DshOnboardingStatus> {
  return request<DshOnboardingStatus>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/onboarding-status`);
}

export async function fetchFieldWorkQueue(): Promise<DshFieldWorkQueue> {
  return request<DshFieldWorkQueue>("/dsh/field/work-queue");
}

export function classifyFieldReadinessError(error: unknown): {
  kind: "permission_denied" | "offline" | "not_found" | "error";
} {
  const typed = error as { kind?: string; status?: number };
  if (typed.kind === "http") {
    if (typed.status === 401 || typed.status === 403) return { kind: "permission_denied" };
    if (typed.status === 404) return { kind: "not_found" };
  }
  if (typed.kind === "network") return { kind: "offline" };
  return { kind: "error" };
}
