/**
 * DSH Operations Runtime Adapter
 *
 * runtimeTruth: true  — when DSH backend is reachable
 * runtimeTruth: false — fallback: no API URL, network offline, or explicit demo mode
 *
 * WLT boundary: this adapter is read-only for operations.
 * Mutation endpoints (assign-captain, status transitions) go through
 * createDshOrderLifecycleHttpClient directly from the screen.
 */

import {
  resolveDshOrderApiBaseUrl,
  createDshOrderLifecycleHttpClient,
  type DshOrderRecord,
  type DshListOrdersQuery,
} from '../orders/dsh-order-lifecycle-client';

export const dshOperationalRuntimeAdapterMeta = {
  dataKind: 'RUNTIME_ADAPTER',
  runtimeTruth: true,
  backendSource: true,
  bindingSource: true,
  sourceDataOwner: 'dsh/backend/internal/http/orders_handler.go',
  adapterOwner: 'dsh/frontend/shared/dsh-operational-runtime-adapter.ts',
} as const;

export type DshRuntimeOrderRow = {
  readonly id: string;
  readonly storeId: string;
  readonly clientId: string;
  readonly status: string;
  readonly captainId: string | null;
  readonly totalPrice: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshRuntimeOrdersResult =
  | { readonly kind: 'ok'; readonly orders: readonly DshRuntimeOrderRow[]; readonly total: number }
  | { readonly kind: 'offline' }
  | { readonly kind: 'error'; readonly message: string };

function toRuntimeRow(o: DshOrderRecord): DshRuntimeOrderRow {
  return {
    id: o.id,
    storeId: o.store_id,
    clientId: o.client_id,
    status: o.status,
    captainId: o.captain_id ?? null,
    totalPrice: o.total_price,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

export async function fetchDshRuntimeOrders(
  query: DshListOrdersQuery = {},
  clientId?: string
): Promise<DshRuntimeOrdersResult> {
  const baseUrl = resolveDshOrderApiBaseUrl();
  if (!baseUrl) {
    return { kind: 'offline' };
  }
  const client = createDshOrderLifecycleHttpClient(baseUrl, globalThis.fetch, clientId ? { clientId } : {});
  try {
    const resp = await client.listOrders(query);
    return {
      kind: 'ok',
      orders: resp.orders.map(toRuntimeRow),
      total: resp.total,
    };
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'offline') {
      return { kind: 'offline' };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { kind: 'error', message: msg };
  }
}

/**
 * Resolve whether runtime is available.
 * Returns true when NEXT_PUBLIC_DSH_API_BASE_URL or EXPO_PUBLIC_DSH_API_BASE_URL is set.
 */
export function isDshRuntimeAvailable(): boolean {
  return resolveDshOrderApiBaseUrl() !== null;
}
