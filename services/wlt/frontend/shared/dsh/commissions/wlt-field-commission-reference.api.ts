import type { WltDshFieldCommissionReference } from "./wlt-field-commission.types";
import {
  requestDshReference,
  type DshReferenceApiResult,
} from "../dsh-link/dsh-reference-client";

export async function fetchWltFieldCommissionRef(
  baseUrl: string,
  partnerId: string,
): Promise<DshReferenceApiResult<WltDshFieldCommissionReference>> {
  return requestDshReference<
    { readonly reference: WltDshFieldCommissionReference },
    WltDshFieldCommissionReference
  >(
    baseUrl,
    `/dsh/control-panel/finance/references/field-commission?partnerId=${encodeURIComponent(partnerId)}`,
    (response) => response.reference,
  );
}
