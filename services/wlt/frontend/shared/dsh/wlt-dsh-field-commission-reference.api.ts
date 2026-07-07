import type { WltDshFieldCommissionReference } from "./wlt-dsh-field-commission.types";
import { wltFetchJson, type WltReferenceApiResult } from "./wlt-dsh-http-request";

export async function fetchWltFieldCommissionRef(
  baseUrl: string,
  partnerId: string,
): Promise<WltReferenceApiResult<WltDshFieldCommissionReference>> {
  return wltFetchJson<WltDshFieldCommissionReference>(
    `${baseUrl}/wlt/references/field-commission?partnerId=${encodeURIComponent(partnerId)}`,
    (body: any) => body.reference as WltDshFieldCommissionReference,
  );
}
