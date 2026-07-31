import { getIdentityAccessToken } from "@bthwani/core-identity";

export type DshRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type DshRequestOptions = {
  readonly method?: DshRequestMethod;
  readonly body?: unknown;
  readonly token?: string;
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
  readonly expectedVersion?: number;
};

export type DshSessionRequestResult<T> = {
  readonly ok: boolean;
  readonly status: number;
  readonly body: T | null;
  readonly error?: "network";
  readonly message?: string;
};

export const CONTROL_PANEL_SESSION_EXPIRED_EVENT =
  "bthwani:control-panel-session-expired";

let correlationFallbackSequence = 0;
let controlPanelRefreshInFlight: Promise<boolean> | null = null;

export function corrId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  correlationFallbackSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${correlationFallbackSequence.toString(36)}`;
}

function notifyControlPanelSessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONTROL_PANEL_SESSION_EXPIRED_EVENT));
}

async function refreshControlPanelCookieSession(): Promise<boolean> {
  if (controlPanelRefreshInFlight) return controlPanelRefreshInFlight;

  const refresh = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "X-Correlation-ID": corrId("cp-refresh"),
    },
    signal: AbortSignal.timeout(10000),
  })
    .then((response) => response.ok)
    .catch(() => false);

  controlPanelRefreshInFlight = refresh;
  try {
    return await refresh;
  } finally {
    if (controlPanelRefreshInFlight === refresh) {
      controlPanelRefreshInFlight = null;
    }
  }
}

async function fetchWithControlPanelSessionRetry(
  execute: () => Promise<Response>,
  cookieMode: boolean,
): Promise<Response> {
  let response = await execute();
  if (!cookieMode || response.status !== 401) return response;

  const refreshed = await refreshControlPanelCookieSession();
  if (!refreshed) {
    notifyControlPanelSessionExpired();
    return response;
  }

  response = await execute();
  if (response.status === 401) notifyControlPanelSessionExpired();
  return response;
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
      // Non-JSON errors preserve the raw body only.
    }
    throw { kind: "http", status: response.status, body, code, message };
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
    const token = options.token ?? (cookieMode ? undefined : getIdentityAccessToken());
    if (!cookieMode && !token) throw { kind: "http", status: 401 };
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
    const execute = () =>
      fetch(requestUrl, {
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
          ...(requestBody !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(requestBody !== undefined ? { body: requestBody } : {}),
        ...requestCredentials(cookieMode),
        signal: AbortSignal.timeout(timeoutMs),
      });

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
      };
    }
    return parseResponse<T>(response);
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
    let response: Response;
    try {
      response = await fetch(resolveRequestUrl(path, baseUrl), {
        headers: { Accept: "application/json" },
        ...requestCredentials(cookieMode),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw {
        kind: "network",
        message: error instanceof Error ? error.message : "network error",
      };
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

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
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
                "X-Correlation-ID": options.auth.correlationId,
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
      };
    }
    return parseResponse<T>(response);
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
    const token = cookieMode ? null : getIdentityAccessToken();
    if (!cookieMode && !token) throw { kind: "http", status: 401 };

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
          "X-Correlation-ID": corrId(corrPrefix),
          ...(init.headers ?? {}),
        },
        ...requestCredentials(cookieMode),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw {
        kind: "network",
        message: error instanceof Error ? error.message : "network error",
      };
    }
    return parseResponse<T>(response);
  }

  return { req };
}
