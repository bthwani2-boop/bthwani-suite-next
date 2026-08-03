import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import {
  corrId,
  createDshHttpClient,
} from "../dsh-link/dsh-http-request";
import type {
  WltCodCustodyMutationResult,
  WltDshCodReference,
} from "./wlt-cod.api";

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "partner-cod",
);

export async function fetchPartnerCodRecords(): Promise<
  readonly WltDshCodReference[]
> {
  const body = await request<{
    readonly codRecords?: readonly WltDshCodReference[];
  }>("/dsh/partner/me/finance/cod-records");
  return body.codRecords ?? [];
}

export async function remitPartnerCodRecord(
  recordId: string,
  proofReference: string,
  note = "",
): Promise<WltCodCustodyMutationResult> {
  const normalizedRecordId = recordId.trim();
  const normalizedProof = proofReference.trim();
  if (!normalizedRecordId || normalizedProof.length < 3) {
    throw new Error("Invalid record or proof");
  }

  const correlationId = corrId("partner-cod-remit");
  return request<WltCodCustodyMutationResult>(
    `/dsh/partner/me/finance/cod-records/${encodeURIComponent(normalizedRecordId)}/remit`,
    {
      method: "POST",
      correlationId,
      idempotencyKey: `${correlationId}:${normalizedRecordId}:remit`,
      body: { proofReference: normalizedProof, note: note.trim() },
    },
  );
}
