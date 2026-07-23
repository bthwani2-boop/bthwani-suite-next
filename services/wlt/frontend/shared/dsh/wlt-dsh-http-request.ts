import { getIdentityAccessToken } from "@bthwani/core-identity";

export type WltReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly kind: "http" | "network"; readonly status?: number; readonly message: string };

let wltCorrelationSequence = 0;
function wltCorrId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `wlt-${uuid}`;
  wltCorrelationSequence += 1;
  return `wlt-${Date.now().toString(36)}-${wltCorrelationSequence.toString(36)}`;
}

function isRelativeWltUrl(url: string): boolean {
  return url.startsWith("/");
}

/**
 * Shared GET+parse helper for WLT tenant-protected reference projections.
 * Control-panel calls use the same-origin HttpOnly BFF. Native applications
 * send their Identity bearer token directly; no client-supplied tenant header
 * is used as an ownership signal.
 *
 * Broad financial reads and all mutations remain service-authenticated and MUST
 * be consumed through governed DSH finance adapters.
 */
export async function wltFetchJson<T>(
  url: string,
  extract: (body: unknown) => T,
  timeoutMs = 10_000,
): Promise<WltReferenceApiResult<T>> {
  const cookieMode = isRelativeWltUrl(url);
  const token = cookieMode ? undefined : getIdentityAccessToken();
  if (!cookieMode && !token) {
    return {
      ok: false,
      kind: "http",
      status: 401,
      message: "Identity session is required",
    };
  }

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Correlation-ID": wltCorrId(),
        ...(!cookieMode && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(cookieMode ? { credentials: "include" as const } : {}),
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
