import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "support-message-delivery");

export type DshSupportMessageAttachment = {
  readonly id: string;
  readonly ticketId: string;
  readonly messageId: string;
  readonly mediaAssetId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly attachedBy: string;
  readonly isInternal: boolean;
  readonly createdAt: string;
};

export type DshSupportMessageAttachmentInput = {
  readonly mediaAssetId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly isInternal?: boolean | undefined;
};

export type DshSupportMessageReadReceipt = {
  readonly ticketId: string;
  readonly actorId: string;
  readonly actorRole: "client" | "partner" | "captain" | "operator";
  readonly markedCount: number;
  readonly readAt: string;
};

function actorAttachmentPath(ticketId: string, messageId: string): string {
  return `/dsh/support/tickets/${encodeURIComponent(ticketId)}/messages/${encodeURIComponent(messageId)}/attachments`;
}

function operatorAttachmentPath(ticketId: string, messageId: string): string {
  return `/dsh/operator/support/tickets/${encodeURIComponent(ticketId)}/messages/${encodeURIComponent(messageId)}/attachments`;
}

export async function attachActorSupportMessageAsset(
  ticketId: string,
  messageId: string,
  input: DshSupportMessageAttachmentInput,
): Promise<DshSupportMessageAttachment> {
  const data = await request<{ attachment: DshSupportMessageAttachment }>(actorAttachmentPath(ticketId, messageId), {
    method: "POST",
    body: input,
  });
  return data.attachment;
}

export async function fetchActorSupportMessageAttachments(
  ticketId: string,
  messageId: string,
): Promise<readonly DshSupportMessageAttachment[]> {
  const data = await request<{ attachments: DshSupportMessageAttachment[] }>(actorAttachmentPath(ticketId, messageId));
  return data.attachments ?? [];
}

export async function markActorSupportMessagesRead(ticketId: string): Promise<DshSupportMessageReadReceipt> {
  const data = await request<{ receipt: DshSupportMessageReadReceipt }>(
    `/dsh/support/tickets/${encodeURIComponent(ticketId)}/messages/read`,
    { method: "POST" },
  );
  return data.receipt;
}

export async function attachOperatorSupportMessageAsset(
  ticketId: string,
  messageId: string,
  input: DshSupportMessageAttachmentInput,
): Promise<DshSupportMessageAttachment> {
  const data = await request<{ attachment: DshSupportMessageAttachment }>(operatorAttachmentPath(ticketId, messageId), {
    method: "POST",
    body: input,
  });
  return data.attachment;
}

export async function fetchOperatorSupportMessageAttachments(
  ticketId: string,
  messageId: string,
): Promise<readonly DshSupportMessageAttachment[]> {
  const data = await request<{ attachments: DshSupportMessageAttachment[] }>(operatorAttachmentPath(ticketId, messageId));
  return data.attachments ?? [];
}

export async function markOperatorSupportMessagesRead(ticketId: string): Promise<DshSupportMessageReadReceipt> {
  const data = await request<{ receipt: DshSupportMessageReadReceipt }>(
    `/dsh/operator/support/tickets/${encodeURIComponent(ticketId)}/messages/read`,
    { method: "POST" },
  );
  return data.receipt;
}
