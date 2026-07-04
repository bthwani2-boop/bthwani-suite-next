export type WltReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly message: string };

/**
 * Shared unauthenticated GET+parse helper for WLT-for-DSH reference endpoints.
 * Centralizes the fetch/ok-check/error-shape logic hand-copied per module.
 */
export async function wltFetchJson<T>(
  url: string,
  extract: (body: any) => T,
): Promise<WltReferenceApiResult<T>> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: extract(body) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}
