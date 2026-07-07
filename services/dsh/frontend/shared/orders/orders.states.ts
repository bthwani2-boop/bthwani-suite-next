import type { DshOrder, DshOrderActionState, DshOrderDetailState, DshOrdersListState } from "./orders.types";

export function ordersIdleState(): DshOrdersListState {
  return { kind: "idle" };
}

export function ordersLoadingState(): DshOrdersListState {
  return { kind: "loading" };
}

export function ordersEmptyState(): DshOrdersListState {
  return { kind: "empty" };
}

export function ordersErrorState(message: string): DshOrdersListState {
  return { kind: "error", message };
}

export function ordersSuccessState(orders: readonly DshOrder[]): DshOrdersListState {
  return { kind: "success", orders };
}

export function orderActionIdleState(): DshOrderActionState {
  return { kind: "idle" };
}

export function orderActionSubmittingState(): DshOrderActionState {
  return { kind: "submitting" };
}

export function orderActionSuccessState(order: DshOrder): DshOrderActionState {
  return { kind: "success", order };
}

export function orderActionErrorState(message: string): DshOrderActionState {
  return { kind: "error", message };
}
