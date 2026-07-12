import type { components, paths } from "./generated/identity-api.ts";

export type ActorIdentity = components["schemas"]["ActorIdentity"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type IssueActivationRequest = components["schemas"]["IssueActivationRequest"];
export type IssueActivationResponse = components["schemas"]["IssueActivationResponse"];
export type ActivateRequest = components["schemas"]["ActivateRequest"];
export type TokenResponse =
  paths["/auth/login"]["post"]["responses"]["200"]["content"]["application/json"];

export type IdentityClientError =
  | { readonly kind: "http"; readonly status: number; readonly code: string; readonly message: string }
  | { readonly kind: "network"; readonly message: string };

export type IdentityClient = {
  login(request: LoginRequest): Promise<TokenResponse>;
  issueActivation(
    accessToken: string,
    request: IssueActivationRequest,
    options?: { readonly idempotencyKey?: string; readonly correlationId?: string },
  ): Promise<IssueActivationResponse>;
  activate(request: ActivateRequest): Promise<TokenResponse>;
  session(accessToken: string): Promise<ActorIdentity>;
  refresh(refreshToken: string): Promise<TokenResponse>;
  logout(accessToken: string): Promise<void>;
};

export function createIdentityClient(baseUrl: string): IdentityClient {
  async function request<T>(
    path: string,
    options: {
      method: "GET" | "POST";
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
    login(body) {
      return request("/auth/login", { method: "POST", body });
    },
    issueActivation(accessToken, body, options) {
      const requestOptions: {
        method: "POST";
        token: string;
        body: IssueActivationRequest;
        idempotencyKey?: string;
        correlationId?: string;
      } = {
        method: "POST",
        token: accessToken,
        body,
      };
      if (options?.idempotencyKey) requestOptions.idempotencyKey = options.idempotencyKey;
      if (options?.correlationId) requestOptions.correlationId = options.correlationId;
      return request("/auth/activations", requestOptions);
    },
    activate(body) {
      return request("/auth/activate", { method: "POST", body });
    },
    session(accessToken) {
      return request("/auth/session", { method: "GET", token: accessToken });
    },
    refresh(refreshToken) {
      return request("/auth/refresh", { method: "POST", body: { refreshToken } });
    },
    logout(accessToken) {
      return request("/auth/logout", { method: "POST", token: accessToken });
    },
  };
}
