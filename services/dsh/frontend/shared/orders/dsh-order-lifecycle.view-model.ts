import type { DshOrderRecord } from './dsh-order-lifecycle.types';
import { isOrderCancellationStatus } from './orders.types';
import { formatWltMoney } from '@bthwani/dsh/wlt';

export function formatOrderTotalPrice(order: DshOrderRecord): string {
  const currency = order.currency?.trim();
  return currency ? formatWltMoney(order.total_price, currency) : String(order.total_price);
}

export function isOrderActive(order: DshOrderRecord): boolean {
  return order.status !== 'delivered' && !isOrderCancellationStatus(order.status);
}
