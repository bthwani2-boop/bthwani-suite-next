import {
  executeWithControlPanelCookieSession,
  getIdentityAccessToken,
  refreshIdentitySession,
} from "@bthwani/core-identity";

export type DshRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type DshRequestOptions = {
  readonly method?: DshRequestMethod;
  readonly body?: unknown;
  readonly token?: string | undefined;
  readonly idempotencyKey?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly expectedVersion?: number | undefined;
  readonly deviceId?: string | undefined;
  readonly sessionId?: string | undefined;
};

export type DshSessionRequestResult<T> = {
  readonly ok: boolean;
  readonly status: number;
  readonly body: T | null;
  readonly error?: "network";
  readonly message?: string;
};

let correlationFallbackSequence = 0;

export function corrId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  correlationFallbackSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${correlationFallbackSequence.toString(36)}`;
}

async function fetchWithControlPanelSessionRetry(
  execute: () => Promise<Response>,
  cookieMode: boolean,
): Promise<Response> {
  if (cookieMode) return executeWithControlPanelCookieSession(execute, true);

  let response = await execute();
  if (response.status !== 401) return response;

  const refreshed = await refreshIdentitySession();
  if (!refreshed) {
    return response;
  }

  return execute();
}

async function parseResponse<T>(
  response: Response,
  correlationId?: string,
): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let code: string | undefined;
    let message: string | undefined;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.code === "string") code = parsed.code;
      if (parsed && typeof parsed.message === "string") message = parsed.message;
    } catch {
      // Non-JSON errors preserve the raw body only.
    }
    // The correlation id travels with the failure so every surface can show a
    // support reference instead of a generic "something went wrong".
    throw { kind: "http", status: response.status, body, code, message, correlationId };
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function isRelativeBaseUrl(baseUrl: string): boolean {
  return baseUrl.startsWith("/");
}

function resolveRequestUrl(path: string, baseUrl: string): string | URL {
  return isRelativeBaseUrl(baseUrl)
    ? `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
    : new URL(path, baseUrl);
}

function requestCredentials(cookieMode: boolean) {
  return cookieMode ? ({ credentials: "include" as const } as const) : {};
}

export function createDshHttpClient(
  baseUrl: string,
  corrPrefix: string,
  timeoutMs = 10000,
) {
  const cookieMode = isRelativeBaseUrl(baseUrl);

  async function request<T>(
    path: string,
    options: DshRequestOptions = {},
  ): Promise<T> {
    if (
      options.expectedVersion !== undefined &&
      (!Number.isInteger(options.expectedVersion) || options.expectedVersion < 1)
    ) {
      throw {
        kind: "invalid_request",
        message: "expectedVersion must be a positive integer",
      };
    }

    const requestUrl = resolveRequestUrl(path, baseUrl);
    const correlationId = options.correlationId ?? corrId(corrPrefix);
    const requestBody =
      options.body !== undefined ? JSON.stringify(options.body) : undefined;
    const execute = () => {
      const token = options.token ?? (cookieMode ? undefined : getIdentityAccessToken());
      if (!cookieMode && !token) return Promise.resolve(new Response(null, { status: 401 }));

      return fetch(requestUrl, {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...(!cookieMode && token ? { Authorization: `Bearer ${token}` } : {}),
          "X-Correlation-ID": correlationId,
          ...(options.idempotencyKey
            ? { "Idempotency-Key": options.idempotencyKey }
            : {}),
          ...(options.expectedVersion !== undefined
            ? { "If-Match-Version": String(options.expectedVersion) }
            : {}),
          ...(options.deviceId ? { "X-Dsh-Device-Id": options.deviceId } : {}),
          ...(options.sessionId ? { "X-Dsh-Session-Id": options.sessionId } : {}),
          ...(requestBody !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(requestBody !== undefined ? { body: requestBody } : {}),
        ...requestCredentials(cookieMode),
        signal: AbortSignal.timeout(timeoutMs),
      });
    };

    let response: Response;
    try {
      response = await fetchWithControlPanelSessionRetry(execute, cookieMode);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "kind" in error &&
        (error as { kind?: unknown }).kind === "invalid_request"
      ) {
        throw error;
      }
      throw {
        kind: "network",
        message: error instanceof Error ? error.message : "network error",
        correlationId,
      };
    }
    return parseResponse<T>(response, correlationId);
  }

  return { request };
}

