import type { components, paths } from "./generated/identity-api.js";

export type ActorIdentity = components["schemas"]["ActorIdentity"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type TokenResponse =
  paths["/auth/login"]["post"]["responses"]["200"]["content"]["application/json"];

export type IdentityClientError =
  | { readonly kind: "http"; readonly status: number; readonly code: string; readonly message: string }
  | { readonly kind: "network"; readonly message: string };

export type IdentityClient = {
  login(request: LoginRequest): Promise<TokenResponse>;
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
