export type WltReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly kind: "http" | "network"; readonly status?: number; readonly message: string };

function wltCorrId(): string {
  return `wlt-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

/**
 * Shared unauthenticated GET+parse helper for WLT-for-DSH reference endpoints.
 * Centralizes fetch/timeout/correlation-id/ok-check/error-shape logic.
 *
 * WLT reference endpoints are read-only and unauthenticated by design —
 * auth is enforced at the DSH layer that initiates the call.
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
      return { ok: false, kind: "http", status: res.status, message: `HTTP ${res.status}` };
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
