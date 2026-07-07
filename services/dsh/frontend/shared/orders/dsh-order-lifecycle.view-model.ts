import type { DshOrderRecord } from './dsh-order-lifecycle.types';

export function formatOrderTotalPrice(order: DshOrderRecord): string {
  return `${order.total_price.toLocaleString('ar-YE')} ر.ي`;
}

export function isOrderActive(order: DshOrderRecord): boolean {
  return order.status !== 'delivered' && order.status !== 'cancelled';
}
