import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshCreateTicketInput,
  DshSupportMessage,
  DshSupportTicket,
} from "./support.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "partner-support");

export type PartnerSupportMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export async function listPartnerSupportTickets(): Promise<readonly DshSupportTicket[]> {
  const data = await request<{ tickets: DshSupportTicket[] }>("/dsh/partner/support/tickets");
  return data.tickets ?? [];
}

export async function createPartnerSupportTicket(
  input: DshCreateTicketInput,
  context: PartnerSupportMutationContext,
): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>("/dsh/partner/support/tickets", {
    method: "POST",
    body: input,
    idempotencyKey: context.idempotencyKey,
    correlationId: context.correlationId,
  });
  return data.ticket;
}

export async function getPartnerSupportTicket(ticketId: string): Promise<DshSupportTicket> {
  const data = await request<{ ticket: DshSupportTicket }>(
    `/dsh/partner/support/tickets/${encodeURIComponent(ticketId)}`,
  );
  return data.ticket;
}

export async function listPartnerSupportMessages(ticketId: string): Promise<readonly DshSupportMessage[]> {
  const data = await request<{ messages: DshSupportMessage[] }>(
    `/dsh/partner/support/tickets/${encodeURIComponent(ticketId)}/messages`,
  );
  return data.messages ?? [];
}

export async function addPartnerSupportMessage(
  ticketId: string,
  body: string,
  context: PartnerSupportMutationContext,
): Promise<DshSupportMessage> {
  const data = await request<{ message: DshSupportMessage }>(
    `/dsh/partner/support/tickets/${encodeURIComponent(ticketId)}/messages`,
    {
      method: "POST",
      body: { body },
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
    },
  );
  return data.message;
}
