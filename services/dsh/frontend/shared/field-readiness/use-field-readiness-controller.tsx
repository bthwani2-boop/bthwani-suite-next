import { useCallback, useEffect, useState } from "react";
import {
  createFieldVisit, fetchFieldVisits, completeFieldVisit,
  upsertReadinessCheck, fetchVisitChecks,
  createReadinessEscalation, fetchOperatorEscalations, updateEscalation,
  fetchPartnerOnboardingStatus, fetchFieldWorkQueue, classifyFieldReadinessError,
} from "./field-readiness.api";
import {
  visitIdleState, visitLoadingState, visitSuccessState, visitEmptyState, visitErrorState,
  visitActionIdleState, visitActionSubmittingState, visitActionSuccessState, visitActionErrorState,
  checklistIdleState, checklistLoadingState, checklistSuccessState, checklistErrorState,
  checkActionIdleState, checkActionSubmittingState, checkActionSuccessState, checkActionErrorState,
  escalationIdleState, escalationLoadingState, escalationSuccessState, escalationEmptyState, escalationErrorState,
  escalationActionIdleState, escalationActionSubmittingState, escalationActionSuccessState, escalationActionErrorState,
  onboardingStatusIdleState, onboardingStatusLoadingState, onboardingStatusSuccessState, onboardingStatusErrorState,
  workQueueIdleState, workQueueLoadingState, workQueueSuccessState, workQueueErrorState,
} from "./field-readiness.states";
import type {
  DshCreateVisitInput,
  DshUpsertCheckInput,
  DshCreateEscalationInput,
  DshUpdateEscalationInput,
  DshFieldVisit,
  DshReadinessCheck,
} from "./field-readiness.types";

function resolveMessage(err: unknown): string {
  const c = classifyFieldReadinessError(err);
  if (c.kind === "permission_denied") return "غير مصرح لك بهذه العملية";
  if (c.kind === "offline") return "لا يوجد اتصال بالإنترنت";
  if (c.kind === "not_found") return "لم يتم إيجاد السجل";
  return "حدث خطأ، يرجى المحاولة مجدداً";
}

function isAuthenticated(authKind: string) {
  return authKind === "authenticated";
}

export function useFieldVisitController(storeId: string, authKind = "unauthenticated") {
  const [listState, setListState] = useState(visitIdleState());
  const [actionState, setActionState] = useState(visitActionIdleState());

  const load = useCallback(async () => {
    setListState(visitLoadingState());
    try {
      const visits = await fetchFieldVisits(storeId);
      setListState(visits.length === 0 ? visitEmptyState() : visitSuccessState(visits));
    } catch (err) {
      setListState(visitErrorState(resolveMessage(err)));
    }
  }, [storeId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  const startVisit = useCallback(async (input: DshCreateVisitInput) => {
    setActionState(visitActionSubmittingState());
    try {
      const visit = await createFieldVisit(storeId, input);
      setActionState(visitActionSuccessState(visit));
      await load();
    } catch (err) {
      setActionState(visitActionErrorState(resolveMessage(err)));
    }
  }, [storeId, load]);

  const completeVisit = useCallback(async (visitId: string) => {
    setActionState(visitActionSubmittingState());
    try {
      const visit = await completeFieldVisit(visitId);
      setActionState(visitActionSuccessState(visit));
      await load();
    } catch (err) {
      setActionState(visitActionErrorState(resolveMessage(err)));
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
    } catch (err) {
      setChecklistState(checklistErrorState(resolveMessage(err)));
    }
  }, [visitId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  const submitCheck = useCallback(async (input: DshUpsertCheckInput) => {
    setCheckActionState(checkActionSubmittingState());
    try {
      const check = await upsertReadinessCheck(visitId, input);
      setCheckActionState(checkActionSuccessState(check));
      await load();
    } catch (err) {
      setCheckActionState(checkActionErrorState(resolveMessage(err)));
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
    } catch (err) {
      setListState(escalationErrorState(resolveMessage(err)));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated(authKind)) void loadOperatorEscalations();
  }, [authKind, loadOperatorEscalations]);

  const raiseEscalation = useCallback(async (storeId: string, input: DshCreateEscalationInput) => {
    setActionState(escalationActionSubmittingState());
    try {
      const escalation = await createReadinessEscalation(storeId, input);
      setActionState(escalationActionSuccessState(escalation));
    } catch (err) {
      setActionState(escalationActionErrorState(resolveMessage(err)));
    }
  }, []);

  const resolveEscalation = useCallback(async (escalationId: string, input: DshUpdateEscalationInput) => {
    setActionState(escalationActionSubmittingState());
    try {
      const escalation = await updateEscalation(escalationId, input);
      setActionState(escalationActionSuccessState(escalation));
    } catch (err) {
      setActionState(escalationActionErrorState(resolveMessage(err)));
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
    } catch (err) {
      setState(onboardingStatusErrorState(resolveMessage(err)));
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
    } catch (err) {
      setState(workQueueErrorState(resolveMessage(err)));
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
      const canVerify = visit.status === "complete";
      setState({ kind: "success", visit, checks, canVerify });
    } catch (err) {
      setState({ kind: "error", message: resolveMessage(err) });
    }
  }, [storeId, visitId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  return { state, reload: load };
}
