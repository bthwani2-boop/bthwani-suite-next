import { useCallback, useEffect, useState } from "react";
import {
  buildFieldMutationContext,
  createGovernedProblem,
  createFieldVisit,
  fetchFieldVisits,
  completeFieldVisit,
  upsertReadinessCheck,
  fetchVisitChecks,
  createReadinessEscalation,
  fetchOperatorEscalations,
  updateEscalation,
  fetchPartnerOnboardingStatus,
  fetchFieldWorkQueue,
  classifyGovernedError,
  type FieldMutationContext,
  type GovernedProblem,
} from "./field-readiness.api";
import { enqueueFieldOperation, type FieldOfflineOperationType } from "./field-offline-queue";
import {
  visitIdleState, visitLoadingState, visitSuccessState, visitEmptyState, visitErrorState,
  visitActionIdleState, visitActionSubmittingState, visitActionSuccessState, visitActionQueuedState, visitActionErrorState,
  checklistIdleState, checklistLoadingState, checklistSuccessState, checklistErrorState,
  checkActionIdleState, checkActionSubmittingState, checkActionSuccessState, checkActionQueuedState, checkActionErrorState,
  escalationIdleState, escalationLoadingState, escalationSuccessState, escalationEmptyState, escalationErrorState,
  escalationActionIdleState, escalationActionSubmittingState, escalationActionSuccessState, escalationActionQueuedState, escalationActionErrorState,
  onboardingStatusIdleState, onboardingStatusLoadingState, onboardingStatusSuccessState, onboardingStatusErrorState,
  workQueueIdleState, workQueueLoadingState, workQueueSuccessState, workQueueErrorState,
} from "./field-readiness.states";
import type {
  DshCreateVisitInput,
  DshCompleteVisitInput,
  DshUpsertCheckInput,
  DshCreateEscalationInput,
  DshUpdateEscalationInput,
  DshFieldVisit,
  DshReadinessCheck,
} from "./field-readiness.types";

function resolveProblem(error: unknown): GovernedProblem {
  return classifyGovernedError(error);
}

function isAuthenticated(authKind: string) {
  return authKind === "authenticated";
}

async function enqueueIfOffline<P>(
  error: unknown,
  operationType: FieldOfflineOperationType,
  payload: P,
  context: FieldMutationContext,
) {
  if (resolveProblem(error).kind !== "offline") return null;
  return enqueueFieldOperation(
    operationType,
    payload,
    context.idempotencyKey,
    context.correlationId,
    context.intentFingerprint,
    context.operationId,
  );
}

