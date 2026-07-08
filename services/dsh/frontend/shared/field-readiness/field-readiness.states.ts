import type { DshFieldVisit, DshReadinessCheck, DshReadinessEscalation, DshOnboardingStatus, DshFieldWorkQueue } from "./field-readiness.types";

export type DshVisitListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly visits: readonly DshFieldVisit[] }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export type DshVisitActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly visit: DshFieldVisit }
  | { readonly kind: "error"; readonly message: string };

export type DshChecklistState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly checks: readonly DshReadinessCheck[] }
  | { readonly kind: "error"; readonly message: string };

export type DshCheckActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly check: DshReadinessCheck }
  | { readonly kind: "error"; readonly message: string };

export type DshEscalationListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly escalations: readonly DshReadinessEscalation[] }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export type DshEscalationActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly escalation: DshReadinessEscalation }
  | { readonly kind: "error"; readonly message: string };

export type DshOnboardingStatusState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly status: DshOnboardingStatus }
  | { readonly kind: "error"; readonly message: string };

export function visitIdleState(): DshVisitListState { return { kind: "idle" }; }
export function visitLoadingState(): DshVisitListState { return { kind: "loading" }; }
export function visitEmptyState(): DshVisitListState { return { kind: "empty" }; }
export function visitErrorState(message: string): DshVisitListState { return { kind: "error", message }; }
export function visitSuccessState(visits: readonly DshFieldVisit[]): DshVisitListState { return { kind: "success", visits }; }

export function visitActionIdleState(): DshVisitActionState { return { kind: "idle" }; }
export function visitActionSubmittingState(): DshVisitActionState { return { kind: "submitting" }; }
export function visitActionSuccessState(visit: DshFieldVisit): DshVisitActionState { return { kind: "success", visit }; }
export function visitActionErrorState(message: string): DshVisitActionState { return { kind: "error", message }; }

export function checklistIdleState(): DshChecklistState { return { kind: "idle" }; }
export function checklistLoadingState(): DshChecklistState { return { kind: "loading" }; }
export function checklistSuccessState(checks: readonly DshReadinessCheck[]): DshChecklistState { return { kind: "success", checks }; }
export function checklistErrorState(message: string): DshChecklistState { return { kind: "error", message }; }

export function checkActionIdleState(): DshCheckActionState { return { kind: "idle" }; }
export function checkActionSubmittingState(): DshCheckActionState { return { kind: "submitting" }; }
export function checkActionSuccessState(check: DshReadinessCheck): DshCheckActionState { return { kind: "success", check }; }
export function checkActionErrorState(message: string): DshCheckActionState { return { kind: "error", message }; }

export function escalationIdleState(): DshEscalationListState { return { kind: "idle" }; }
export function escalationLoadingState(): DshEscalationListState { return { kind: "loading" }; }
export function escalationEmptyState(): DshEscalationListState { return { kind: "empty" }; }
export function escalationErrorState(message: string): DshEscalationListState { return { kind: "error", message }; }
export function escalationSuccessState(escalations: readonly DshReadinessEscalation[]): DshEscalationListState { return { kind: "success", escalations }; }

export function escalationActionIdleState(): DshEscalationActionState { return { kind: "idle" }; }
export function escalationActionSubmittingState(): DshEscalationActionState { return { kind: "submitting" }; }
export function escalationActionSuccessState(escalation: DshReadinessEscalation): DshEscalationActionState { return { kind: "success", escalation }; }
export function escalationActionErrorState(message: string): DshEscalationActionState { return { kind: "error", message }; }

export function onboardingStatusIdleState(): DshOnboardingStatusState { return { kind: "idle" }; }
export function onboardingStatusLoadingState(): DshOnboardingStatusState { return { kind: "loading" }; }
export function onboardingStatusSuccessState(status: DshOnboardingStatus): DshOnboardingStatusState { return { kind: "success", status }; }
export function onboardingStatusErrorState(message: string): DshOnboardingStatusState { return { kind: "error", message }; }

export type DshWorkQueueState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly queue: DshFieldWorkQueue }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export function workQueueIdleState(): DshWorkQueueState { return { kind: "idle" }; }
export function workQueueLoadingState(): DshWorkQueueState { return { kind: "loading" }; }
export function workQueueErrorState(message: string): DshWorkQueueState { return { kind: "error", message }; }
export function workQueueSuccessState(queue: DshFieldWorkQueue): DshWorkQueueState {
  return queue.visits.length === 0 && queue.escalations.length === 0 ? { kind: "empty" } : { kind: "success", queue };
}
