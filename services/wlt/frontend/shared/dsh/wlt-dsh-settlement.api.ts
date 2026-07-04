import type { WltDshSettlementReference, WltDshSettlementSummary } from "./wlt-dsh-boundary.types";
import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import { wltFetchJson, type WltReferenceApiResult } from "./wlt-dsh-http-request";

export async function fetchWltSettlementsByPartner(
  partnerId: string,
): Promise<WltReferenceApiResult<WltDshSettlementReference[]>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, message: "WLT API base URL is not configured" };
  }
  return wltFetchJson<WltDshSettlementReference[]>(
    `${baseUrl}/wlt/settlements?partnerId=${encodeURIComponent(partnerId)}`,
    (body) => body.settlements as WltDshSettlementReference[],
  );
}

export async function fetchWltSettlementSummary(
  partnerId: string,
): Promise<WltReferenceApiResult<WltDshSettlementSummary>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, message: "WLT API base URL is not configured" };
  }
  return wltFetchJson<WltDshSettlementSummary>(
    `${baseUrl}/wlt/settlements/summary?partnerId=${encodeURIComponent(partnerId)}`,
    (body) => body.summary as WltDshSettlementSummary,
  );
}
