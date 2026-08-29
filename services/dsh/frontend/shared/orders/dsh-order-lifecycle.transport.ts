import { PlatformVarsRegistry } from '../platform/platform-vars';
import type {
  DshOrderLifecycleClient,
  DshListOrdersQuery,
  DshOrderFetchFn,
  DshOrderAuthContext,
  DshOrderApiOfflineError,
  DshOrderApiHttpError,
  BackendOrder
} from './dsh-order-lifecycle.types';
import {
  normalizeDshOrderStatus,
  normalizeOrderList
} from './dsh-order-lifecycle.adapter';

export function resolveDshOrderApiBaseUrl(): string | null {
  return PlatformVarsRegistry.get('dshApiBaseUrl') ?? null;
}

function orderAuthHeaders(auth: DshOrderAuthContext): Record<string, string> {
  const bearerToken = auth.bearerToken?.trim();
  return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};
}

async function doFetch<T>(
  baseUrl: string,
  fetchFn: DshOrderFetchFn,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  let response: Response;

  try {
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    response = await fetchFn(url, init);
  } catch {
    const err: DshOrderApiOfflineError = { kind: 'offline' };
    throw err;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const err: DshOrderApiHttpError = {
      kind: 'http',
      status: response.status,
      body: text,
    };
    throw err;
  }

  return response.json() as Promise<T>;
}

function ordersPathForScope(scope: DshListOrdersQuery['scope'] | DshOrderAuthContext['scope']): string {
  if (scope === 'partner') return '/dsh/partner/orders';
  if (scope === 'operator') return '/dsh/operator/orders';
  return '/dsh/client/orders';
}

export function createDshOrderLifecycleHttpClient(
  baseUrl: string | null,
  fetchFn: DshOrderFetchFn = globalThis.fetch,
  auth: DshOrderAuthContext = {},
): DshOrderLifecycleClient {
  return {
    listOrders: async (query = {}) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const params = new URLSearchParams();
      if (query.status) params.set('status', normalizeDshOrderStatus(query.status));
      if (query.limit != null) params.set('limit', String(query.limit));
      if (query.offset != null) params.set('offset', String(query.offset));
      const qs = params.toString();
      const path = ordersPathForScope(query.scope ?? auth.scope);
      const resp = await doFetch<{ orders?: readonly BackendOrder[]; total?: number }>(
        baseUrl,
        fetchFn,
        'GET',
        `${path}${qs ? `?${qs}` : ''}`,
        undefined,
        orderAuthHeaders(auth),
      );
      return normalizeOrderList(resp);
    },
  };
}
