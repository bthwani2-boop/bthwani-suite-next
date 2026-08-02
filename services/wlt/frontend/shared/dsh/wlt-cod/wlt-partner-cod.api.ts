import { wltFetchJson, wltPostJson } from "../wlt-http/wlt-http-request";
import { getWltApiBaseUrl } from "../wlt-http/wlt-api-base-url";
import type {
  WltCodCustodyMutationResult,
  WltDshCodReference,
} from "./wlt-cod.api";

export async function fetchPartnerCodRecords(): Promise<
  readonly WltDshCodReference[]
> {
  const result = await wltFetchJson<{
    readonly codRecords?: readonly WltDshCodReference[];
  }>(
    `${getWltApiBaseUrl()}/dsh/partner/me/finance/cod-records`,
    (body) => body as { readonly codRecords?: readonly WltDshCodReference[] },
  );
  if (!result.ok) throw new Error(result.message);
  return result.data.codRecords ?? [];
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
  const result = await wltPostJson<WltCodCustodyMutationResult>(
    `${getWltApiBaseUrl()}/dsh/partner/me/finance/cod-records/${encodeURIComponent(normalizedRecordId)}/remit`,
    { proofReference: normalizedProof, note: note.trim() },
    (body: unknown) => body as WltCodCustodyMutationResult
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
