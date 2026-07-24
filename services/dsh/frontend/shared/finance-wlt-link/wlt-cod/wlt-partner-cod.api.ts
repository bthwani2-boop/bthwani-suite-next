import type { WltDshCodReference } from "@bthwani/wlt";
import { corrId, createDshHttpClient } from "../../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import type { WltCodCustodyMutationResult } from "./wlt-cod.api";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "partner-cod");

export async function fetchPartnerCodRecords(): Promise<readonly WltDshCodReference[]> {
  const response = await request<{ readonly codRecords?: readonly WltDshCodReference[] }>(
    "/dsh/partner/me/finance/cod-records",
  );
  return response.codRecords ?? [];
}

export async function remitPartnerCodRecord(
  recordId: string,
  proofReference: string,
  note = "",
): Promise<WltCodCustodyMutationResult> {
  const normalizedRecordId = recordId.trim();
  const normalizedProof = proofReference.trim();
  if (!normalizedRecordId || normalizedProof.length < 3) {
    throw new Error("مرجع إثبات تسليم العهدة مطلوب.");
  }
  const correlationId = corrId("partner-cod-remit");
  return request<WltCodCustodyMutationResult>(
    `/dsh/partner/me/finance/cod-records/${encodeURIComponent(normalizedRecordId)}/remit`,
    {
      method: "POST",
      correlationId,
      idempotencyKey: `${correlationId}:${normalizedRecordId}:${normalizedProof}`,
      body: { proofReference: normalizedProof, note: note.trim() },
    },
  );
}
