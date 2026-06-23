import type { DshOrder } from "./orders.types";
import { ordersEmptyState, ordersSuccessState } from "./orders.states";

export function resolveOrdersListState(orders: readonly DshOrder[]) {
  return orders.length === 0 ? ordersEmptyState() : ordersSuccessState(orders);
}

export function hasRejectReason(reason: string): boolean {
  return reason.trim().length > 0;
}
