// HTTP transport for DSH product identity API.
// Reads base URL from EXPO_PUBLIC_DSH_API_BASE_URL (Expo/React Native)
// or NEXT_PUBLIC_DSH_API_BASE_URL (Next.js / control-panel).
// No React. No UI framework imports.
//
// BLOCKED as of dsh-030 — see the header comment in dsh-product-api.client.ts.
// This transport is path-agnostic (it just forwards whatever path the client
// builds), so it will start working the moment dsh-product-api.client.ts is
// rewritten onto the real /dsh/partner/catalog/* routes; it needs no changes
// of its own.

import {
  createDshProductApiClient,
  type DshProductApiClient,
  type DshProductApiTransport,
  type DshProductRecord,
} from './dsh-product-api.client';

import { PlatformVarsRegistry } from '../platform/platform-vars';

export type DshProductFetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export type DshProductApiOfflineError = { readonly kind: 'offline' };
export type DshProductApiHttpError = {
  readonly kind: 'http';
  readonly status: number;
  readonly body: string;
};
type DshProductApiTransportError =
  | DshProductApiOfflineError
  | DshProductApiHttpError;

function isDshProductApiOfflineError(
  err: unknown,
): err is DshProductApiOfflineError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { kind?: unknown }).kind === 'offline'
  );
}

/**
 * Resolves the DSH API base URL from PlatformVarsRegistry.
 */
function resolveDshProductApiBaseUrl(): string | null {
  return PlatformVarsRegistry.get('dshApiBaseUrl');
}


async function doFetch<T>(
  baseUrl: string,
  fetchFn: DshProductFetchFn,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = new URL(path, baseUrl).toString();
  let response: Response;

  try {
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    response = await fetchFn(url, init);
  } catch {
    const err: DshProductApiOfflineError = { kind: 'offline' };
    throw err;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const err: DshProductApiHttpError = {
      kind: 'http',
      status: response.status,
      body: text,
    };
    throw err;
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

function buildHttpTransport(
  baseUrl: string | null,
  fetchFn: DshProductFetchFn,
): DshProductApiTransport {
  return {
    post: (path, body) => {
      if (!baseUrl) return Promise.reject({ kind: 'offline' });
      return doFetch<any>(baseUrl, fetchFn, 'POST', path, body);
    },
    patch: (path, body) => {
      if (!baseUrl) return Promise.reject({ kind: 'offline' });
      return doFetch<any>(baseUrl, fetchFn, 'PATCH', path, body);
    },
    get: (path) => {
      if (!baseUrl) return Promise.reject({ kind: 'offline' });
      return doFetch<unknown>(baseUrl, fetchFn, 'GET', path);
    },
    delete: (path) => {
      if (!baseUrl) return Promise.reject({ kind: 'offline' });
      return doFetch<void>(baseUrl, fetchFn, 'DELETE', path);
    },
  };
}

/**
 * Creates a `DshProductApiClient` backed by an HTTP transport.
 * `fetchFn` defaults to `globalThis.fetch`.
 */
export function createDshProductApiHttpClient(
  baseUrl: string | null,
  fetchFn: DshProductFetchFn = globalThis.fetch,
): DshProductApiClient {
  const transport = buildHttpTransport(baseUrl, fetchFn);
  return createDshProductApiClient(transport);
}
