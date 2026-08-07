import type { FieldReadinessProblem } from "./field-readiness.problem";
import type { DshFieldVisit, DshReadinessCheck, DshReadinessEscalation, DshOnboardingStatus, DshFieldWorkQueue } from "./field-readiness.types";

export type DshFieldReadinessErrorState = {
  readonly kind: "error";
  readonly message: string;
  readonly problem: FieldReadinessProblem;
};

export type DshVisitListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly visits: readonly DshFieldVisit[] }
  | { readonly kind: "empty" }
  | DshFieldReadinessErrorState;

export type DshVisitActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly visit: DshFieldVisit }
  | { readonly kind: "queued"; readonly operationId: string; readonly message: string }
  | DshFieldReadinessErrorState;

export type DshChecklistState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly visit: DshFieldVisit; readonly checks: readonly DshReadinessCheck[] }
  | DshFieldReadinessErrorState;

export type DshCheckActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly check: DshReadinessCheck }
  | { readonly kind: "queued"; readonly operationId: string; readonly message: string }
  | DshFieldReadinessErrorState;

export type DshEscalationListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly escalations: readonly DshReadinessEscalation[] }
  | { readonly kind: "empty" }
  | DshFieldReadinessErrorState;

export type DshEscalationActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly escalation: DshReadinessEscalation }
  | { readonly kind: "queued"; readonly operationId: string; readonly message: string }
  | DshFieldReadinessErrorState;

export type DshOnboardingStatusState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly status: DshOnboardingStatus }
  | DshFieldReadinessErrorState;

function normalizeProblem(problem: FieldReadinessProblem | string): FieldReadinessProblem {
  if (typeof problem !== "string") return problem;
  return {
    kind: "validation",
    code: "CLIENT_VALIDATION",
    message: problem,
    retryable: false,
    nextAction: "correct_input",
  };
}

function errorState(problem: FieldReadinessProblem | string): DshFieldReadinessErrorState {
  const normalized = normalizeProblem(problem);
  return { kind: "error", message: normalized.message, problem: normalized };
}

export function visitIdleState(): DshVisitListState { return { kind: "idle" }; }
export function visitLoadingState(): DshVisitListState { return { kind: "loading" }; }
export function visitEmptyState(): DshVisitListState { return { kind: "empty" }; }
export function visitErrorState(problem: FieldReadinessProblem | string): DshVisitListState { return errorState(problem); }
export function visitSuccessState(visits: readonly DshFieldVisit[]): DshVisitListState { return { kind: "success", visits }; }

export function visitActionIdleState(): DshVisitActionState { return { kind: "idle" }; }
export function visitActionSubmittingState(): DshVisitActionState { return { kind: "submitting" }; }
export function visitActionSuccessState(visit: DshFieldVisit): DshVisitActionState { return { kind: "success", visit }; }
export function visitActionQueuedState(operationId: string, message: string): DshVisitActionState { return { kind: "queued", operationId, message }; }
export function visitActionErrorState(problem: FieldReadinessProblem | string): DshVisitActionState { return errorState(problem); }

export function checklistIdleState(): DshChecklistState { return { kind: "idle" }; }
export function checklistLoadingState(): DshChecklistState { return { kind: "loading" }; }
export function checklistSuccessState(visit: DshFieldVisit, checks: readonly DshReadinessCheck[]): DshChecklistState { return { kind: "success", visit, checks }; }
export function checklistErrorState(problem: FieldReadinessProblem | string): DshChecklistState { return errorState(problem); }

export function checkActionIdleState(): DshCheckActionState { return { kind: "idle" }; }
export function checkActionSubmittingState(): DshCheckActionState { return { kind: "submitting" }; }
export function checkActionSuccessState(check: DshReadinessCheck): DshCheckActionState { return { kind: "success", check }; }
export function checkActionQueuedState(operationId: string, message: string): DshCheckActionState { return { kind: "queued", operationId, message }; }
export function checkActionErrorState(problem: FieldReadinessProblem | string): DshCheckActionState { return errorState(problem); }

export function escalationIdleState(): DshEscalationListState { return { kind: "idle" }; }
export function escalationLoadingState(): DshEscalationListState { return { kind: "loading" }; }
export function escalationEmptyState(): DshEscalationListState { return { kind: "empty" }; }
export function escalationErrorState(problem: FieldReadinessProblem | string): DshEscalationListState { return errorState(problem); }
export function escalationSuccessState(escalations: readonly DshReadinessEscalation[]): DshEscalationListState { return { kind: "success", escalations }; }

export function escalationActionIdleState(): DshEscalationActionState { return { kind: "idle" }; }
export function escalationActionSubmittingState(): DshEscalationActionState { return { kind: "submitting" }; }
export function escalationActionSuccessState(escalation: DshReadinessEscalation): DshEscalationActionState { return { kind: "success", escalation }; }
export function escalationActionQueuedState(operationId: string, message: string): DshEscalationActionState { return { kind: "queued", operationId, message }; }
export function escalationActionErrorState(problem: FieldReadinessProblem | string): DshEscalationActionState { return errorState(problem); }

export function onboardingStatusIdleState(): DshOnboardingStatusState { return { kind: "idle" }; }
export function onboardingStatusLoadingState(): DshOnboardingStatusState { return { kind: "loading" }; }
export function onboardingStatusSuccessState(status: DshOnboardingStatus): DshOnboardingStatusState { return { kind: "success", status }; }
export function onboardingStatusErrorState(problem: FieldReadinessProblem | string): DshOnboardingStatusState { return errorState(problem); }

export type DshWorkQueueState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly queue: DshFieldWorkQueue }
  | { readonly kind: "empty" }
  | DshFieldReadinessErrorState;

export function workQueueIdleState(): DshWorkQueueState { return { kind: "idle" }; }
export function workQueueLoadingState(): DshWorkQueueState { return { kind: "loading" }; }
export function workQueueErrorState(problem: FieldReadinessProblem | string): DshWorkQueueState { return errorState(problem); }
export function workQueueSuccessState(queue: DshFieldWorkQueue): DshWorkQueueState {
  return queue.visits.length === 0 && queue.escalations.length === 0 ? { kind: "empty" } : { kind: "success", queue };
}
