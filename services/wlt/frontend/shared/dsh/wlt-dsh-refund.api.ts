import type { WltDshRefundReference } from "./wlt-dsh-boundary.types";
import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import { wltFetchJson, type WltReferenceApiResult } from "./wlt-dsh-http-request";

export async function fetchWltRefund(
  refundId: string,
): Promise<WltReferenceApiResult<WltDshRefundReference>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, kind: "network", message: "WLT API base URL is not configured" };
  }
  return wltFetchJson<WltDshRefundReference>(
    `${baseUrl}/wlt/refunds/${encodeURIComponent(refundId)}`,
    (body: any) => body.refund as WltDshRefundReference,
  );
}

export async function fetchWltRefundsByOrder(
  orderId: string,
): Promise<WltReferenceApiResult<WltDshRefundReference[]>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, kind: "network", message: "WLT API base URL is not configured" };
  }
  return wltFetchJson<WltDshRefundReference[]>(
    `${baseUrl}/wlt/refunds?orderId=${encodeURIComponent(orderId)}`,
    (body: any) => body.refunds as WltDshRefundReference[],
  );
}
