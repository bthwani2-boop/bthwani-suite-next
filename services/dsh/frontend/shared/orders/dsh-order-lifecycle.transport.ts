import { PlatformVarsRegistry } from '../platform/platform-vars';
import type {
  DshOrderLifecycleClient,
  DshListOrdersQuery,
  DshListOrdersResponse,
  DshOrderFetchFn,
  DshOrderAuthContext,
  DshOrderApiOfflineError,
  DshOrderApiHttpError,
  DshOrderDetailsResponse,
  DshUpdateOrderStatusRequest,
  DshOrderRecord,
  DshCreateSupportEscalationRequest,
  DshSupportEscalationRecord,
  DshConfirmReturnRequest,
  DshFailDeliveryRequest,
  DshDeliverOrderRequest,
  BackendOrder,
  BackendDispatchAssignment
} from './dsh-order-lifecycle.types';
import {
  normalizeDshOrderStatus,
  normalizeOrderList,
  normalizeOrderResponse,
  normalizeOrderDetails,
  normalizeAssignmentResponse
} from './dsh-order-lifecycle.adapter';

export function resolveDshOrderApiBaseUrl(): string | null {
  return PlatformVarsRegistry.get('dshApiBaseUrl') ?? null;
}

function orderAuthHeaders(auth: DshOrderAuthContext): Record<string, string> {
  const bearerToken = auth.bearerToken?.trim();
  return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};
}

export function unsupportedTransition(message: string): never {
  throw { kind: 'http', status: 400, body: message } as DshOrderApiHttpError;
}

export async function doFetch<T>(
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

export function ordersPathForScope(scope: DshListOrdersQuery['scope'] | DshOrderAuthContext['scope']): string {
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
        if (!Number.isInteger(req.expectedVersion) || req.expectedVersion < 1 || req.idempotencyKey.trim().length < 8) {
          unsupportedTransition('partner order mutations require expectedVersion and Idempotency-Key');
        }
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
          {
            ...orderAuthHeaders(auth),
            'Idempotency-Key': req.idempotencyKey,
            'If-Match-Version': String(req.expectedVersion),
          },
        );
        return normalizeOrderResponse(resp).order;
      }
      unsupportedTransition(`unsupported order transition for ${req.actor}: ${req.status}`);
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
    pushLocation: async (assignmentId, req) => {
      if (!baseUrl) throw { kind: 'offline' } as DshOrderApiOfflineError;
      const resp = await doFetch<{ assignment?: BackendDispatchAssignment }>(
        baseUrl,
        fetchFn,
        'POST',
        `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/location`,
        {
          latitude: req.latitude,
          longitude: req.longitude,
          accuracyMeters: req.accuracy_meters,
          recordedAt: req.recorded_at,
        },
        orderAuthHeaders(auth),
      );
      return normalizeAssignmentResponse(resp);
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
      return {
        latitude: assignment?.lastLatitude ?? null,
        longitude: assignment?.lastLongitude ?? null,
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
