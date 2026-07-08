import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";
import type { WltDshCodReference } from "@bthwani/wlt";
import type { WltReferenceApiResult } from "@bthwani/wlt/frontend/shared/dsh/wlt-dsh-http-request";

// WLT internal financial reads are service-authenticated; DSH surfaces read
// them through the governed DSH finance proxy, never from the browser.
const { request: wltGet } = createDshHttpClient(resolveDshApiBaseUrl(), "wlt-cod");

// Captain self-view: the DSH backend locks the captain id to the
// authenticated actor, so no captainId parameter exists here by design.
export async function fetchDshCaptainOwnCodRecords(): Promise<WltReferenceApiResult<WltDshCodReference[]>> {
  try {
    const body = await wltGet<{ codRecords?: WltDshCodReference[] }>("/dsh/captain/finance/cod-records");
    return { ok: true, data: body.codRecords ?? [] };
  } catch (e) {
    const err = e as { kind?: string; status?: number; body?: string; message?: string };
    if (err.kind === "http") {
      return { ok: false, kind: "http", ...(err.status !== undefined ? { status: err.status } : {}), message: err.body || `HTTP ${err.status ?? "error"}` };
    }
    return { ok: false, kind: "network", message: err.message ?? "network error" };
  }
}
