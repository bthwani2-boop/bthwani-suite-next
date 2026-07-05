import { PlatformVarsRegistry } from '../platform/platform-vars';
import type { DshOrderStatus } from './orders.types';

export type DshOrderRecord = {
  readonly id: string;
  readonly store_id: string;
  readonly client_id: string;
  readonly status: DshOrderStatus;
  readonly total_price: number;
  readonly checkout_intent_id?: string;
  readonly wlt_payment_ref_id?: string;
  readonly wlt_refund_ref_id?: string;
  readonly captain_id?: string;
  readonly captain_latitude?: number;
  readonly captain_longitude?: number;
  readonly captain_lifecycle_status?: string;
  readonly pod_media_key?: string;
  readonly delivery_failure_reason?: string;
  readonly wlt_refund_trigger_ref?: string;
  readonly created_at: string;
  readonly updated_at: string;
};

export type WalletBalance = {
  readonly balanceMinorUnits: number;
  readonly currency: string;
  readonly linked: boolean;
  readonly frozenMinorUnits?: number;
  readonly updatedAt: string;
};

export type DshOrderItemRecord = {
  readonly id: string;
  readonly order_id: string;
  readonly product_id: string;
  readonly product_name?: string;
  readonly quantity: number;
  readonly price: number;
};

export type DshOrderStatusEventRecord = {
  readonly id: string;
  readonly order_id: string;
  readonly actor: 'client' | 'partner' | 'captain' | 'operator' | 'system';
  readonly from_status: string;
  readonly to_status: string;
  readonly note?: string;
  readonly created_at: string;
};

export type DshSupportEscalationRecord = {
  readonly id: string;
  readonly order_id: string;
  readonly actor: 'client' | 'partner';
  readonly issue_type: 'delayed_delivery' | 'wrong_items' | 'missing_items' | 'payment_issue' | 'other';
  readonly description: string;
  readonly status: 'open' | 'in-review' | 'resolved';
  readonly created_at: string;
  readonly resolved_at?: string;
};

export type DshOrderItemInput = {
  readonly product_id: string;
  readonly quantity: number;
  readonly price: number;
};

export type DshDeliverOrderRequest = {
  readonly captain_id: string;
  readonly pod_media_key?: string;
};

export type DshFailDeliveryRequest = {
  readonly captain_id: string;
  readonly failure_reason: string;
  readonly wlt_refund_trigger_ref?: string;
  readonly return_required?: boolean;
};

export type DshConfirmReturnRequest = {
  readonly captain_id: string;
  readonly note?: string;
};

export type DshCreateOrderRequest = {
  readonly checkout_intent_id: string;
  readonly store_id?: string;
  readonly client_id?: string;
  readonly total_price?: number;
  readonly wlt_payment_ref_id?: string;
  readonly items?: readonly DshOrderItemInput[];
};

export type DshCreateOrderResponse = {
  readonly order: DshOrderRecord;
};

export type DshUpdateOrderStatusRequest = {
  readonly actor: 'client' | 'partner' | 'captain' | 'operator' | 'system';
  readonly status: 'store_accepted' | 'preparing' | 'ready_for_pickup' | 'cancelled';
  readonly note?: string;
};

export type DshCreateSupportEscalationRequest = {
  readonly order_id: string;
  readonly actor: 'client' | 'partner';
  readonly issue_type: 'delayed_delivery' | 'wrong_items' | 'missing_items' | 'payment_issue' | 'other';
  readonly description: string;
};

export type DshOrderDetailsResponse = {
  readonly order: DshOrderRecord;
  readonly items: readonly DshOrderItemRecord[];
  readonly status_events: readonly DshOrderStatusEventRecord[];
  readonly support_tickets: readonly DshSupportEscalationRecord[];
};

export type DshListOrdersQuery = {
  readonly status?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly scope?: 'client' | 'partner' | 'operator';
};

export type DshListOrdersResponse = {
  readonly orders: readonly DshOrderRecord[];
  readonly total: number;
};

