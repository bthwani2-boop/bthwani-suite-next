/**
 * DSH Operations Runtime Adapter
 *
 * Read-only adapter from the generated order lifecycle contract into the
 * control-panel operations view model. No demo or local fallback is allowed.
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
  sourceDataOwner: 'dsh/backend/internal/http/orders.go',
  adapterOwner: 'dsh/frontend/shared/operations/dsh-operational-runtime-adapter.ts',
} as const;

export type DshRuntimeOrderRow = {
  readonly id: string;
  readonly storeId: string;
  readonly fulfillmentMode: 'bthwani_delivery' | 'partner_delivery' | 'pickup';
  readonly clientId: string;
  readonly status: string;
  readonly captainId: string | null;
  readonly captainLifecycleStatus: string | null;
  readonly podMediaKey: string | null;
  readonly deliveryFailureReason: string | null;
  readonly totalPrice: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshRuntimeOrdersResult =
  | {
      readonly kind: 'ok';
      readonly orders: readonly DshRuntimeOrderRow[];
      readonly total: number;
    }
  | { readonly kind: 'offline' }
  | { readonly kind: 'error'; readonly message: string };

function toRuntimeRow(order: DshOrderRecord): DshRuntimeOrderRow {
  return {
    id: order.id,
    storeId: order.store_id,
    fulfillmentMode: order.fulfillment_mode,
    clientId: order.client_id,
    status: order.status,
    captainId: order.captain_id ?? null,
    captainLifecycleStatus: order.captain_lifecycle_status ?? null,
    podMediaKey: order.pod_media_key ?? null,
    deliveryFailureReason: order.delivery_failure_reason ?? null,
    totalPrice: order.total_price,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

export async function fetchDshRuntimeOrders(
  query: DshListOrdersQuery = {},
  clientId?: string,
  scope: DshListOrdersQuery['scope'] = 'operator',
): Promise<DshRuntimeOrdersResult> {
  const baseUrl = resolveDshOrderApiBaseUrl();
  if (!baseUrl) {
    return { kind: 'offline' };
  }

  const client = createDshOrderLifecycleHttpClient(baseUrl, globalThis.fetch, {
    ...(clientId ? { clientId } : {}),
    scope,
  });

  try {
    const response = await client.listOrders({ ...query, scope });
    return {
      kind: 'ok',
      orders: response.orders.map(toRuntimeRow),
      total: response.total,
    };
  } catch (error: unknown) {
    if (
      typeof error === 'object'
      && error !== null
      && (error as { kind?: unknown }).kind === 'offline'
    ) {
      return { kind: 'offline' };
    }
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function isDshRuntimeAvailable(): boolean {
  return resolveDshOrderApiBaseUrl() !== null;
}
