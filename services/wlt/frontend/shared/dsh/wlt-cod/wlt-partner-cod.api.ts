import { dshFetchJson, dshPostJson } from "../dsh-http/dsh-http-request";
import { resolveDshApiBaseUrl } from "../dsh-http/dsh-api-base-url";
import type {
  WltCodCustodyMutationResult,
  WltDshCodReference,
} from "./wlt-cod.api";

export async function fetchPartnerCodRecords(): Promise<
  readonly WltDshCodReference[]
> {
  const result = await dshFetchJson<{
    readonly codRecords?: readonly WltDshCodReference[];
  }>(
    `${resolveDshApiBaseUrl()}/dsh/partner/me/finance/cod-records`,
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
  const result = await dshPostJson<WltCodCustodyMutationResult>(
    `${resolveDshApiBaseUrl()}/dsh/partner/me/finance/cod-records/${encodeURIComponent(normalizedRecordId)}/remit`,
    { proofReference: normalizedProof, note: note.trim() },
    (body: unknown) => body as WltCodCustodyMutationResult
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
