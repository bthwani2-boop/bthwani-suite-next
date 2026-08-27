import type { DshOrder, DshOrderActionState, DshOrdersListState } from "./orders.types";

export function ordersEmptyState(): DshOrdersListState { return { kind: "empty" }; }
export function ordersErrorState(message: string): DshOrdersListState { return { kind: "error", message }; }
export function ordersSuccessState(orders: readonly DshOrder[]): DshOrdersListState { return { kind: "success", orders }; }
export function orderActionSubmittingState(): DshOrderActionState { return { kind: "submitting" }; }
export function orderActionSuccessState(order: DshOrder): DshOrderActionState { return { kind: "success", order }; }
export function orderActionErrorState(message: string): DshOrderActionState { return { kind: "error", message }; }
