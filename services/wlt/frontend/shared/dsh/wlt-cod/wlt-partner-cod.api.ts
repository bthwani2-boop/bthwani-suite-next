import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import { createDshHttpClient } from "../dsh-link/dsh-http-request";
import type {
  WltCodCustodyMutationResult,
  WltDshCodReference,
} from "./wlt-cod.api";

function partnerCodClient() {
  return createDshHttpClient(resolveDshApiBaseUrl(), "wlt-dsh-partner-cod");
}

export async function fetchPartnerCodRecords(): Promise<
  readonly WltDshCodReference[]
> {
  const response = await partnerCodClient().request<{
    readonly codRecords?: readonly WltDshCodReference[];
  }>("/dsh/partner/me/finance/cod-records");
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
    throw new Error("Invalid record or proof");
  }

  return partnerCodClient().request<WltCodCustodyMutationResult>(
    `/dsh/partner/me/finance/cod-records/${encodeURIComponent(normalizedRecordId)}/remit`,
    {
      method: "POST",
      body: { proofReference: normalizedProof, note: note.trim() },
    },
  );
}
