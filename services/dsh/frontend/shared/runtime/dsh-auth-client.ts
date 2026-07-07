// DSH Auth Client — J-012
// Wraps GET /auth/session and GET /auth/permissions from auth.openapi.yaml.
// Contract port: 18082 (DSH_AUTH_SERVICE_PORT env var).

import { PlatformVarsRegistry } from '../platform/platform-vars';

export type DshAuthActorRole = 'client' | 'partner' | 'captain' | 'field' | 'operator' | 'system';

export type DshAuthState = 'authenticated' | 'guest' | 'unauthenticated';

export type DshAuthSessionResponse = {
  subject: string;
  authState: DshAuthState;
  roles: DshAuthActorRole[];
  verifiedIdentifier?: string;
};

export type DshAuthSurfacePermissions = Record<string, boolean>;

export type DshAuthPermissionsResponse = {
  subject: string;
  roles: DshAuthActorRole[];
  surfaces: Record<string, DshAuthSurfacePermissions>;
};

export type DshAuthClientConfig = {
  baseUrl: string;
  bearerToken?: string;
  devClientId?: string;
};

function buildAuthHeaders(config: DshAuthClientConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = config.bearerToken?.trim();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (config.devClientId) {
    headers['X-Client-Id'] = config.devClientId;
  }
  return headers;
}

async function verifyAuthSession(config: DshAuthClientConfig): Promise<DshAuthSessionResponse> {
  const fetchFn = globalThis.fetch;
  const resp = await fetchFn(`${config.baseUrl}/auth/session`, {
    method: 'GET',
    headers: buildAuthHeaders(config),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: 'unknown' }));
    throw new Error(`[dsh-auth-client] session verify failed (${resp.status}): ${body.error ?? resp.statusText}`);
  }
  return resp.json() as Promise<DshAuthSessionResponse>;
}

async function getAuthPermissions(config: DshAuthClientConfig): Promise<DshAuthPermissionsResponse> {
  const fetchFn = globalThis.fetch;
  const resp = await fetchFn(`${config.baseUrl}/auth/permissions`, {
    method: 'GET',
    headers: buildAuthHeaders(config),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: 'unknown' }));
    throw new Error(`[dsh-auth-client] permissions fetch failed (${resp.status}): ${body.error ?? resp.statusText}`);
  }
  return resp.json() as Promise<DshAuthPermissionsResponse>;
}

export function resolveDshAuthBaseUrl(): string | null {
  // Auth service runs on port 18082 by default.
  // Falls back to DSH API base URL host with auth port.
  const explicit = PlatformVarsRegistry.get('authBaseUrl');
  if (explicit?.trim()) return explicit.trim();
  const dshBase = PlatformVarsRegistry.get('dshApiBaseUrl');
  if (dshBase?.trim()) {
    try {
      const url = new URL(dshBase.trim());
      return `${url.protocol}//${url.hostname}:18082`;
    } catch {
      // malformed base URL — return null
    }
  }
  return null;
}
