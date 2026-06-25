import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
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

const baseUrl = resolveDshApiBaseUrl();

type RequestOptions = {
  readonly method?: "GET" | "POST" | "PUT" | "PATCH";
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
        "X-Correlation-ID": corrId("field-readiness"),
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

function corrId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}
