export type WltReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly kind: "http" | "network"; readonly status?: number; readonly message: string };

function wltCorrId(): string {
  return `wlt-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

/**
 * Shared GET+parse helper for WLT **public reference** endpoints only
 * (/wlt/references/*). Centralizes fetch/timeout/correlation-id/ok-check/
 * error-shape logic.
 *
 * Only the public reference endpoints are unauthenticated by design. WLT's
 * internal financial reads (settlements, refunds, ledger, COD, commissions)
 * are service-authenticated and MUST be consumed through the governed DSH
 * finance proxy (/dsh/control-panel/finance/*, /dsh/captain/finance/*) —
 * never with this helper and never directly from the browser.
 */
export async function wltFetchJson<T>(
  url: string,
  extract: (body: unknown) => T,
  timeoutMs = 10_000,
): Promise<WltReferenceApiResult<T>> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Correlation-ID": wltCorrId(),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { ok: false, kind: "http", status: res.status, message: errBody || `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: extract(body) };
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return { ok: false, kind: "network", message: "request timed out" };
    }
    return { ok: false, kind: "network", message: e instanceof Error ? e.message : "network error" };
  }
}
