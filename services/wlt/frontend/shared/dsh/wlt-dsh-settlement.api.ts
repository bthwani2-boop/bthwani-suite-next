import type { WltDshSettlementReference, WltDshSettlementSummary } from "./wlt-dsh-boundary.types";
import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import type { WltReferenceApiResult } from "./wlt-dsh-reference.api";

export async function fetchWltSettlementsByPartner(
  partnerId: string,
): Promise<WltReferenceApiResult<WltDshSettlementReference[]>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, message: "WLT API base URL is not configured" };
  }
  try {
    const res = await fetch(
      `${baseUrl}/wlt/settlements?partnerId=${encodeURIComponent(partnerId)}`,
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: body.settlements as WltDshSettlementReference[] };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}

export async function fetchWltSettlementSummary(
  partnerId: string,
): Promise<WltReferenceApiResult<WltDshSettlementSummary>> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, message: "WLT API base URL is not configured" };
  }
  try {
    const res = await fetch(
      `${baseUrl}/wlt/settlements/summary?partnerId=${encodeURIComponent(partnerId)}`,
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: body.summary as WltDshSettlementSummary };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}
