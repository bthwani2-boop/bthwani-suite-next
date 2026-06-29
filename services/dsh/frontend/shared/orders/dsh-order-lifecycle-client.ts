import { PlatformVarsRegistry } from '../platform/platform-vars';

export type DshOrderRecord = {
  readonly id: string;
  readonly store_id: string;
  readonly client_id: string;
  readonly status: 'CREATED' | 'ACCEPTED' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'ACCEPTED_BY_CAPTAIN' | 'PICKED_UP' | 'EN_ROUTE' | 'ARRIVED' | 'FAILED_DELIVERY' | 'RETURNING_TO_STORE' | 'RETURNED';
  readonly total_price: number;
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
  readonly store_id: string;
  readonly client_id?: string;
  readonly total_price: number;
  readonly checkout_intent_id: string;
  readonly wlt_payment_ref_id?: string;
  readonly items: readonly DshOrderItemInput[];
};

export type DshCreateOrderResponse = {
  readonly order: {
    readonly id: string;
    readonly store_id: string;
    readonly client_id: string;
    readonly status: string;
    readonly total_price: number;
    readonly wlt_payment_ref_id?: string;
    readonly created_at: string;
    readonly updated_at: string;
    readonly items: readonly DshOrderItemRecord[];
  };
};

export type DshUpdateOrderStatusRequest = {
  readonly actor: 'client' | 'partner' | 'captain' | 'operator' | 'system';
  readonly status: 'CREATED' | 'ACCEPTED' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'CANCELLED';
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
};

export type DshListOrdersResponse = {
  readonly orders: readonly DshOrderRecord[];
  readonly total: number;
};

export type DshOrderFetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export type DshOrderAuthContext = {
  readonly bearerToken?: string;
  readonly clientId?: string;
};

export type DshOrderApiOfflineError = { readonly kind: 'offline' };
export type DshOrderApiHttpError = {
  readonly kind: 'http';
  readonly status: number;
  readonly body: string;
};
export type DshOrderApiError = DshOrderApiOfflineError | DshOrderApiHttpError;

export function isDshOrderApiOfflineError(err: unknown): err is DshOrderApiOfflineError {
  return typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'offline';
}

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
  acceptTask(orderId: string, req: { captain_id: string }): Promise<DshOrderRecord>;
  declineTask(orderId: string, req: { captain_id: string; reason: string }): Promise<DshOrderRecord>;
  confirmPickup(orderId: string, req: { captain_id: string }): Promise<DshOrderRecord>;
  pushLocation(
    orderId: string,
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
    latitude: number;
    longitude: number;
    lifecycle_status: string;
    order_status: string;
  }>;
  deliverOrder(orderId: string, req: DshDeliverOrderRequest): Promise<DshOrderRecord>;
  failDelivery(orderId: string, req: DshFailDeliveryRequest): Promise<DshOrderRecord>;
  confirmReturn(orderId: string, req: DshConfirmReturnRequest): Promise<DshOrderRecord>;
  refundCallback(
    orderId: string,
    req: {
      refund_ref_id: string;
      amount: number;
      status: 'CONFIRMED' | 'FAILED';
    }
  ): Promise<DshOrderRecord>;
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

function orderAuthHeaders(auth: DshOrderAuthContext, clientId = ''): Record<string, string> {
  const bearerToken = auth.bearerToken?.trim();
  if (bearerToken) return { Authorization: `Bearer ${bearerToken}` };

  const resolvedClientId = clientId.trim() || auth.clientId?.trim() || PlatformVarsRegistry.get('dshClientId')?.trim() || 'client-101';
  return resolvedClientId ? { 'X-Client-Id': resolvedClientId } : {};
}

function wltCallbackHeaders(): Record<string, string> {
  return { 'X-WLT-Callback-Token': 'dev-secret' };
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
      if (query.status) params.set('status', query.status);
      if (query.limit != null) params.set('limit', String(query.limit));
      if (query.offset != null) params.set('offset', String(query.offset));
      const qs = params.toString();
      return doFetch<DshListOrdersResponse>(baseUrl, fetchFn, 'GET', `/orders${qs ? `?${qs}` : ''}`, undefined, orderAuthHeaders(auth));
    },
    createOrder: async (req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshCreateOrderResponse>(baseUrl, fetchFn, 'POST', '/orders', req, orderAuthHeaders(auth, req.client_id));
    },
    getOrder: async (orderId) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderDetailsResponse>(baseUrl, fetchFn, 'GET', `/orders/${orderId}`, undefined, orderAuthHeaders(auth));
    },
    updateOrderStatus: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'PATCH', `/orders/${orderId}/status`, req, orderAuthHeaders(auth));
    },
    cancelOrder: async (orderId, req = {}) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/cancel`, req, orderAuthHeaders(auth));
    },
    createSupportEscalation: async (req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshSupportEscalationRecord>(baseUrl, fetchFn, 'POST', '/support/escalations', req);
    },
    assignCaptain: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/assign-captain`, req, orderAuthHeaders(auth));
    },
    acceptTask: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/accept-task`, req, orderAuthHeaders(auth, req.captain_id));
    },
    declineTask: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/decline-task`, req, orderAuthHeaders(auth, req.captain_id));
    },
    confirmPickup: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/pickup`, req, orderAuthHeaders(auth, req.captain_id));
    },
    pushLocation: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/location`, req, orderAuthHeaders(auth, req.captain_id));
    },
    getCaptainLocation: async (orderId) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<{
        latitude: number;
        longitude: number;
        lifecycle_status: string;
        order_status: string;
      }>(baseUrl, fetchFn, 'GET', `/orders/${orderId}/location`, undefined, orderAuthHeaders(auth));
    },
    deliverOrder: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/deliver`, req, orderAuthHeaders(auth, req.captain_id));
    },
    failDelivery: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/fail-delivery`, req, orderAuthHeaders(auth, req.captain_id));
    },
    confirmReturn: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/confirm-return`, req, orderAuthHeaders(auth, req.captain_id));
    },
    refundCallback: async (orderId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      return doFetch<DshOrderRecord>(baseUrl, fetchFn, 'POST', `/orders/${orderId}/refund-callback`, req, wltCallbackHeaders());
    },
  };
}
