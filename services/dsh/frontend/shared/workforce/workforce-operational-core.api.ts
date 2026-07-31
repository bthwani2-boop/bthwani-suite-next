import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  OperationalCorePatch,
  OperationalCoreResponse,
  ProviderAvailabilityNotice,
  ProviderIncident,
  ProviderKind,
} from "./workforce.types";

const { request } = createDshHttpClient("/api/workforce", "workforce-operational-core", 15000);

type IndependentProviderKind = Extract<ProviderKind, "field" | "captain">;

function providerBase(kind: IndependentProviderKind, actorId: string): string {
  const collection = kind === "field" ? "field-agents" : "captains";
  return `/workforce/${collection}/${encodeURIComponent(actorId)}`;
}

export function getProviderOperationalCore(kind: IndependentProviderKind, actorId: string): Promise<OperationalCoreResponse> {
  return request<OperationalCoreResponse>(`${providerBase(kind, actorId)}/operational-core`);
}

export function patchProviderOperationalCore(
  kind: IndependentProviderKind,
  actorId: string,
  patch: OperationalCorePatch,
): Promise<OperationalCoreResponse> {
  return request<OperationalCoreResponse>(`${providerBase(kind, actorId)}/operational-core`, {
    method: "PATCH",
    body: patch,
  });
}

export type CreateProviderIncidentInput = {
  readonly actorId: string;
  readonly incidentCode: string;
  readonly sourceType?: string | undefined;
  readonly sourceId?: string | undefined;
  readonly description: string;
  readonly evidenceMediaRefs?: readonly string[] | undefined;
  readonly severity: "minor" | "major" | "critical";
  readonly policyId?: string | undefined;
  readonly proposedPenaltyMinorUnits?: number | undefined;
  readonly currency?: string | undefined;
};

export async function createProviderIncident(input: CreateProviderIncidentInput): Promise<ProviderIncident> {
  const result = await request<{ incident: ProviderIncident }>("/workforce/provider-incidents", {
    method: "POST",
    body: input,
  });
  return result.incident;
}

export async function listProviderIncidents(actorId: string, limit = 50): Promise<readonly ProviderIncident[]> {
  const result = await request<{ incidents: ProviderIncident[] }>(
    `/workforce/provider-incidents?actorId=${encodeURIComponent(actorId)}&limit=${Math.min(Math.max(limit, 1), 100)}`,
  );
  return result.incidents;
}

export type CreateAvailabilityNoticeInput = Pick<
  ProviderAvailabilityNotice,
  "noticeType" | "startsAt" | "endsAt" | "serviceZoneId" | "reasonCode" | "note"
>;
