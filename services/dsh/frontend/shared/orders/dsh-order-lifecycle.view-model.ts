import type { DshOrderRecord } from './dsh-order-lifecycle.types';
import { isOrderCancellationStatus } from './orders.types';

export function formatOrderTotalPrice(order: DshOrderRecord): string {
  const currency = order.currency?.trim();
  const total = order.total_price.toLocaleString('ar-YE');
  return currency ? `${total} ${currency}` : total;
}

export function isOrderActive(order: DshOrderRecord): boolean {
  return order.status !== 'delivered' && !isOrderCancellationStatus(order.status);
}
