import { useCallback, useEffect, useState } from "react";
import {
  acceptDispatchAssignment,
  classifyDispatchError,
  createDispatchAssignment,
  declineDispatchAssignment,
  fetchCaptainDispatchAssignments,
  fetchClientOrderTracking,
  fetchOperatorDispatchAssignments,
  submitPoD,
  updateDeliveryStatus,
} from "./dispatch.api";
import {
  beginDispatchLoad,
  beginTrackingLoad,
  nextDeliveryStatus,
  resolveDispatchActionError,
  resolveDispatchLoadError,
  resolveDispatchLoadSuccess,
  resolvePoDValidation,
  resolveTrackingError,
  resolveTrackingSuccess,
} from "./dispatch.controller-core";
import {
  dispatchActionErrorState,
  dispatchActionIdleState,
  dispatchActionSubmittingState,
  dispatchActionSuccessState,
  dispatchIdleState,
  trackingIdleState,
} from "./dispatch.states";
import type {
  DshCreateAssignmentInput,
  DshDispatchActionState,
  DshDispatchListState,
  DshSubmitPoDInput,
  DshTrackingState,
} from "./dispatch.types";

function useCaptainDeliveryController() {
  const [state, setState] = useState<DshDispatchListState>(dispatchIdleState());
  const [actionState, setActionState] = useState<DshDispatchActionState>(dispatchActionIdleState());

  const load = useCallback(async () => {
    setState(beginDispatchLoad());
    try {
      const assignments = await fetchCaptainDispatchAssignments();
      setState(resolveDispatchLoadSuccess(assignments));
    } catch (error) {
      setState(resolveDispatchLoadError(classifyDispatchError(error), "captain"));
    }
  }, []);

  const accept = useCallback(async (assignmentId: string) => {
    setActionState(dispatchActionSubmittingState());
    try {
      const assignment = await acceptDispatchAssignment(assignmentId);
      setActionState(dispatchActionSuccessState(assignment));
      await load();
    } catch (error) {
      setActionState(resolveDispatchActionError(classifyDispatchError(error), "accept"));
    }
  }, [load]);

  const decline = useCallback(async (assignmentId: string, reason: string) => {
    setActionState(dispatchActionSubmittingState());
    try {
      const assignment = await declineDispatchAssignment(assignmentId, reason);
      setActionState(dispatchActionSuccessState(assignment));
      await load();
    } catch (error) {
      setActionState(resolveDispatchActionError(classifyDispatchError(error), "decline"));
    }
  }, [load]);

  const advance = useCallback(async (assignmentId: string, currentStatus: Parameters<typeof nextDeliveryStatus>[0]) => {
    const next = nextDeliveryStatus(currentStatus);
    if (!next) {
      setActionState(dispatchActionErrorState("لا توجد حالة تالية متاحة لهذه المهمة."));
      return;
    }
    setActionState(dispatchActionSubmittingState());
    try {
      const assignment = await updateDeliveryStatus(assignmentId, next);
      setActionState(dispatchActionSuccessState(assignment));
      await load();
    } catch (error) {
      setActionState(resolveDispatchActionError(classifyDispatchError(error), "status"));
    }
  }, [load]);

  const submitProof = useCallback(async (assignmentId: string, input: DshSubmitPoDInput) => {
    const validation = resolvePoDValidation(input);
    if (validation) {
      setActionState(validation);
      return;
    }
    setActionState(dispatchActionSubmittingState());
    try {
      const assignment = await submitPoD(assignmentId, input);
      setActionState(dispatchActionSuccessState(assignment));
      await load();
    } catch (error) {
      setActionState(resolveDispatchActionError(classifyDispatchError(error), "pod"));
    }
  }, [load]);

  useEffect(() => { load(); }, [load]);

  return { state, actionState, reload: load, accept, decline, advance, submitProof };
}

function useOperatorDispatchController() {
  const [state, setState] = useState<DshDispatchListState>(dispatchIdleState());
  const [actionState, setActionState] = useState<DshDispatchActionState>(dispatchActionIdleState());

  const load = useCallback(async () => {
    setState(beginDispatchLoad());
    try {
      const assignments = await fetchOperatorDispatchAssignments();
      setState(resolveDispatchLoadSuccess(assignments));
    } catch (error) {
      setState(resolveDispatchLoadError(classifyDispatchError(error), "operator"));
    }
  }, []);

  const assign = useCallback(async (input: DshCreateAssignmentInput) => {
    setActionState(dispatchActionSubmittingState());
    try {
      const assignment = await createDispatchAssignment(input);
      setActionState(dispatchActionSuccessState(assignment));
      await load();
    } catch (error) {
      setActionState(resolveDispatchActionError(classifyDispatchError(error), "assign"));
    }
  }, [load]);

  useEffect(() => { load(); }, [load]);

  return { state, actionState, reload: load, assign };
}

function useClientTrackingController(orderId: string) {
  const [state, setState] = useState<DshTrackingState>(trackingIdleState());

  const load = useCallback(async () => {
    if (!orderId.trim()) {
      setState(resolveTrackingError({ kind: "not_found" }));
      return;
    }
    setState(beginTrackingLoad());
    try {
      const assignment = await fetchClientOrderTracking(orderId);
      setState(resolveTrackingSuccess(assignment));
    } catch (error) {
      setState(resolveTrackingError(classifyDispatchError(error)));
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  return { state, reload: load };
}

export type {
  DshDispatchActionState,
  DshDispatchListState,
  DshTrackingState,
};
