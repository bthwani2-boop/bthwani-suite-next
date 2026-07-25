import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { markActorSupportMessagesRead } from "./actor-support.api";
import type { SupportMutationContext } from "./support-mutation-attempt";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "support-message-delivery");

export type DshSupportMessageAttachment = {
  readonly id: string;
  readonly messageId: string;
  readonly assetUrl: string;
  readonly mimeType: string;
  readonly fileName?: string | undefined;
  readonly createdAt: string;
};

export type DshAttachActorSupportMessageAssetInput = {
  readonly assetUrl: string;
  readonly mimeType: string;
  readonly fileName?: string | undefined;
};

export async function attachActorSupportMessageAsset(
  ticketId: string,
  messageId: string,
  input: DshAttachActorSupportMessageAssetInput,
  context: SupportMutationContext,
): Promise<DshSupportMessageAttachment> {
  const data = await request<{ attachment: DshSupportMessageAttachment }>(
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

export { markActorSupportMessagesRead };
