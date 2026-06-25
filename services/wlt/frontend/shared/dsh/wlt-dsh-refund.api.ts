import type { WltDshRefundReference } from "./wlt-dsh-boundary.types";
import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import type { WltReferenceApiResult } from "./wlt-dsh-reference.api";

export async function fetchWltRefund(
  refundId: string,
): Promise<WltReferenceApiResult<WltDshRefundReference>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, message: "WLT API base URL is not configured" };
  }
  try {
    const res = await fetch(
      `${baseUrl}/wlt/refunds/${encodeURIComponent(refundId)}`,
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: body.refund as WltDshRefundReference };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}

export async function fetchWltRefundsByOrder(
  orderId: string,
): Promise<WltReferenceApiResult<WltDshRefundReference[]>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, message: "WLT API base URL is not configured" };
  }
  try {
    const res = await fetch(
      `${baseUrl}/wlt/refunds?orderId=${encodeURIComponent(orderId)}`,
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: body.refunds as WltDshRefundReference[] };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}