export type DshOrderFetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export type DshOrderAuthContext = {
  readonly bearerToken?: string;
  readonly clientId?: string;
  readonly scope?: 'client' | 'partner' | 'operator' | 'captain';
};

export type DshOrderApiOfflineError = { readonly kind: 'offline' };
export type DshOrderApiHttpError = {
  readonly kind: 'http';
  readonly status: number;
  readonly body: string;
};
export type DshOrderApiContractError = {
  readonly kind: 'contract';
  readonly message: string;
};
export type DshOrderApiError = DshOrderApiOfflineError | DshOrderApiHttpError | DshOrderApiContractError;

type BackendOrderItem = {
  readonly id?: string;
  readonly orderId?: string;
  readonly order_id?: string;
  readonly productId?: string;
  readonly product_id?: string;
  readonly productName?: string;
  readonly product_name?: string;
  readonly quantity?: number;
  readonly unitPrice?: number;
  readonly price?: number;
};

type BackendOrder = {
  readonly id?: string;
  readonly checkoutIntentId?: string;
  readonly checkout_intent_id?: string;
  readonly storeId?: string;
  readonly store_id?: string;
  readonly clientId?: string;
  readonly client_id?: string;
  readonly status?: string;
  readonly totalPrice?: number;
  readonly total_price?: number;
  readonly wltPaymentRefId?: string;
  readonly wlt_payment_ref_id?: string;
  readonly captainId?: string;
  readonly captain_id?: string;
  readonly createdAt?: string;
  readonly created_at?: string;
  readonly updatedAt?: string;
  readonly updated_at?: string;
  readonly items?: readonly BackendOrderItem[];
};

type BackendDispatchAssignment = {
  readonly id?: string;
  readonly orderId?: string;
  readonly captainId?: string;
  readonly status?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly delivery?: {
    readonly status?: string;
    readonly podReference?: string;
    readonly note?: string;
    readonly updatedAt?: string;
  };
};

export function isDshOrderApiOfflineError(err: unknown): err is DshOrderApiOfflineError {
  return typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'offline';
}

export function isDshOrderApiContractError(err: unknown): err is DshOrderApiContractError {
  return typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'contract';
}

/**
 * Mutations the current DSH backend contract does not expose. Surfaces must
 * consult these flags and disable the related actions instead of invoking
 * them and relying on a runtime failure.
 */
export const DSH_CAPTAIN_CONTRACT_CAPABILITIES = {
  locationPush: false,
  failDelivery: false,
  confirmReturn: false,
} as const;

export function resolveDshOrderApiBaseUrl(): string | null {
  return PlatformVarsRegistry.get('dshApiBaseUrl') ?? null;
}

export interface DshOrderLifecycleClient {
  listOrders(query?: DshListOrdersQuery): Promise<DshListOrdersResponse>;
  createOrder(req: DshCreateOrderRequest): Promise<DshCreateOrderResponse>;
  getOrder(orderId: string): Promise<DshOrderDetailsResponse>;
  updateOrderStatus(orderId: string, req: DshUpdateOrderStatusRequest): Promise<DshOrderRecord>;
  cancelOrder(orderId: string, req?: { actor?: string; note?: string }): Promise<DshOrderRecord>;
  createSupportEscalation(req: DshCreateSupportEscalationRequest): Promise<DshSupportEscalationRecord>;
  assignCaptain(orderId: string, req: { captain_id: string }): Promise<DshOrderRecord>;
  acceptTask(assignmentId: string, req: { captain_id: string }): Promise<DshOrderRecord>;
  declineTask(assignmentId: string, req: { captain_id: string; reason: string }): Promise<DshOrderRecord>;
  confirmPickup(assignmentId: string, req: { captain_id: string }): Promise<DshOrderRecord>;
  pushLocation(
    assignmentId: string,
    req: {
      captain_id: string;
      latitude: number;
      longitude: number;
      lifecycle_status: string;
      order_status?: 'EN_ROUTE' | 'ARRIVED';
    }
  ): Promise<DshOrderRecord>;
  getCaptainLocation(
    orderId: string
  ): Promise<{
    latitude: number | null;
    longitude: number | null;
    lifecycle_status: string;
    order_status: string;
  }>;
  deliverOrder(assignmentId: string, req: DshDeliverOrderRequest): Promise<DshOrderRecord>;
  failDelivery(assignmentId: string, req: DshFailDeliveryRequest): Promise<DshOrderRecord>;
  confirmReturn(assignmentId: string, req: DshConfirmReturnRequest): Promise<DshOrderRecord>;
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

function orderAuthHeaders(auth: DshOrderAuthContext): Record<string, string> {
  const bearerToken = auth.bearerToken?.trim();
  return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};
}

