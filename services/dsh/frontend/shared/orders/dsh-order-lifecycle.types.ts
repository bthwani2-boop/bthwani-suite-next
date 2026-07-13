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

type WalletBalance = {
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
type DshOrderApiError = DshOrderApiOfflineError | DshOrderApiHttpError | DshOrderApiContractError;

export type BackendOrderItem = {
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

export type BackendOrder = {
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

export type BackendDispatchAssignment = {
  readonly id?: string;
  readonly orderId?: string;
  readonly captainId?: string;
  readonly status?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  // Only the captain's latest foreground location sample is retained (no
  // history) and it is purged to null once the assignment closes.
  readonly lastLatitude?: number | null;
  readonly lastLongitude?: number | null;
  readonly locationRecordedAt?: string | null;
  readonly delivery?: {
    readonly status?: string;
    readonly podReference?: string;
    readonly note?: string;
    readonly updatedAt?: string;
  };
};

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
