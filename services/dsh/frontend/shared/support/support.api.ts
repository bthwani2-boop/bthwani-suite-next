import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  DshSupportTicket, DshSupportMessage, DshIncident,
  DshCreateTicketInput, DshAddMessageInput, DshUpdateTicketInput,
  DshCreateIncidentInput, DshUpdateIncidentInput,
} from "./support.types";

const baseUrl = resolveDshApiBaseUrl();

type RequestOptions = {
  readonly method?: "GET" | "POST" | "PATCH";
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
        "X-Correlation-ID": corrId("support"),
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

export async function createSupportTicket(input: DshCreateTicketInput): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>("/dsh/support/tickets", { method: "POST", body: input });
  return data.ticket;
}

export async function fetchMyTickets(): Promise<readonly DshSupportTicket[]> {
  const data = await request<{ tickets: DshSupportTicket[] }>("/dsh/support/tickets");
  return data.tickets ?? [];
}

export async function fetchTicket(ticketId: string): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>(`/dsh/support/tickets/${encodeURIComponent(ticketId)}`);
  return data.ticket;
}

export async function addTicketMessage(ticketId: string, input: DshAddMessageInput): Promise<DshSupportMessage> {
  const data = await request<{ message: DshSupportMessage }>(
    `/dsh/support/tickets/${encodeURIComponent(ticketId)}/messages`,
    { method: "POST", body: input },
  );
  return data.message;
}

export async function fetchTicketMessages(ticketId: string): Promise<readonly DshSupportMessage[]> {
  const data = await request<{ messages: DshSupportMessage[] }>(
    `/dsh/support/tickets/${encodeURIComponent(ticketId)}/messages`,
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

export async function updateTicket(ticketId: string, input: DshUpdateTicketInput): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>(
    `/dsh/operator/support/tickets/${encodeURIComponent(ticketId)}`,
    { method: "PATCH", body: input },
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
