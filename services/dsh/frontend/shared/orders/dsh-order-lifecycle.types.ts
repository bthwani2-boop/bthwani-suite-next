import type { DshOrderStatus } from './orders.types';

export type DshOrderRecord = {
  readonly id: string;
  /** Present for canonical order projections; dispatch-only projections omit it. */
  readonly version?: number;
  readonly store_id: string;
  readonly fulfillment_mode: 'bthwani_delivery' | 'partner_delivery' | 'pickup';
  readonly client_id: string;
  readonly status: DshOrderStatus;
  readonly total_price: number;
  /** Present for governed DSH orders; omitted only for dispatch-only projections. */
  readonly currency?: string;
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
  readonly currency?: string;
};

export type BackendOrder = {
  readonly id?: string;
  readonly version?: number;
  readonly checkoutIntentId?: string;
  readonly checkout_intent_id?: string;
  readonly storeId?: string;
  readonly store_id?: string;
  readonly fulfillmentMode?: 'bthwani_delivery' | 'partner_delivery' | 'pickup';
  readonly fulfillment_mode?: 'bthwani_delivery' | 'partner_delivery' | 'pickup';
  readonly clientId?: string;
  readonly client_id?: string;
  readonly status?: string;
  readonly totalPrice?: number;
  readonly total_price?: number;
  readonly currency?: string;
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

export interface DshOrderLifecycleClient {
  listOrders(query?: DshListOrdersQuery): Promise<DshListOrdersResponse>;
}
