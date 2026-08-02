import { createDshFlexibleHttpClient } from "../dsh-link/dsh-http-request";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";

export type DshReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly kind: "http" | "network"; readonly status?: number; readonly message: string };

let wltCorrelationSequence = 0;
function wltCorrId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `wlt-${uuid}`;
  wltCorrelationSequence += 1;
  return `wlt-${Date.now().toString(36)}-${wltCorrelationSequence.toString(36)}`;
}

function getClient() {
  return createDshFlexibleHttpClient(resolveDshApiBaseUrl());
}

export async function dshFetchJson<T>(
  url: string,
  extract: (body: unknown) => T,
  timeoutMs = 10_000,
): Promise<DshReferenceApiResult<T>> {
  try {
    const data = await getClient().request<any>(url, { method: "GET" });
    return { ok: true, data: extract(data) };
  } catch (error: any) {
    if (error && error.kind === "network") {
      return { ok: false, kind: "network", message: error.message || "network error" };
    }
    return { ok: false, kind: "http", status: error.status || 500, message: error.message || "HTTP error" };
  }
}

export async function dshPostJson<T>(
  url: string,
  body: unknown,
  extract: (body: unknown) => T,
  timeoutMs = 10_000,
): Promise<DshReferenceApiResult<T>> {
  try {
    const data = await getClient().request<any>(url, { method: "POST", body });
    return { ok: true, data: extract(data) };
  } catch (error: any) {
    if (error && error.kind === "network") {
      return { ok: false, kind: "network", message: error.message || "network error" };
    }
    return { ok: false, kind: "http", status: error.status || 500, message: error.message || "HTTP error" };
  }
}
