import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshFieldVisit,
  DshReadinessCheck,
  DshReadinessEscalation,
  DshOnboardingStatus,
  DshCreateVisitInput,
  DshUpsertCheckInput,
  DshCreateEscalationInput,
  DshUpdateEscalationInput,
} from "./field-readiness.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "field-readiness");

export async function createFieldVisit(storeId: string, input: DshCreateVisitInput): Promise<DshFieldVisit> {
  const data = await request<{ visit: DshFieldVisit }>(
    `/dsh/field/stores/${encodeURIComponent(storeId)}/visits`,
    { method: "POST", body: input },
  );
  return data.visit;
}

export async function fetchFieldVisits(storeId: string): Promise<readonly DshFieldVisit[]> {
  const data = await request<{ visits: DshFieldVisit[] }>(
    `/dsh/field/stores/${encodeURIComponent(storeId)}/visits`,
  );
  return data.visits ?? [];
}

export async function completeFieldVisit(visitId: string): Promise<DshFieldVisit> {
  const data = await request<{ visit: DshFieldVisit }>(
    `/dsh/field/visits/${encodeURIComponent(visitId)}/complete`,
    { method: "POST" },
  );
  return data.visit;
}

export async function upsertReadinessCheck(visitId: string, input: DshUpsertCheckInput): Promise<DshReadinessCheck> {
  const data = await request<{ check: DshReadinessCheck }>(
    `/dsh/field/visits/${encodeURIComponent(visitId)}/checks`,
    { method: "PUT", body: input },
  );
  return data.check;
}

export async function fetchVisitChecks(visitId: string): Promise<readonly DshReadinessCheck[]> {
  const data = await request<{ checks: DshReadinessCheck[] }>(
    `/dsh/field/visits/${encodeURIComponent(visitId)}/checks`,
  );
  return data.checks ?? [];
}

export async function createReadinessEscalation(storeId: string, input: DshCreateEscalationInput): Promise<DshReadinessEscalation> {
  const data = await request<{ escalation: DshReadinessEscalation }>(
    `/dsh/field/stores/${encodeURIComponent(storeId)}/escalations`,
    { method: "POST", body: input },
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

export async function updateEscalation(escalationId: string, input: DshUpdateEscalationInput): Promise<DshReadinessEscalation> {
  const data = await request<{ escalation: DshReadinessEscalation }>(
    `/dsh/operator/field-readiness/escalations/${encodeURIComponent(escalationId)}`,
    { method: "PATCH", body: input },
  );
  return data.escalation;
}

export async function fetchPartnerOnboardingStatus(storeId: string): Promise<DshOnboardingStatus> {
  return request<DshOnboardingStatus>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/onboarding-status`);
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
