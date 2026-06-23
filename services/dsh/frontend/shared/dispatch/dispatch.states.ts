import type {
  DshDispatchActionState,
  DshDispatchListState,
  DshDispatchAssignment,
  DshTrackingState,
} from "./dispatch.types";

export function dispatchIdleState(): DshDispatchListState {
  return { kind: "idle" };
}

export function dispatchLoadingState(): DshDispatchListState {
  return { kind: "loading" };
}

export function dispatchEmptyState(): DshDispatchListState {
  return { kind: "empty" };
}

export function dispatchErrorState(message: string): DshDispatchListState {
  return { kind: "error", message };
}

export function dispatchSuccessState(assignments: readonly DshDispatchAssignment[]): DshDispatchListState {
  return { kind: "success", assignments };
}

export function dispatchActionIdleState(): DshDispatchActionState {
  return { kind: "idle" };
}

export function dispatchActionSubmittingState(): DshDispatchActionState {
  return { kind: "submitting" };
}

export function dispatchActionSuccessState(assignment: DshDispatchAssignment): DshDispatchActionState {
  return { kind: "success", assignment };
}

export function dispatchActionErrorState(message: string): DshDispatchActionState {
  return { kind: "error", message };
}

export function trackingIdleState(): DshTrackingState {
  return { kind: "idle" };
}

export function trackingLoadingState(): DshTrackingState {
  return { kind: "loading" };
}

export function trackingActiveState(assignment: DshDispatchAssignment): DshTrackingState {
  return { kind: "tracking_active", assignment };
}

export function trackingDeliveredState(assignment: DshDispatchAssignment): DshTrackingState {
  return { kind: "delivered", assignment };
}

export function trackingErrorState(message: string): DshTrackingState {
  return { kind: "error", message };
}
