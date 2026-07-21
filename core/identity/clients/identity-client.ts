import type { components, paths } from "./generated/identity-api.ts";

export type ActorIdentity = components["schemas"]["ActorIdentity"];
export type RuntimeStatus = components["schemas"]["RuntimeStatus"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type OtpRequest = components["schemas"]["OtpRequest"];
export type IssueActivationResponse = components["schemas"]["IssueActivationResponse"];
export type ActivateRequest = components["schemas"]["ActivateRequest"];
export type IntrospectRequest = components["schemas"]["IntrospectRequest"];
export type ActivationActorType = ActivateRequest["actorType"];
export type SessionInfo = components["schemas"]["SessionInfo"];
export type TokenResponse =
  paths["/auth/login"]["post"]["responses"]["200"]["content"]["application/json"];

export type IdentityClientError =
  | { readonly kind: "http"; readonly status: number; readonly code: string; readonly message: string }
  | { readonly kind: "network"; readonly message: string };

export type IdentityClient = {
  health(): Promise<RuntimeStatus>;
  readiness(): Promise<RuntimeStatus>;
  login(request: LoginRequest): Promise<TokenResponse>;
  requestOtp(request: OtpRequest): Promise<IssueActivationResponse>;
  activate(request: ActivateRequest): Promise<TokenResponse>;
  session(accessToken: string): Promise<ActorIdentity>;
  introspect(request: IntrospectRequest): Promise<ActorIdentity>;
  refresh(refreshToken: string): Promise<TokenResponse>;
  listSessions(accessToken: string): Promise<SessionInfo[]>;
  revokeSession(accessToken: string, sessionId: string): Promise<void>;
  logout(accessToken: string): Promise<void>;
  changePassword(accessToken: string, password: string): Promise<void>;
  deleteAccount(accessToken: string): Promise<void>;
};

export function createIdentityClient(baseUrl: string): IdentityClient {
  async function request<T>(
    path: string,
    options: {
      method: "GET" | "POST" | "DELETE";
      token?: string;
      body?: unknown;
      idempotencyKey?: string;
      correlationId?: string;
    },
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(new URL(path, baseUrl), {
        method: options.method,
        headers: {
          Accept: "application/json",
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(options.token !== undefined ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(options.idempotencyKey !== undefined ? { "Idempotency-Key": options.idempotencyKey } : {}),
          ...(options.correlationId !== undefined ? { "X-Correlation-ID": options.correlationId } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      throw {
        kind: "network",
        message: error instanceof Error ? error.message : "identity network error",
      } satisfies IdentityClientError;
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { code?: string; message?: string };
      throw {
        kind: "http",
        status: response.status,
        code: body.code ?? "IDENTITY_ERROR",
        message: body.message ?? "identity request failed",
      } satisfies IdentityClientError;
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  return {
    health() {
      return request("/identity/health", { method: "GET" });
    },
    readiness() {
      return request("/identity/readiness", { method: "GET" });
    },
    login(body) {
      return request("/auth/login", { method: "POST", body });
    },
    requestOtp(body) {
      return request("/auth/otp/request", { method: "POST", body });
    },
    activate(body) {
      return request("/auth/activate", { method: "POST", body });
    },
    session(accessToken) {
      return request("/auth/session", { method: "GET", token: accessToken });
    },
    introspect(body) {
      return request("/auth/introspect", { method: "POST", body });
    },
    refresh(refreshToken) {
      return request("/auth/refresh", { method: "POST", body: { refreshToken } });
    },
    listSessions(accessToken) {
      return request("/auth/sessions", { method: "GET", token: accessToken });
    },
    revokeSession(accessToken, sessionId) {
      return request(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        token: accessToken,
      });
    },
    logout(accessToken) {
      return request("/auth/logout", { method: "POST", token: accessToken });
    },
    changePassword(accessToken, password) {
      return request("/auth/password/change", { method: "POST", token: accessToken, body: { password } });
    },
    deleteAccount(accessToken) {
      return request("/auth/account", { method: "DELETE", token: accessToken });
    },
  };
}
