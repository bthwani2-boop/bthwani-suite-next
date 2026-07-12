import { getIdentityAccessToken } from "@bthwani/core-identity";

export type DshRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type DshRequestOptions = {
  readonly method?: DshRequestMethod;
  readonly body?: unknown;
  readonly token?: string;
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
};

export type DshSessionRequestResult<T> = {
  readonly ok: boolean;
  readonly status: number;
  readonly body: T | null;
  readonly error?: "network";
  readonly message?: string;
};

export function corrId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let code: string | undefined;
    let message: string | undefined;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.code === "string") code = parsed.code;
      if (parsed && typeof parsed.message === "string") message = parsed.message;
    } catch {
      // body was not a JSON error envelope; code/message stay undefined
    }
    throw { kind: "http", status: response.status, body, code, message };
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/**
 * `baseUrl` values that are same-origin relative paths (e.g. "/api/dsh")
 * address a same-origin BFF proxy: the browser never holds a bearer token,
 * and the HttpOnly session cookie rides along via `credentials: "include"`.
 * Absolute URLs keep the historical direct-to-backend bearer-token mode
 * used by native apps, which have no browser cookie jar/BFF to rely on.
 */
function isRelativeBaseUrl(baseUrl: string): boolean {
  return baseUrl.startsWith("/");
}

function resolveRequestUrl(path: string, baseUrl: string): string | URL {
  return isRelativeBaseUrl(baseUrl)
    ? `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
    : new URL(path, baseUrl);
}

/**
 * Shared authenticated HTTP client for DSH frontend `.api.ts` modules.
 * Centralizes the fetch/timeout/correlation-ID/error-shape logic that was
 * previously hand-copied per module.
 */
export function createDshHttpClient(baseUrl: string, corrPrefix: string, timeoutMs = 10000) {
  const cookieMode = isRelativeBaseUrl(baseUrl);

  async function request<T>(path: string, options: DshRequestOptions = {}): Promise<T> {
    const token = options.token ?? (cookieMode ? undefined : getIdentityAccessToken());
    if (!cookieMode && !token) throw { kind: "http", status: 401 };
    let response: Response;
    try {
      response = await fetch(resolveRequestUrl(path, baseUrl), {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-Correlation-ID": options.correlationId ?? corrId(corrPrefix),
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        ...(cookieMode ? { credentials: "include" as const } : {}),
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
 * Same-origin control-panel session client. It lives beside the DSH HTTP
 * kernel because browser session calls use the same BFF/cookie transport
 * rules as `/api/dsh` and `/api/workforce` callers.
 */
export function createDshSessionHttpClient(corrPrefix = "cp-session", timeoutMs = 10000) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<DshSessionRequestResult<T>> {
    try {
      const response = await fetch(path, {
        ...init,
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "X-Correlation-ID": corrId(corrPrefix),
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
        signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      });
      const body = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, body };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        body: null,
        error: "network",
        message: error instanceof Error ? error.message : "network error",
      };
    }
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

export type DshMutationAuth = {
  readonly accessToken?: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export type DshFlexibleRequestOptions = {
  readonly method?: DshRequestMethod;
  readonly body?: unknown;
  readonly query?: Record<string, string | undefined>;
  /** Simple bearer token. Omit both `token` and `auth` for unauthenticated requests. */
  readonly token?: string;
  /** Idempotent-mutation auth: bearer token + Idempotency-Key + explicit correlation id. */
  readonly auth?: DshMutationAuth;
};

/**
 * Variant for clients with mixed auth modes on the same resource: some
 * operations are public (no token), others take a plain bearer token, and
 * mutations take idempotent-mutation auth (token + idempotency key +
 * caller-supplied correlation id instead of an auto-generated one). Also
 * sends `Cache-Control`/`Pragma: no-cache` for read-your-writes freshness.
 */
export function createDshFlexibleHttpClient(baseUrl: string, timeoutMs = 10000) {
  const cookieMode = isRelativeBaseUrl(baseUrl);

  async function request<T>(path: string, options: DshFlexibleRequestOptions = {}): Promise<T> {
    let requestUrl = resolveRequestUrl(path, baseUrl);
    if (options.query) {
      const params = requestUrl instanceof URL ? requestUrl.searchParams : new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) params.set(key, value);
      }
      if (!(requestUrl instanceof URL)) {
        const qs = params.toString();
        requestUrl = qs ? `${requestUrl}${requestUrl.includes("?") ? "&" : "?"}${qs}` : requestUrl;
      }
    }
    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(options.token !== undefined ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(options.auth !== undefined
            ? {
                ...(options.auth.accessToken ? { Authorization: `Bearer ${options.auth.accessToken}` } : {}),
                "Idempotency-Key": options.auth.idempotencyKey,
                "X-Correlation-ID": options.auth.correlationId,
              }
            : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        ...(cookieMode ? { credentials: "include" as const } : {}),
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
    return parseResponse<T>(response);
  }
  return { req };
}
