import { getIdentityAccessToken } from "@bthwani/core-identity";

export type DshRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type DshRequestOptions = {
  readonly method?: DshRequestMethod;
  readonly body?: unknown;
  readonly token?: string;
};

export function corrId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw { kind: "http", status: response.status, body: await response.text().catch(() => "") };
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/**
 * Shared authenticated HTTP client for DSH frontend `.api.ts` modules.
 * Centralizes the fetch/timeout/correlation-ID/error-shape logic that was
 * previously hand-copied per module.
 */
export function createDshHttpClient(baseUrl: string, corrPrefix: string, timeoutMs = 10000) {
  async function request<T>(path: string, options: DshRequestOptions = {}): Promise<T> {
    const token = options.token ?? getIdentityAccessToken();
    if (!token) throw { kind: "http", status: 401 };
    let response: Response;
    try {
      response = await fetch(new URL(path, baseUrl), {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "X-Correlation-ID": corrId(corrPrefix),
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
    }
    return parseResponse<T>(response);
  }
  return { request };
}

/** Unauthenticated variant for public (non-session) GET endpoints. */
export function createDshPublicHttpClient(baseUrl: string, timeoutMs = 10000) {
  async function request<T>(path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(new URL(path, baseUrl), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
    }
    return parseResponse<T>(response);
  }
  return { request };
}

/**
 * Raw `RequestInit`-style variant for callers that pre-serialize their own
 * body (`body: JSON.stringify(...)`) instead of passing a plain object.
 */
export function createDshRawHttpClient(baseUrl: string, corrPrefix: string, timeoutMs = 10000) {
  async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getIdentityAccessToken();
    if (!token) throw { kind: "http", status: 401 };
    let response: Response;
    try {
      response = await fetch(new URL(path, baseUrl), {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Correlation-ID": corrId(corrPrefix),
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
    }
    if (!response.ok) throw { kind: "http", status: response.status };
    return response.json() as Promise<T>;
  }
  return { req };
}