export function useFieldVisitController(storeId: string, authKind = "unauthenticated") {
  const [listState, setListState] = useState(visitIdleState());
  const [actionState, setActionState] = useState(visitActionIdleState());

  const load = useCallback(async () => {
    setListState(visitLoadingState());
    try {
      const visits = await fetchFieldVisits(storeId);
      setListState(visits.length === 0 ? visitEmptyState() : visitSuccessState(visits));
    } catch (error) {
      setListState(visitErrorState(resolveProblem(error)));
    }
  }, [storeId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  const startVisit = useCallback(async (input: DshCreateVisitInput) => {
    setActionState(visitActionSubmittingState());
    const context = buildFieldMutationContext(
      "create_visit",
      { storeId, input },
    );
    try {
      const visit = await createFieldVisit(storeId, input, context);
      setActionState(visitActionSuccessState(visit));
      await load();
    } catch (error) {
      try {
        const queued = await enqueueIfOffline(error, "create_visit", { storeId, input }, context);
        if (queued) {
          setActionState(visitActionQueuedState(queued.operationId, "create_visit", "تم حفظ بدء الزيارة للمزامنة عند عودة الاتصال."));
          return;
        }
      } catch (queueError) {
        setActionState(visitActionErrorState(resolveProblem(queueError)));
        return;
      }
      setActionState(visitActionErrorState(resolveProblem(error)));
    }
  }, [storeId, load]);

  const completeVisitAction = useCallback(async (visitId: string, input: DshCompleteVisitInput) => {
    setActionState(visitActionSubmittingState());
    const context = buildFieldMutationContext("complete_visit", { visitId, input });
    try {
      const visit = await completeFieldVisit(visitId, input, context);
      setActionState(visitActionSuccessState(visit));
      await load();
    } catch (error) {
      try {
        const queued = await enqueueIfOffline(error, "complete_visit", { visitId, input }, context);
        if (queued) {
          setActionState(visitActionQueuedState(queued.operationId, "complete_visit", "تم حفظ إتمام الزيارة للمزامنة عند عودة الاتصال."));
          return;
        }
      } catch (queueError) {
        setActionState(visitActionErrorState(resolveProblem(queueError)));
        return;
      }
      setActionState(visitActionErrorState(resolveProblem(error)));
    }
  }, [load]);

  const resetAction = useCallback(() => setActionState(visitActionIdleState()), []);

  return { listState, actionState, reload: load, startVisit, completeVisit: completeVisitAction, resetAction };
}

export function useFieldChecklistController(
  storeId: string,
  visitId: string,
  authKind = "unauthenticated",
) {
  const [checklistState, setChecklistState] = useState(checklistIdleState());
  const [checkActionState, setCheckActionState] = useState(checkActionIdleState());

  const load = useCallback(async () => {
    setChecklistState(checklistLoadingState());
    try {
      const [visits, checks] = await Promise.all([
        fetchFieldVisits(storeId),
        fetchVisitChecks(visitId),
      ]);
      const visit = visits.find((candidate) => candidate.id === visitId);
      if (!visit) {
        setChecklistState(checklistErrorState(createGovernedProblem(
          "VISIT_NOT_IN_STORE_SCOPE",
          "لم يتم إيجاد الزيارة المحددة ضمن المتجر أو نطاق التكليف الحالي.",
          { kind: "not_found", nextAction: "refresh_record" },
        )));
        return;
      }
      setChecklistState(checklistSuccessState(visit, checks));
    } catch (error) {
      setChecklistState(checklistErrorState(resolveProblem(error)));
    }
  }, [storeId, visitId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  const submitCheck = useCallback(async (input: DshUpsertCheckInput) => {
    if (checklistState.kind !== "success" || checklistState.visit.status !== "in_progress") {
      setCheckActionState(checkActionErrorState(createGovernedProblem(
        "VISIT_NOT_EDITABLE",
        "لا يمكن تعديل قائمة التحقق بعد إغلاق الزيارة أو قبل تحميلها.",
        { kind: "blocked", nextAction: "refresh_record" },
      )));
      return false;
    }
    setCheckActionState(checkActionSubmittingState());
    const context = buildFieldMutationContext(
      "upsert_readiness_check",
      { visitId, input },
    );
    try {
      const check = await upsertReadinessCheck(visitId, input, context);
      setCheckActionState(checkActionSuccessState(check));
      await load();
      return true;
    } catch (error) {
      try {
        const queued = await enqueueIfOffline(error, "upsert_readiness_check", { visitId, input }, context);
        if (queued) {
          setCheckActionState(checkActionQueuedState(queued.operationId, "upsert_readiness_check", "تم حفظ نتيجة التحقق للمزامنة عند عودة الاتصال."));
          return true;
        }
      } catch (queueError) {
        setCheckActionState(checkActionErrorState(resolveProblem(queueError)));
        return false;
      }
      setCheckActionState(checkActionErrorState(resolveProblem(error)));
      return false;
    }
  }, [checklistState, visitId, load]);

  const resetCheckAction = useCallback(() => setCheckActionState(checkActionIdleState()), []);

  return { checklistState, checkActionState, reload: load, submitCheck, resetCheckAction };
}

export function useFieldEscalationController(authKind = "unauthenticated") {
  const [listState, setListState] = useState(escalationIdleState());
  const [actionState, setActionState] = useState(escalationActionIdleState());

  const loadOperatorEscalations = useCallback(async (statusFilter?: string) => {
    setListState(escalationLoadingState());
    try {
      const escalations = await fetchOperatorEscalations(statusFilter);
      setListState(escalations.length === 0 ? escalationEmptyState() : escalationSuccessState(escalations));
    } catch (error) {
      setListState(escalationErrorState(resolveProblem(error)));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated(authKind)) void loadOperatorEscalations();
  }, [authKind, loadOperatorEscalations]);

  const raiseEscalation = useCallback(async (storeId: string, input: DshCreateEscalationInput) => {
    setActionState(escalationActionSubmittingState());
    const context = buildFieldMutationContext(
      "create_escalation",
      { storeId, input },
    );
    try {
      const escalation = await createReadinessEscalation(storeId, input, context);
      setActionState(escalationActionSuccessState(escalation));
      return true;
    } catch (error) {
      try {
        const queued = await enqueueIfOffline(error, "create_escalation", { storeId, input }, context);
        if (queued) {
          setActionState(escalationActionQueuedState(queued.operationId, "create_escalation", "تم حفظ التصعيد للمزامنة عند عودة الاتصال."));
          return true;
        }
      } catch (queueError) {
        setActionState(escalationActionErrorState(resolveProblem(queueError)));
        return false;
      }
      setActionState(escalationActionErrorState(resolveProblem(error)));
      return false;
    }
  }, []);

  const resolveEscalation = useCallback(async (escalationId: string, input: DshUpdateEscalationInput) => {
    setActionState(escalationActionSubmittingState());
    try {
      const escalation = await updateEscalation(escalationId, input);
      setActionState(escalationActionSuccessState(escalation));
    } catch (error) {
      setActionState(escalationActionErrorState(resolveProblem(error)));
    }
  }, []);

  const resetAction = useCallback(() => setActionState(escalationActionIdleState()), []);

  return { listState, actionState, loadOperatorEscalations, raiseEscalation, resolveEscalation, resetAction };
}

function usePartnerOnboardingStatusController(storeId: string, authKind = "unauthenticated") {
  const [state, setState] = useState(onboardingStatusIdleState());

  const load = useCallback(async () => {
    setState(onboardingStatusLoadingState());
    try {
      const status = await fetchPartnerOnboardingStatus(storeId);
      setState(onboardingStatusSuccessState(status));
    } catch (error) {
      setState(onboardingStatusErrorState(resolveProblem(error)));
    }
  }, [storeId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  return { state, reload: load };
}

export function useFieldWorkQueueController(authKind = "unauthenticated") {
  const [state, setState] = useState(workQueueIdleState());

  const load = useCallback(async () => {
    setState(workQueueLoadingState());
    try {
      const queue = await fetchFieldWorkQueue();
      setState(workQueueSuccessState(queue));
    } catch (error) {
      setState(workQueueErrorState(resolveProblem(error)));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  return { state, reload: load };
}

export type FieldVerificationLoadState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string; readonly problem: GovernedProblem }
  | {
      readonly kind: "success";
      readonly visit: DshFieldVisit;
      readonly checks: readonly DshReadinessCheck[];
      readonly canVerify: boolean;
    };

export function useFieldVerificationController(
  storeId: string,
  visitId: string,
  authKind = "unauthenticated",
) {
  const [state, setState] = useState<FieldVerificationLoadState>({ kind: "idle" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [visits, checks] = await Promise.all([
        fetchFieldVisits(storeId),
        fetchVisitChecks(visitId),
      ]);
      const visit = visits.find((item) => item.id === visitId);
      if (!visit) {
        const problem = createGovernedProblem(
          "VISIT_NOT_IN_STORE_SCOPE",
          "لم يتم إيجاد الزيارة المحددة ضمن المتجر أو نطاق التكليف الحالي.",
          { kind: "not_found", nextAction: "refresh_record" },
        );
        setState({ kind: "error", message: problem.message, problem });
        return;
      }
      setState({ kind: "success", visit, checks, canVerify: visit.status === "complete" });
    } catch (error) {
      const problem = resolveProblem(error);
      setState({ kind: "error", message: problem.message, problem });
    }
  }, [storeId, visitId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  return { state, reload: load };
}
