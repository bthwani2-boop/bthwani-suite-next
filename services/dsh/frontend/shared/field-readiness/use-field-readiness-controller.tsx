import { useCallback, useEffect, useState } from "react";
import {
  buildFieldMutationContext,
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
  classifyFieldReadinessError,
  type FieldMutationContext,
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

function resolveMessage(error: unknown): string {
  const classification = classifyFieldReadinessError(error);
  if (classification.kind === "permission_denied") return "غير مصرح لك بهذه العملية";
  if (classification.kind === "offline") return "لا يوجد اتصال بالإنترنت";
  if (classification.kind === "not_found") return "لم يتم إيجاد السجل";
  return error instanceof Error && error.message ? error.message : "حدث خطأ، يرجى المحاولة مجدداً";
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
  if (classifyFieldReadinessError(error).kind !== "offline") return null;
  return enqueueFieldOperation(
    operationType,
    payload,
    context.idempotencyKey,
    context.correlationId,
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
      setListState(visitErrorState(resolveMessage(error)));
    }
  }, [storeId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  const startVisit = useCallback(async (input: DshCreateVisitInput) => {
    setActionState(visitActionSubmittingState());
    const context = buildFieldMutationContext(
      "create-visit",
      [storeId, input.visitType ?? "onboarding", input.startLocation.capturedAt],
    );
    try {
      const visit = await createFieldVisit(storeId, input, context);
      setActionState(visitActionSuccessState(visit));
      await load();
    } catch (error) {
      try {
        const queued = await enqueueIfOffline(error, "create_visit", { storeId, input }, context);
        if (queued) {
          setActionState(visitActionQueuedState(queued.operationId, "تم حفظ بدء الزيارة للمزامنة عند عودة الاتصال."));
          return;
        }
      } catch (queueError) {
        setActionState(visitActionErrorState(resolveMessage(queueError)));
        return;
      }
      setActionState(visitActionErrorState(resolveMessage(error)));
    }
  }, [storeId, load]);

  const completeVisit = useCallback(async (visitId: string, input: DshCompleteVisitInput) => {
    setActionState(visitActionSubmittingState());
    const context = buildFieldMutationContext("complete-visit", [visitId]);
    try {
      const visit = await completeFieldVisit(visitId, input, context);
      setActionState(visitActionSuccessState(visit));
      await load();
    } catch (error) {
      try {
        const queued = await enqueueIfOffline(error, "complete_visit", { visitId, input }, context);
        if (queued) {
          setActionState(visitActionQueuedState(queued.operationId, "تم حفظ إتمام الزيارة للمزامنة عند عودة الاتصال."));
          return;
        }
      } catch (queueError) {
        setActionState(visitActionErrorState(resolveMessage(queueError)));
        return;
      }
      setActionState(visitActionErrorState(resolveMessage(error)));
    }
  }, [load]);

  const resetAction = useCallback(() => setActionState(visitActionIdleState()), []);

  return { listState, actionState, reload: load, startVisit, completeVisit, resetAction };
}

export function useFieldChecklistController(visitId: string, authKind = "unauthenticated") {
  const [checklistState, setChecklistState] = useState(checklistIdleState());
  const [checkActionState, setCheckActionState] = useState(checkActionIdleState());

  const load = useCallback(async () => {
    setChecklistState(checklistLoadingState());
    try {
      const checks = await fetchVisitChecks(visitId);
      setChecklistState(checklistSuccessState(checks));
    } catch (error) {
      setChecklistState(checklistErrorState(resolveMessage(error)));
    }
  }, [visitId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  const submitCheck = useCallback(async (input: DshUpsertCheckInput) => {
    setCheckActionState(checkActionSubmittingState());
    const context = buildFieldMutationContext(
      "upsert-check",
      [visitId, input.checkType, input.status, input.evidenceUrl ?? "", input.notes ?? ""],
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
          setCheckActionState(checkActionQueuedState(queued.operationId, "تم حفظ نتيجة التحقق للمزامنة عند عودة الاتصال."));
          return true;
        }
      } catch (queueError) {
        setCheckActionState(checkActionErrorState(resolveMessage(queueError)));
        return false;
      }
      setCheckActionState(checkActionErrorState(resolveMessage(error)));
      return false;
    }
  }, [visitId, load]);

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
      setListState(escalationErrorState(resolveMessage(error)));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated(authKind)) void loadOperatorEscalations();
  }, [authKind, loadOperatorEscalations]);

  const raiseEscalation = useCallback(async (storeId: string, input: DshCreateEscalationInput) => {
    setActionState(escalationActionSubmittingState());
    const context = buildFieldMutationContext(
      "create-escalation",
      [storeId, input.visitId ?? "", input.severity, input.category, input.description],
    );
    try {
      const escalation = await createReadinessEscalation(storeId, input, context);
      setActionState(escalationActionSuccessState(escalation));
      return true;
    } catch (error) {
      try {
        const queued = await enqueueIfOffline(error, "create_escalation", { storeId, input }, context);
        if (queued) {
          setActionState(escalationActionQueuedState(queued.operationId, "تم حفظ التصعيد للمزامنة عند عودة الاتصال."));
          return true;
        }
      } catch (queueError) {
        setActionState(escalationActionErrorState(resolveMessage(queueError)));
        return false;
      }
      setActionState(escalationActionErrorState(resolveMessage(error)));
      return false;
    }
  }, []);

  const resolveEscalation = useCallback(async (escalationId: string, input: DshUpdateEscalationInput) => {
    setActionState(escalationActionSubmittingState());
    try {
      const escalation = await updateEscalation(escalationId, input);
      setActionState(escalationActionSuccessState(escalation));
    } catch (error) {
      setActionState(escalationActionErrorState(resolveMessage(error)));
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
      setState(onboardingStatusErrorState(resolveMessage(error)));
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
      setState(workQueueErrorState(resolveMessage(error)));
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
  | { readonly kind: "error"; readonly message: string }
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
        setState({ kind: "error", message: "لم يتم إيجاد الزيارة المحددة" });
        return;
      }
      setState({ kind: "success", visit, checks, canVerify: visit.status === "complete" });
    } catch (error) {
      setState({ kind: "error", message: resolveMessage(error) });
    }
  }, [storeId, visitId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  return { state, reload: load };
}