export function createDshSessionHttpClient(
  corrPrefix = "cp-session",
  timeoutMs = 10000,
) {
  async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<DshSessionRequestResult<T>> {
    try {
      const response = await fetch(path, {
        ...init,
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "X-Correlation-ID": corrId(corrPrefix),
          ...(init.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
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

/** Unauthenticated GET client. Relative bases still use the same-origin BFF. */
export function createDshPublicHttpClient(
  baseUrl: string,
  timeoutMs = 10000,
) {
  const cookieMode = isRelativeBaseUrl(baseUrl);
  async function request<T>(path: string): Promise<T> {
    const correlationId = corrId("dsh-public");
    let response: Response;
    try {
      response = await fetch(resolveRequestUrl(path, baseUrl), {
        headers: { Accept: "application/json", "X-Correlation-ID": correlationId },
        ...requestCredentials(cookieMode),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw {
        kind: "network",
        message: error instanceof Error ? error.message : "network error",
        correlationId,
      };
    }
    return parseResponse<T>(response, correlationId);
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
  readonly token?: string;
  readonly auth?: DshMutationAuth;
};

export function createDshFlexibleHttpClient(
  baseUrl: string,
  timeoutMs = 10000,
) {
  const cookieMode = isRelativeBaseUrl(baseUrl);

  async function request<T>(
    path: string,
    options: DshFlexibleRequestOptions = {},
  ): Promise<T> {
    let requestUrl = resolveRequestUrl(path, baseUrl);
    if (options.query) {
      const params =
        requestUrl instanceof URL
          ? requestUrl.searchParams
          : new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) params.set(key, value);
      }
      if (!(requestUrl instanceof URL)) {
        const qs = params.toString();
        requestUrl = qs
          ? `${requestUrl}${requestUrl.includes("?") ? "&" : "?"}${qs}`
          : requestUrl;
      }
    }

    const correlationId = options.auth?.correlationId ?? corrId("dsh-flexible");
    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "X-Correlation-ID": correlationId,
          ...(options.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(!cookieMode && options.token !== undefined
            ? { Authorization: `Bearer ${options.token}` }
            : {}),
          ...(options.auth !== undefined
            ? {
                ...(!cookieMode && options.auth.accessToken
                  ? { Authorization: `Bearer ${options.auth.accessToken}` }
                  : {}),
                "Idempotency-Key": options.auth.idempotencyKey,
              }
            : {}),
        },
        ...(options.body !== undefined
          ? { body: JSON.stringify(options.body) }
          : {}),
        ...requestCredentials(cookieMode),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw {
        kind: "network",
        message: error instanceof Error ? error.message : "network error",
        correlationId,
      };
    }
    return parseResponse<T>(response, correlationId);
  }

  return { request };
}

export function createDshRawHttpClient(
  baseUrl: string,
  corrPrefix: string,
  timeoutMs = 10000,
) {
  const cookieMode = isRelativeBaseUrl(baseUrl);

  async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const correlationId = corrId(corrPrefix);
    const token = cookieMode ? null : getIdentityAccessToken();
    if (!cookieMode && !token) throw { kind: "http", status: 401, correlationId };

    let response: Response;
    try {
      response = await fetch(resolveRequestUrl(path, baseUrl), {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(!cookieMode && token
            ? { Authorization: `Bearer ${token}` }
            : {}),
          "X-Correlation-ID": correlationId,
          ...(init.headers ?? {}),
        },
        ...requestCredentials(cookieMode),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw {
        kind: "network",
        message: error instanceof Error ? error.message : "network error",
        correlationId,
      };
    }
    return parseResponse<T>(response, correlationId);
  }

  return { req };
}
