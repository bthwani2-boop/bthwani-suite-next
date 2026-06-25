import type { WltDshCodReference, WltDshCommissionReference } from "./wlt-dsh-boundary.types";
import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import type { WltReferenceApiResult } from "./wlt-dsh-reference.api";

export async function fetchWltCodRecordsByCapitain(
  captainId: string,
): Promise<WltReferenceApiResult<WltDshCodReference[]>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, message: "WLT API base URL is not configured" };
  }
  try {
    const res = await fetch(
      `${baseUrl}/wlt/cod-records?captainId=${encodeURIComponent(captainId)}`,
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: body.codRecords as WltDshCodReference[] };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}

export async function fetchWltCommissionsByOrder(
  orderId: string,
): Promise<WltReferenceApiResult<WltDshCommissionReference[]>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, message: "WLT API base URL is not configured" };
  }
  try {
    const res = await fetch(
      `${baseUrl}/wlt/commissions?orderId=${encodeURIComponent(orderId)}`,
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: body.commissions as WltDshCommissionReference[] };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}
