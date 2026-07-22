import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshAddMessageInput,
  DshCreateTicketInput,
  DshSupportMessage,
  DshSupportTicket,
} from "./support.types";
import type { SupportMutationContext } from "./support-mutation-attempt";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "actor-support");

export async function createActorSupportTicket(
  input: DshCreateTicketInput,
  context: SupportMutationContext,
): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>("/dsh/support/tickets", {
    method: "POST",
    body: input,
    idempotencyKey: context.idempotencyKey,
    correlationId: context.correlationId,
  });
  return data.ticket;
}

export async function fetchActorSupportTickets(): Promise<readonly DshSupportTicket[]> {
  const data = await request<{ tickets: DshSupportTicket[] }>("/dsh/support/tickets");
  return data.tickets ?? [];
}

export async function fetchActorSupportTicket(ticketId: string): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>(
    `/dsh/support/tickets/${encodeURIComponent(ticketId)}`,
  );
  return data.ticket;
}

export async function fetchActorSupportMessages(
  ticketId: string,
): Promise<readonly DshSupportMessage[]> {
  const data = await request<{ messages: DshSupportMessage[] }>(
    `/dsh/support/tickets/${encodeURIComponent(ticketId)}/messages`,
  );
  return data.messages ?? [];
}

export async function addActorSupportMessage(
  ticketId: string,
  input: DshAddMessageInput,
  context: SupportMutationContext,
): Promise<DshSupportMessage> {
  const data = await request<{ message: DshSupportMessage }>(
    `/dsh/support/tickets/${encodeURIComponent(ticketId)}/messages`,
    {
      method: "POST",
      body: { body: input.body },
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
    },
  );
  return data.message;
}
