import type { WltDshFieldCommissionReference } from "./wlt-field-commission.types";
import { wltFetchJson, type WltReferenceApiResult } from "../wlt-http/wlt-http-request";

export async function fetchWltFieldCommissionRef(
  baseUrl: string,
  partnerId: string,
): Promise<WltReferenceApiResult<WltDshFieldCommissionReference>> {
  return wltFetchJson<WltDshFieldCommissionReference>(
    `${baseUrl}/dsh/control-panel/finance/references/field-commission?partnerId=${encodeURIComponent(partnerId)}`,
    (body: unknown) => (body as any).reference as WltDshFieldCommissionReference,
  );
}
