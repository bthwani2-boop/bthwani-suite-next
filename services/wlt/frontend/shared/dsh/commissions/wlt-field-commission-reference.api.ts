import type { WltDshFieldCommissionReference } from "./wlt-field-commission.types";
import { dshFetchJson, type DshReferenceApiResult } from "../dsh-http/dsh-http-request";

export async function fetchWltFieldCommissionRef(
  baseUrl: string,
  partnerId: string,
): Promise<DshReferenceApiResult<WltDshFieldCommissionReference>> {
  return dshFetchJson<WltDshFieldCommissionReference>(
    `${baseUrl}/dsh/control-panel/finance/references/field-commission?partnerId=${encodeURIComponent(partnerId)}`,
    (body: unknown) => (body as any).reference as WltDshFieldCommissionReference,
  );
}
