import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type { SupportMutationContext } from "./support-mutation-attempt";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "support-message-delivery");

export type DshSupportMessageAttachmentReceipt = {
  readonly id: string;
  readonly ticketId: string;
  readonly messageId: string;
  readonly mediaAssetId: string;
  readonly mimeType: string;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly attachedBy: string;
  readonly isInternal: boolean;
  readonly createdAt: string;
};

export type DshAttachActorSupportMessageAssetInput = {
  readonly mediaAssetId: string;
  readonly mimeType: string;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly isInternal?: boolean | undefined;
};

export async function attachActorSupportMessageAsset(
  ticketId: string,
  messageId: string,
  input: DshAttachActorSupportMessageAssetInput,
  context: SupportMutationContext,
): Promise<DshSupportMessageAttachmentReceipt> {
  const data = await request<{ attachment: DshSupportMessageAttachmentReceipt }>(
    `/dsh/support/tickets/${encodeURIComponent(ticketId)}/messages/${encodeURIComponent(messageId)}/attachments`,
    {
      method: "POST",
      body: input,
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
    },
  );
  return data.attachment;
}