function unsupportedTransition(message: string): never {
  throw { kind: 'http', status: 400, body: message } as DshOrderApiHttpError;
}

function normalizeDshOrderStatus(status: unknown): DshOrderStatus {
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
    // Dispatch-assignment statuses that appear when an assignment is
    // projected as an order record (see normalizeDispatchAssignmentAsOrder).
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

function normalizeOrderItem(raw: BackendOrderItem, orderId = ''): DshOrderItemRecord {
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
  return {
    id: orderId,
    store_id: String(raw.store_id ?? raw.storeId ?? ''),
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

function normalizeOrderResponse<T extends { readonly order?: BackendOrder }>(resp: T): DshCreateOrderResponse {
  return { order: normalizeOrder(resp.order ?? {}) };
}

function normalizeOrderDetails(resp: { readonly order?: BackendOrder; readonly items?: readonly BackendOrderItem[] }): DshOrderDetailsResponse {
  const order = normalizeOrder(resp.order ?? {});
  const items = (resp.items ?? resp.order?.items ?? []).map((item) => normalizeOrderItem(item, order.id));
  return {
    order,
    items,
    status_events: [],
    support_tickets: [],
  };
}

function normalizeOrderList(resp: { readonly orders?: readonly BackendOrder[]; readonly total?: number }): DshListOrdersResponse {
  const orders = (resp.orders ?? []).map(normalizeOrder);
  return {
    orders,
    total: Number(resp.total ?? orders.length),
  };
}

function normalizeDispatchAssignmentAsOrder(raw: BackendDispatchAssignment): DshOrderRecord {
  const status = raw.delivery?.status || raw.status || 'driver_assigned';
  const captainId = raw.captainId;
  const lifecycleStatus = raw.delivery?.status;
  const podReference = raw.delivery?.podReference;
  const deliveryNote = raw.delivery?.note;
  return {
    id: String(raw.orderId ?? ''),
    store_id: '',
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

function normalizeAssignmentResponse(resp: { readonly assignment?: BackendDispatchAssignment }): DshOrderRecord {
  return normalizeDispatchAssignmentAsOrder(resp.assignment ?? {});
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
    createOrder: async (req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ order?: BackendOrder }>(
        baseUrl,
        fetchFn,
        'POST',
        '/dsh/client/orders',
        { checkoutIntentId: req.checkout_intent_id },
        orderAuthHeaders(auth),
      );
      return normalizeOrderResponse(resp);
    },
    getOrder: async (orderId) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ order?: BackendOrder }>(
        baseUrl,
        fetchFn,
        'GET',
        `/dsh/client/orders/${encodeURIComponent(orderId)}`,
        undefined,
        orderAuthHeaders(auth),
      );
      return normalizeOrderDetails(resp);
    },
    updateOrderStatus: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      if (req.actor === 'partner') {
        const partnerPath =
          req.status === 'store_accepted'
            ? 'accept'
            : req.status === 'preparing'
              ? 'preparing'
              : req.status === 'ready_for_pickup'
                ? 'ready'
                : null;
        if (!partnerPath) unsupportedTransition(`unsupported partner transition: ${req.status}`);
        const resp = await doFetch<{ order?: BackendOrder }>(
          baseUrl,
          fetchFn,
          'POST',
          `/dsh/partner/orders/${encodeURIComponent(orderId)}/${partnerPath}`,
          undefined,
          orderAuthHeaders(auth),
        );
        return normalizeOrderResponse(resp).order;
      }
      if (req.actor === 'operator' && req.status === 'cancelled') {
        const resp = await doFetch<{ order?: BackendOrder }>(
          baseUrl,
          fetchFn,
          'POST',
          `/dsh/operator/orders/${encodeURIComponent(orderId)}/cancel`,
          { reason: req.note ?? 'operator_cancelled' },
          orderAuthHeaders(auth),
        );
        return normalizeOrderResponse(resp).order;
      }
      unsupportedTransition(`unsupported order transition for ${req.actor}: ${req.status}`);
    },
    cancelOrder: async (orderId, req = {}) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ order?: BackendOrder }>(
        baseUrl,
        fetchFn,
        'POST',
        `/dsh/operator/orders/${encodeURIComponent(orderId)}/cancel`,
        { reason: req.note ?? 'operator_cancelled' },
        orderAuthHeaders(auth),
      );
      return normalizeOrderResponse(resp).order;
    },
    createSupportEscalation: async () => {
      unsupportedTransition('support escalation must use the governed DSH support ticket API');
    },
    assignCaptain: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ assignment?: BackendDispatchAssignment }>(
        baseUrl,
        fetchFn,
        'POST',
        '/dsh/operator/dispatch/assignments',
        { orderId, captainId: req.captain_id },
        orderAuthHeaders(auth),
      );
      return normalizeAssignmentResponse(resp);
    },
    acceptTask: async (assignmentId) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ assignment?: BackendDispatchAssignment }>(
        baseUrl,
        fetchFn,
        'POST',
        `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/accept`,
        undefined,
        orderAuthHeaders(auth),
      );
      return normalizeAssignmentResponse(resp);
    },
    declineTask: async (assignmentId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ assignment?: BackendDispatchAssignment }>(
        baseUrl,
        fetchFn,
        'POST',
        `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/decline`,
        { reason: req.reason },
        orderAuthHeaders(auth),
      );
      return normalizeAssignmentResponse(resp);
    },
    confirmPickup: async (assignmentId) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ assignment?: BackendDispatchAssignment }>(
        baseUrl,
        fetchFn,
        'POST',
        `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/status`,
        { status: 'picked_up' },
        orderAuthHeaders(auth),
      );
      return normalizeAssignmentResponse(resp);
    },
    pushLocation: async () => {
      unsupportedTransition('captain location push is not exposed by the current DSH backend contract');
    },
    getCaptainLocation: async (orderId) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ assignment?: BackendDispatchAssignment }>(
        baseUrl,
        fetchFn,
        'GET',
        `/dsh/client/orders/${encodeURIComponent(orderId)}/tracking`,
        undefined,
        orderAuthHeaders(auth),
      );
      const assignment = resp.assignment;
      // The DSH tracking contract exposes lifecycle state only — no captain
      // coordinates. Callers must render "tracking unavailable" for null
      // coordinates instead of plotting a fake 0,0 position.
      return {
        latitude: null,
        longitude: null,
        lifecycle_status: assignment?.delivery?.status ?? assignment?.status ?? '',
        order_status: assignment?.delivery?.status ?? assignment?.status ?? '',
      };
    },
    deliverOrder: async (assignmentId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ assignment?: BackendDispatchAssignment }>(
        baseUrl,
        fetchFn,
        'POST',
        `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/pod`,
        { method: 'photo', reference: req.pod_media_key ?? 'captain-confirmed-delivery' },
        orderAuthHeaders(auth),
      );
      return normalizeAssignmentResponse(resp);
    },
    failDelivery: async () => {
      unsupportedTransition('failed delivery mutation is not exposed by the current DSH backend contract');
    },
    confirmReturn: async () => {
      unsupportedTransition('return confirmation mutation is not exposed by the current DSH backend contract');
    },
  };
}
