import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshSupportTicket,
  DshSupportMessage,
  DshSupportTicketEvent,
  DshIncident,
  DshCreateTicketInput,
  DshAddMessageInput,
  DshUpdateTicketInput,
  DshCreateIncidentInput,
  DshUpdateIncidentInput,
} from "./support.types";
import type { SupportMutationContext } from "./support-mutation-attempt";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "support");

export async function createSupportTicket(
  input: DshCreateTicketInput,
  context: SupportMutationContext,
): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>("/dsh/client/support/tickets", {
    method: "POST",
    body: input,
    idempotencyKey: context.idempotencyKey,
    correlationId: context.correlationId,
  });
  return data.ticket;
}

export async function fetchMyTickets(): Promise<readonly DshSupportTicket[]> {
  const data = await request<{ tickets: DshSupportTicket[] }>("/dsh/client/support/tickets");
  return data.tickets ?? [];
}

export async function fetchTicket(ticketId: string): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>(
    `/dsh/client/support/tickets/${encodeURIComponent(ticketId)}`,
  );
  return data.ticket;
}

export async function addTicketMessage(
  ticketId: string,
  input: DshAddMessageInput,
  context: SupportMutationContext,
): Promise<DshSupportMessage> {
  const data = await request<{ message: DshSupportMessage }>(
    `/dsh/client/support/tickets/${encodeURIComponent(ticketId)}/messages`,
    {
      method: "POST",
      body: { body: input.body },
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
    },
  );
  return data.message;
}

export async function fetchTicketMessages(ticketId: string): Promise<readonly DshSupportMessage[]> {
  const data = await request<{ messages: DshSupportMessage[] }>(
    `/dsh/client/support/tickets/${encodeURIComponent(ticketId)}/messages`,
  );
  return data.messages ?? [];
}

export async function fetchOperatorTickets(statusFilter?: string): Promise<readonly DshSupportTicket[]> {
  const path = statusFilter
    ? `/dsh/operator/support/tickets?status=${encodeURIComponent(statusFilter)}`
    : "/dsh/operator/support/tickets";
  const data = await request<{ tickets: DshSupportTicket[] }>(path);
  return data.tickets ?? [];
}

export async function fetchOperatorTicket(ticketId: string): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>(
    `/dsh/operator/support/tickets/${encodeURIComponent(ticketId)}`,
  );
  return data.ticket;
}

export async function fetchOperatorTicketMessages(ticketId: string): Promise<readonly DshSupportMessage[]> {
  const data = await request<{ messages: DshSupportMessage[] }>(
    `/dsh/operator/support/tickets/${encodeURIComponent(ticketId)}/messages`,
  );
  return data.messages ?? [];
}

export async function fetchOperatorTicketEvents(ticketId: string): Promise<readonly DshSupportTicketEvent[]> {
  const data = await request<{ events: DshSupportTicketEvent[] }>(
    `/dsh/operator/support/tickets/${encodeURIComponent(ticketId)}/events`,
  );
  return data.events ?? [];
}

export async function addOperatorTicketMessage(
  ticketId: string,
  input: DshAddMessageInput,
  context: SupportMutationContext,
): Promise<DshSupportMessage> {
  const data = await request<{ message: DshSupportMessage }>(
    `/dsh/operator/support/tickets/${encodeURIComponent(ticketId)}/messages`,
    {
      method: "POST",
      body: input,
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
    },
  );
  return data.message;
}

export async function updateTicket(
  ticketId: string,
  input: DshUpdateTicketInput,
  context: SupportMutationContext,
): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>(
    `/dsh/operator/support/tickets/${encodeURIComponent(ticketId)}`,
    {
      method: "PATCH",
      body: input,
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
    },
  );
  return data.ticket;
}

export async function createIncident(input: DshCreateIncidentInput): Promise<DshIncident> {
  const data = await request<{ incident: DshIncident }>("/dsh/operator/incidents", { method: "POST", body: input });
  return data.incident;
}

export async function fetchIncidents(statusFilter?: string): Promise<readonly DshIncident[]> {
  const path = statusFilter
    ? `/dsh/operator/incidents?status=${encodeURIComponent(statusFilter)}`
    : "/dsh/operator/incidents";
  const data = await request<{ incidents: DshIncident[] }>(path);
  return data.incidents ?? [];
}

export async function updateIncident(incidentId: string, input: DshUpdateIncidentInput): Promise<DshIncident> {
  const data = await request<{ incident: DshIncident }>(
    `/dsh/operator/incidents/${encodeURIComponent(incidentId)}`,
    { method: "PATCH", body: input },
  );
  return data.incident;
}

export function classifySupportError(error: unknown): {
  kind: "permission_denied" | "offline" | "not_found" | "conflict" | "error";
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
