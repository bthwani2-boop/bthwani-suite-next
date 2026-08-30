import type { DshOrderStatus } from './orders.types';
import type {
  DshOrderRecord,
  DshListOrdersResponse,
  DshOrderApiOfflineError,
  DshOrderApiContractError,
  BackendOrderItem,
  BackendOrder
} from './dsh-order-lifecycle.types';

function isDshOrderApiOfflineError(err: unknown): err is DshOrderApiOfflineError {
  return typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'offline';
}

function isDshOrderApiContractError(err: unknown): err is DshOrderApiContractError {
  return typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'contract';
}

const SOVEREIGN_ORDER_STATUSES = new Set<DshOrderStatus>([
  'pending',
  'store_accepted',
  'preparing',
  'ready_for_pickup',
  'driver_assigned',
  'driver_arrived_store',
  'picked_up',
  'arrived_customer',
  'delivered',
  'cancelled_by_client',
  'cancelled_by_store',
  'cancelled_by_operator',
  'cancelled_no_driver',
  'failed_payment',
  'failed_dispatch',
]);

function contractStatusError(value: string, source = 'order'): DshOrderApiContractError {
  return {
    kind: 'contract',
    message: `unknown DSH ${source} status "${value}" — backend/frontend status contract drift must be fixed, not masked`,
  };
}

function normalizeCurrency(value: unknown, source: string): string {
  const currency = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw {
      kind: 'contract',
      message: `missing or invalid DSH ${source} currency "${currency}" — commercial snapshot drift must be fixed, not defaulted`,
    } as DshOrderApiContractError;
  }
  return currency;
}

export function normalizeDshOrderStatus(status: unknown): DshOrderStatus {
  const value = String(status ?? '').trim().toLowerCase();
  if (SOVEREIGN_ORDER_STATUSES.has(value as DshOrderStatus)) {
    return value as DshOrderStatus;
  }
  throw contractStatusError(value);
}

function deriveTotalPrice(raw: BackendOrder): number {
  const explicit = raw.total_price ?? raw.totalPrice;
  if (explicit != null) return Number(explicit);
  return (raw.items ?? []).reduce((sum, item) => {
    const quantity = Number(item.quantity ?? 0);
    const price = Number(item.price ?? item.unitPrice ?? 0);
    return sum + quantity * price;
  }, 0);
}

function normalizeOrder(raw: BackendOrder): DshOrderRecord {
  const orderId = String(raw.id ?? '');
  const checkoutIntentId = raw.checkout_intent_id ?? raw.checkoutIntentId;
  const wltPaymentRefId = raw.wlt_payment_ref_id ?? raw.wltPaymentRefId;
  const captainId = raw.captain_id ?? raw.captainId;
  const fulfillmentMode = raw.fulfillment_mode ?? raw.fulfillmentMode;
  if (fulfillmentMode === undefined) {
    throw {
      kind: 'contract',
      message: `missing fulfillment_mode for DSH order "${orderId}" — backend/frontend contract drift must be fixed, not defaulted`,
    } as DshOrderApiContractError;
  }
  const version = Number(raw.version);
  if (!Number.isInteger(version) || version < 1) {
    throw {
      kind: 'contract',
      message: `missing valid version for DSH order "${orderId}" — optimistic concurrency must fail closed`,
    } as DshOrderApiContractError;
  }
  return {
    id: orderId,
    version,
    store_id: String(raw.store_id ?? raw.storeId ?? ''),
    fulfillment_mode: fulfillmentMode,
    client_id: String(raw.client_id ?? raw.clientId ?? ''),
    status: normalizeDshOrderStatus(raw.status),
    total_price: deriveTotalPrice(raw),
    currency: normalizeCurrency(raw.currency, 'order'),
    ...(checkoutIntentId !== undefined ? { checkout_intent_id: checkoutIntentId } : {}),
    ...(wltPaymentRefId !== undefined ? { wlt_payment_ref_id: wltPaymentRefId } : {}),
    ...(captainId !== undefined ? { captain_id: captainId } : {}),
    created_at: String(raw.created_at ?? raw.createdAt ?? ''),
    updated_at: String(raw.updated_at ?? raw.updatedAt ?? ''),
  };
}

export function normalizeOrderList(resp: { readonly orders?: readonly BackendOrder[]; readonly total?: number }): DshListOrdersResponse {
  const orders = (resp.orders ?? []).map(normalizeOrder);
  return {
    orders,
    total: Number(resp.total ?? orders.length),
  };
}

export { isDshOrderApiOfflineError, isDshOrderApiContractError };
