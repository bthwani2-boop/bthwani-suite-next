import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshCreateIncidentInput,
  DshIncident,
  DshIncidentStatus,
  DshUpdateIncidentInput,
} from "./support.types";
import type { SupportMutationContext } from "./support-mutation-attempt";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "support-incidents");

export type DshIncidentEvent = {
  readonly id: string;
  readonly incidentId: string;
  readonly actorId: string;
  readonly eventType: "created" | "monitoring_started" | "reopened" | "resolved" | "status_changed";
  readonly fromStatus?: DshIncidentStatus | "";
  readonly toStatus: DshIncidentStatus;
  readonly correlationId: string;
  readonly createdAt: string;
};

export type GovernedIncidentUpdateInput = DshUpdateIncidentInput & {
  readonly expectedStatus: DshIncidentStatus;
};

export async function createGovernedIncident(
  input: DshCreateIncidentInput,
  context: SupportMutationContext,
): Promise<DshIncident> {
  const data = await request<{ incident: DshIncident }>("/dsh/operator/support/incidents", {
    method: "POST",
    body: input,
    idempotencyKey: context.idempotencyKey,
    correlationId: context.correlationId,
  });
  return data.incident;
}

export async function fetchGovernedIncidents(
  statusFilter?: DshIncidentStatus,
): Promise<readonly DshIncident[]> {
  const path = statusFilter
    ? `/dsh/operator/support/incidents?status=${encodeURIComponent(statusFilter)}`
    : "/dsh/operator/support/incidents";
  const data = await request<{ incidents: DshIncident[] }>(path);
  return data.incidents ?? [];
}

export async function fetchGovernedIncident(incidentId: string): Promise<DshIncident> {
  const data = await request<{ incident: DshIncident }>(
    `/dsh/operator/support/incidents/${encodeURIComponent(incidentId)}`,
  );
  return data.incident;
}

export async function updateGovernedIncident(
  incidentId: string,
  input: GovernedIncidentUpdateInput,
  context: SupportMutationContext,
): Promise<DshIncident> {
  const data = await request<{ incident: DshIncident }>(
    `/dsh/operator/support/incidents/${encodeURIComponent(incidentId)}`,
    {
      method: "PATCH",
      body: input,
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
    },
  );
  return data.incident;
}

export async function fetchGovernedIncidentEvents(
  incidentId: string,
): Promise<readonly DshIncidentEvent[]> {
  const data = await request<{ events: DshIncidentEvent[] }>(
    `/dsh/operator/support/incidents/${encodeURIComponent(incidentId)}/events`,
  );
  return data.events ?? [];
}
