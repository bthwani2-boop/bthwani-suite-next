import {
  executeWithControlPanelCookieSession,
  getIdentityAccessToken,
  refreshIdentitySession,
} from "@bthwani/core-identity";
import { secureCorrelationId } from "./secure-random.ts";

export type DshRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type DshMutationAuth = {
  readonly accessToken?: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export type DshRequestOptions = {
  readonly method?: DshRequestMethod;
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string | undefined>>;
  readonly token?: string | undefined;
  readonly auth?: DshMutationAuth;
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

export type DshRequestErrorKind = "http" | "network" | "invalid_request";

type DshRequestErrorDetails = {
  readonly status?: number | undefined;
  readonly body?: string | undefined;
  readonly code?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly message?: string | undefined;
};

export class DshRequestError extends Error {
  readonly kind: DshRequestErrorKind;
  readonly status?: number;
  readonly body?: string;
  readonly code?: string;
  readonly correlationId?: string;

  constructor(kind: DshRequestErrorKind, details: DshRequestErrorDetails = {}) {
    super(details.message ?? kind);
    this.name = "DshRequestError";
    this.kind = kind;
    if (details.status !== undefined) this.status = details.status;
    if (details.body !== undefined) this.body = details.body;
    if (details.code !== undefined) this.code = details.code;
    if (details.correlationId !== undefined) this.correlationId = details.correlationId;
  }
}

export function corrId(prefix: string): string {
  return secureCorrelationId(prefix);
}

async function fetchWithControlPanelSessionRetry(
  execute: () => Promise<Response>,
  cookieMode: boolean,
): Promise<Response> {
  if (cookieMode) return executeWithControlPanelCookieSession(execute, true);

  const response = await execute();
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
      const parsed: unknown = JSON.parse(body);
      if (typeof parsed === "object" && parsed !== null) {
        const details = parsed as Readonly<Record<string, unknown>>;
        if (typeof details.code === "string") code = details.code;
        if (typeof details.message === "string") message = details.message;
      }
    } catch {
      // Non-JSON errors preserve the raw body only.
    }
    // The correlation id travels with the failure so every surface can show a
    // support reference instead of a generic "something went wrong".
    throw new DshRequestError("http", {
      status: response.status,
      body,
      code,
      message,
      correlationId,
    });
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function isRelativeBaseUrl(baseUrl: string): boolean {
  return baseUrl.startsWith("/");
}

function resolveRequestUrl(
  path: string,
  baseUrl: string,
  query?: Readonly<Record<string, string | undefined>>,
): string | URL {
  const requestUrl = isRelativeBaseUrl(baseUrl)
    ? `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
    : new URL(path, baseUrl);

  if (!query) return requestUrl;

  const params =
    requestUrl instanceof URL ? requestUrl.searchParams : new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, value);
  }
  if (requestUrl instanceof URL) return requestUrl;

  const queryString = params.toString();
  return queryString
    ? `${requestUrl}${requestUrl.includes("?") ? "&" : "?"}${queryString}`
    : requestUrl;
}

function requestCredentials(cookieMode: boolean) {
  return cookieMode ? ({ credentials: "include" as const } as const) : {};
}

type DshClientPolicy = {
  readonly authMode: "required" | "optional" | "public";
  readonly noCache: boolean;
  readonly retryUnauthorized: boolean;
};

function validateRequestOptions(options: DshRequestOptions): void {
  if (
    options.expectedVersion !== undefined &&
    (!Number.isInteger(options.expectedVersion) || options.expectedVersion < 1)
  ) {
    throw new DshRequestError("invalid_request", {
      message: "expectedVersion must be a positive integer",
    });
  }
}

async function executeDshFetch(
  path: string,
  baseUrl: string,
  cookieMode: boolean,
  timeoutMs: number,
  options: DshRequestOptions,
  policy: DshClientPolicy,
  correlationId: string,
): Promise<Response> {
  const token =
    policy.authMode === "public"
      ? undefined
      : options.auth !== undefined
        ? options.auth.accessToken
        : options.token ??
          (policy.authMode === "required" && !cookieMode
            ? getIdentityAccessToken()
            : undefined);

  if (policy.authMode === "required" && !cookieMode && !token) {
    return new Response(null, { status: 401 });
  }

  const requestBody =
    options.body !== undefined ? JSON.stringify(options.body) : undefined;
  const idempotencyKey = options.auth?.idempotencyKey ?? options.idempotencyKey;

  return fetch(resolveRequestUrl(path, baseUrl, options.query), {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(policy.noCache
        ? { "Cache-Control": "no-cache", Pragma: "no-cache" }
        : {}),
      ...(!cookieMode && token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Correlation-ID": correlationId,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
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
}

function createDshJsonClient(
  baseUrl: string,
  corrPrefix: string,
  timeoutMs: number,
  policy: DshClientPolicy,
) {
  const cookieMode = isRelativeBaseUrl(baseUrl);

  async function request<T>(
    path: string,
    options: DshRequestOptions = {},
  ): Promise<T> {
    validateRequestOptions(options);

    const correlationId =
      options.auth?.correlationId ?? options.correlationId ?? corrId(corrPrefix);
    const execute = () =>
      executeDshFetch(
        path,
        baseUrl,
        cookieMode,
        timeoutMs,
        options,
        policy,
        correlationId,
      );

    let response: Response;
    try {
      response = policy.retryUnauthorized
        ? await fetchWithControlPanelSessionRetry(execute, cookieMode)
        : await execute();
    } catch (error) {
      if (error instanceof DshRequestError) throw error;
      throw new DshRequestError("network", {
        message: error instanceof Error ? error.message : "network error",
        correlationId,
      });
    }
    return parseResponse<T>(response, correlationId);
  }

  return { request };
}

export function createDshHttpClient(
  baseUrl: string,
  corrPrefix: string,
  timeoutMs = 10000,
) {
  return createDshJsonClient(baseUrl, corrPrefix, timeoutMs, {
    authMode: "required",
    noCache: false,
    retryUnauthorized: true,
  });
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
      const body: unknown = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, body: body as T | null };
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
  return createDshJsonClient(baseUrl, "dsh-public", timeoutMs, {
    authMode: "public",
    noCache: false,
    retryUnauthorized: false,
  });
}

export function createDshFlexibleHttpClient(
  baseUrl: string,
  timeoutMs = 10000,
) {
  return createDshJsonClient(baseUrl, "dsh-flexible", timeoutMs, {
    authMode: "optional",
    noCache: true,
    retryUnauthorized: false,
  });
}
