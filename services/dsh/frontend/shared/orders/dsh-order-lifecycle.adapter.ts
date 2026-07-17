import type { DshOrderStatus } from './orders.types';
import type {
  DshOrderRecord,
  DshOrderItemRecord,
  DshCreateOrderResponse,
  DshOrderDetailsResponse,
  DshListOrdersResponse,
  DshOrderApiOfflineError,
  DshOrderApiContractError,
  BackendOrderItem,
  BackendOrder,
  BackendDispatchAssignment
} from './dsh-order-lifecycle.types';

function isDshOrderApiOfflineError(err: unknown): err is DshOrderApiOfflineError {
  return typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'offline';
}

function isDshOrderApiContractError(err: unknown): err is DshOrderApiContractError {
  return typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'contract';
}

export function normalizeDshOrderStatus(status: unknown): DshOrderStatus {
  const value = String(status ?? '').trim();
  const normalized = value.toLowerCase();
  switch (normalized) {
    case 'created':
    case 'pending':
      return 'pending';
    case 'accepted':
    case 'store_accepted':
      return 'store_accepted';
    case 'preparing':
      return 'preparing';
    case 'ready_for_pickup':
      return 'ready_for_pickup';
    case 'accepted_by_captain':
    case 'driver_assigned':
    case 'assigned':
      return 'driver_assigned';
    case 'driver_arrived_store':
      return 'driver_arrived_store';
    case 'picked_up':
      return 'picked_up';
    case 'en_route':
    case 'arrived':
    case 'arrived_customer':
      return 'arrived_customer';
    case 'delivered':
    case 'returned':
      return 'delivered';
    case 'cancelled':
    case 'refunded':
    case 'failed_delivery':
    case 'returning_to_store':
      return 'cancelled';
    case 'offered':
      return 'driver_assigned';
    case 'declined':
      return 'pending';
    case 'completed':
      return 'delivered';
    default:
      throw {
        kind: 'contract',
        message: `unknown DSH order status "${value}" — backend/frontend status contract drift must be fixed, not masked`,
      } as DshOrderApiContractError;
  }
}

export function normalizeOrderItem(raw: BackendOrderItem, orderId = ''): DshOrderItemRecord {
  const quantity = Number(raw.quantity ?? 0);
  const price = Number(raw.price ?? raw.unitPrice ?? 0);
  const productName = raw.product_name ?? raw.productName;
  return {
    id: String(raw.id ?? ''),
    order_id: String(raw.order_id ?? raw.orderId ?? orderId),
    product_id: String(raw.product_id ?? raw.productId ?? ''),
    ...(productName !== undefined ? { product_name: productName } : {}),
    quantity,
    price,
  };
}

export function deriveTotalPrice(raw: BackendOrder): number {
  const explicit = raw.total_price ?? raw.totalPrice;
  if (explicit != null) return Number(explicit);
  return (raw.items ?? []).reduce((sum, item) => {
    const quantity = Number(item.quantity ?? 0);
    const price = Number(item.price ?? item.unitPrice ?? 0);
    return sum + quantity * price;
  }, 0);
}

export function normalizeOrder(raw: BackendOrder): DshOrderRecord {
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
  return {
    id: orderId,
    store_id: String(raw.store_id ?? raw.storeId ?? ''),
    fulfillment_mode: fulfillmentMode,
    client_id: String(raw.client_id ?? raw.clientId ?? ''),
    status: normalizeDshOrderStatus(raw.status),
    total_price: deriveTotalPrice(raw),
    ...(checkoutIntentId !== undefined ? { checkout_intent_id: checkoutIntentId } : {}),
    ...(wltPaymentRefId !== undefined ? { wlt_payment_ref_id: wltPaymentRefId } : {}),
    ...(captainId !== undefined ? { captain_id: captainId } : {}),
    created_at: String(raw.created_at ?? raw.createdAt ?? ''),
    updated_at: String(raw.updated_at ?? raw.updatedAt ?? ''),
  };
}

export function normalizeOrderResponse<T extends { readonly order?: BackendOrder }>(resp: T): DshCreateOrderResponse {
  return { order: normalizeOrder(resp.order ?? {}) };
}

export function normalizeOrderDetails(resp: { readonly order?: BackendOrder; readonly items?: readonly BackendOrderItem[] }): DshOrderDetailsResponse {
  const order = normalizeOrder(resp.order ?? {});
  const items = (resp.items ?? resp.order?.items ?? []).map((item) => normalizeOrderItem(item, order.id));
  return {
    order,
    items,
    status_events: [],
    support_tickets: [],
  };
}

export function normalizeOrderList(resp: { readonly orders?: readonly BackendOrder[]; readonly total?: number }): DshListOrdersResponse {
  const orders = (resp.orders ?? []).map(normalizeOrder);
  return {
    orders,
    total: Number(resp.total ?? orders.length),
  };
}

export function normalizeDispatchAssignmentAsOrder(raw: BackendDispatchAssignment): DshOrderRecord {
  const status = raw.delivery?.status || raw.status || 'driver_assigned';
  const captainId = raw.captainId;
  const lifecycleStatus = raw.delivery?.status;
  const podReference = raw.delivery?.podReference;
  const deliveryNote = raw.delivery?.note;
  return {
    id: String(raw.orderId ?? ''),
    store_id: '',
    fulfillment_mode: 'bthwani_delivery',
    client_id: '',
    status: normalizeDshOrderStatus(status),
    total_price: 0,
    ...(captainId !== undefined ? { captain_id: captainId } : {}),
    ...(lifecycleStatus !== undefined ? { captain_lifecycle_status: lifecycleStatus } : {}),
    ...(podReference !== undefined ? { pod_media_key: podReference } : {}),
    ...(deliveryNote !== undefined ? { delivery_failure_reason: deliveryNote } : {}),
    created_at: String(raw.createdAt ?? ''),
    updated_at: String(raw.delivery?.updatedAt ?? raw.updatedAt ?? ''),
  };
}

export function normalizeAssignmentResponse(resp: { readonly assignment?: BackendDispatchAssignment }): DshOrderRecord {
  return normalizeDispatchAssignmentAsOrder(resp.assignment ?? {});
}
