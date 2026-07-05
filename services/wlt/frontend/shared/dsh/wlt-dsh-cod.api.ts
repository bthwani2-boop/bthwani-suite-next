import type { WltDshCodReference, WltDshCommissionReference } from "./wlt-dsh-boundary.types";
import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import { wltFetchJson, type WltReferenceApiResult } from "./wlt-dsh-http-request";

export async function fetchWltCodRecordsByCapitain(
  captainId: string,
): Promise<WltReferenceApiResult<WltDshCodReference[]>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, kind: "network", message: "WLT API base URL is not configured" };
  }
  return wltFetchJson<WltDshCodReference[]>(
    `${baseUrl}/wlt/cod-records?captainId=${encodeURIComponent(captainId)}`,
    (body: any) => body.codRecords as WltDshCodReference[],
  );
}

export async function fetchWltCommissionsByOrder(
  orderId: string,
): Promise<WltReferenceApiResult<WltDshCommissionReference[]>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, kind: "network", message: "WLT API base URL is not configured" };
  }
  return wltFetchJson<WltDshCommissionReference[]>(
    `${baseUrl}/wlt/commissions?orderId=${encodeURIComponent(orderId)}`,
    (body: any) => body.commissions as WltDshCommissionReference[],
  );
}
