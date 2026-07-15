import {
  visitIdleState, visitLoadingState, visitSuccessState, visitEmptyState, visitErrorState,
  visitActionIdleState, visitActionSubmittingState, visitActionSuccessState, visitActionErrorState,
  checklistIdleState, checklistLoadingState, checklistSuccessState, checklistErrorState,
  checkActionIdleState, checkActionSubmittingState, checkActionSuccessState, checkActionErrorState,
  escalationIdleState, escalationLoadingState, escalationSuccessState, escalationEmptyState, escalationErrorState,
  escalationActionIdleState, escalationActionSubmittingState, escalationActionSuccessState, escalationActionErrorState,
  onboardingStatusIdleState, onboardingStatusLoadingState, onboardingStatusSuccessState, onboardingStatusErrorState,
} from "./field-readiness.states";
import type {
  DshVisitListState, DshVisitActionState,
  DshChecklistState, DshCheckActionState,
  DshEscalationListState, DshEscalationActionState,
  DshOnboardingStatusState,
} from "./field-readiness.states";
import {
  createFieldVisit, fetchFieldVisits, completeFieldVisit,
  upsertReadinessCheck, fetchVisitChecks,
  createReadinessEscalation, fetchOperatorEscalations, updateEscalation,
  fetchPartnerOnboardingStatus, classifyFieldReadinessError,
} from "./field-readiness.api";
import type { DshCreateVisitInput, DshCompleteVisitInput, DshUpsertCheckInput, DshCreateEscalationInput, DshUpdateEscalationInput } from "./field-readiness.types";

export type FieldVisitControllerState = {
  readonly listState: DshVisitListState;
  readonly actionState: DshVisitActionState;
};

export type FieldChecklistControllerState = {
  readonly checklistState: DshChecklistState;
  readonly checkActionState: DshCheckActionState;
};

export type FieldEscalationControllerState = {
  readonly listState: DshEscalationListState;
  readonly actionState: DshEscalationActionState;
};

export function makeFieldVisitController(
  state: FieldVisitControllerState,
  setState: (s: FieldVisitControllerState) => void,
) {
  async function loadVisits(storeId: string): Promise<void> {
    setState({ ...state, listState: visitLoadingState() });
    try {
      const visits = await fetchFieldVisits(storeId);
      setState({ ...state, listState: visits.length === 0 ? visitEmptyState() : visitSuccessState(visits) });
    } catch (err) {
      setState({ ...state, listState: visitErrorState(resolveMessage(err)) });
    }
  }

  async function startVisit(storeId: string, input: DshCreateVisitInput): Promise<void> {
    setState({ ...state, actionState: visitActionSubmittingState() });
    try {
      const visit = await createFieldVisit(storeId, input);
      setState({ ...state, actionState: visitActionSuccessState(visit) });
    } catch (err) {
      setState({ ...state, actionState: visitActionErrorState(resolveMessage(err)) });
    }
  }

  async function completeVisit(visitId: string, input: DshCompleteVisitInput): Promise<void> {
    setState({ ...state, actionState: visitActionSubmittingState() });
    try {
      const visit = await completeFieldVisit(visitId, input);
      setState({ ...state, actionState: visitActionSuccessState(visit) });
    } catch (err) {
      setState({ ...state, actionState: visitActionErrorState(resolveMessage(err)) });
    }
  }

  function resetAction(): void {
    setState({ ...state, actionState: visitActionIdleState() });
  }

  return { loadVisits, startVisit, completeVisit, resetAction };
}

export function makeFieldChecklistController(
  state: FieldChecklistControllerState,
  setState: (s: FieldChecklistControllerState) => void,
) {
  async function loadChecks(visitId: string): Promise<void> {
    setState({ ...state, checklistState: checklistLoadingState() });
    try {
      const checks = await fetchVisitChecks(visitId);
      setState({ ...state, checklistState: checklistSuccessState(checks) });
    } catch (err) {
      setState({ ...state, checklistState: checklistErrorState(resolveMessage(err)) });
    }
  }

  async function submitCheck(visitId: string, input: DshUpsertCheckInput): Promise<void> {
    setState({ ...state, checkActionState: checkActionSubmittingState() });
    try {
      const check = await upsertReadinessCheck(visitId, input);
      setState({ ...state, checkActionState: checkActionSuccessState(check) });
    } catch (err) {
      setState({ ...state, checkActionState: checkActionErrorState(resolveMessage(err)) });
    }
  }

  function resetCheckAction(): void {
    setState({ ...state, checkActionState: checkActionIdleState() });
  }

  return { loadChecks, submitCheck, resetCheckAction };
}

export function makeFieldEscalationController(
  state: FieldEscalationControllerState,
  setState: (s: FieldEscalationControllerState) => void,
) {
  async function loadOperatorEscalations(statusFilter?: string): Promise<void> {
    setState({ ...state, listState: escalationLoadingState() });
    try {
      const escalations = await fetchOperatorEscalations(statusFilter);
      setState({ ...state, listState: escalations.length === 0 ? escalationEmptyState() : escalationSuccessState(escalations) });
    } catch (err) {
      setState({ ...state, listState: escalationErrorState(resolveMessage(err)) });
    }
  }

  async function raiseEscalation(storeId: string, input: DshCreateEscalationInput): Promise<void> {
    setState({ ...state, actionState: escalationActionSubmittingState() });
    try {
      const escalation = await createReadinessEscalation(storeId, input);
      setState({ ...state, actionState: escalationActionSuccessState(escalation) });
    } catch (err) {
      setState({ ...state, actionState: escalationActionErrorState(resolveMessage(err)) });
    }
  }

  async function resolveEscalation(escalationId: string, input: DshUpdateEscalationInput): Promise<void> {
    setState({ ...state, actionState: escalationActionSubmittingState() });
    try {
      const escalation = await updateEscalation(escalationId, input);
      setState({ ...state, actionState: escalationActionSuccessState(escalation) });
    } catch (err) {
      setState({ ...state, actionState: escalationActionErrorState(resolveMessage(err)) });
    }
  }

  function resetAction(): void {
    setState({ ...state, actionState: escalationActionIdleState() });
  }

  return { loadOperatorEscalations, raiseEscalation, resolveEscalation, resetAction };
}

export function makePartnerOnboardingStatusController(
  state: DshOnboardingStatusState,
  setState: (s: DshOnboardingStatusState) => void,
) {
  async function loadStatus(storeId: string): Promise<void> {
    setState(onboardingStatusLoadingState());
    try {
      const status = await fetchPartnerOnboardingStatus(storeId);
      setState(onboardingStatusSuccessState(status));
    } catch (err) {
      setState(onboardingStatusErrorState(resolveMessage(err)));
    }
  }

  return { loadStatus };
}

function resolveMessage(err: unknown): string {
  const classified = classifyFieldReadinessError(err);
  switch (classified.kind) {
    case "permission_denied": return "غير مصرح لك بهذه العملية";
    case "offline": return "لا يوجد اتصال بالإنترنت";
    case "not_found": return "لم يتم إيجاد السجل";
    default: return "حدث خطأ، يرجى المحاولة مجدداً";
  }
}

export function makeInitialVisitControllerState(): FieldVisitControllerState {
  return { listState: visitIdleState(), actionState: visitActionIdleState() };
}

export function makeInitialChecklistControllerState(): FieldChecklistControllerState {
  return { checklistState: checklistIdleState(), checkActionState: checkActionIdleState() };
}

export function makeInitialEscalationControllerState(): FieldEscalationControllerState {
  return { listState: escalationIdleState(), actionState: escalationActionIdleState() };
}
