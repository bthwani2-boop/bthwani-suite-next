import { createDshHttpClient } from '../_kernel/dsh-http-request';
import { cancelOrder } from '../orders/order-cancellation.api';
import type {
  CancelOrderResponse,
  OperatorCancellationReasonCode,
} from '../orders/order-cancellation.types';
import type { DshFinancialClosureStatus } from '../orders/orders.types';

const { request } = createDshHttpClient('/api/dsh', 'operator-order-workboard', 15000);

export type OperatorOrderWorkboardRow = {
  readonly id: string;
  readonly storeId: string;
  readonly fulfillmentMode: 'bthwani_delivery' | 'partner_delivery' | 'pickup';
  readonly clientId: string;
  readonly status: string;
  readonly captainId: string | null;
  readonly captainLifecycleStatus: string | null;
  readonly podMediaKey: string | null;
  readonly deliveryFailureReason: string | null;
  readonly cancellationReasonCode: string | null;
  readonly cancellationNote: string | null;
  readonly cancelledByRole: 'client' | 'partner' | 'operator' | 'system' | null;
  readonly cancelledAt: string | null;
  readonly financialClosureStatus: DshFinancialClosureStatus;
  readonly financialClosureReference: string | null;
  readonly financialClosureFailure: string | null;
  readonly totalPrice: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export async function fetchOperatorOrderWorkboard(
  status?: string,
): Promise<{ readonly orders: readonly OperatorOrderWorkboardRow[]; readonly total: number }> {
  const params = new URLSearchParams();
  if (status?.trim()) params.set('status', status.trim());
  const query = params.toString();
  const result = await request<{
    orders?: OperatorOrderWorkboardRow[];
    total?: number;
  }>(`/dsh/operator/order-workboard${query ? `?${query}` : ''}`);
  const orders = result.orders ?? [];
  return { orders, total: result.total ?? orders.length };
}

export async function cancelOperatorOrder(
  orderId: string,
  reasonCode: OperatorCancellationReasonCode,
  reasonNote = '',
): Promise<CancelOrderResponse> {
  if (!orderId.trim()) throw { kind: 'invalid_request', message: 'orderId is required' };
  return cancelOrder('operator', orderId, { reasonCode, reasonNote });
}

export function operatorOrderWorkboardErrorMessage(error: unknown): string {
  const typed = error as { kind?: string; status?: number; message?: string; code?: string };
  if (typed.kind === 'network') return 'تعذر الاتصال بخدمة DSH.';
  if (typed.status === 401) return 'انتهت جلسة لوحة التحكم.';
  if (typed.status === 403) return 'لا تملك صلاحية قراءة أو إدارة الطلبات.';
  if (typed.status === 409) return typed.message ?? 'تغيرت حالة الطلب ولا يمكن تنفيذ الإجراء.';
  return typed.message ?? 'تعذر تحميل لوحة الطلبات التشغيلية.';
}
