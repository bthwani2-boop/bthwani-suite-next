import { useCallback, useEffect, useState } from "react";
import {
  classifyDispatchError,
  createGovernedDispatchAssignment,
  fetchClientOrderTracking,
  fetchOperatorDispatchAssignments,
} from "./dispatch.api";
import {
  beginDispatchLoad,
  beginTrackingLoad,
  resolveDispatchActionError,
  resolveDispatchLoadError,
  resolveDispatchLoadSuccess,
  resolveTrackingError,
  resolveTrackingSuccess,
} from "./dispatch.controller-core";
import {
  dispatchActionIdleState,
  dispatchActionSubmittingState,
  dispatchActionSuccessState,
  dispatchIdleState,
  trackingIdleState,
} from "./dispatch.states";
import type {
  DshDispatchActionState,
  DshDispatchListState,
  DshGovernedCreateAssignmentInput,
  DshTrackingState,
} from "./dispatch.types";

export function useOperatorDispatchController() {
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

  const assign = useCallback(async (input: DshGovernedCreateAssignmentInput) => {
    setActionState(dispatchActionSubmittingState());
    try {
      const result = await createGovernedDispatchAssignment(input);
      setActionState(dispatchActionSuccessState(result.assignment));
      await load();
    } catch (error) {
      const classified = classifyDispatchError(error);
      setActionState(resolveDispatchActionError(classified, "assign"));
      if (classified.kind === "conflict" || classified.kind === "not_found") {
        await load();
      }
    }
  }, [load]);

  useEffect(() => { void load(); }, [load]);

  return { state, actionState, reload: load, assign };
}

export function useClientTrackingController(orderId: string) {
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

  useEffect(() => { void load(); }, [load]);

  return { state, reload: load };
}

export type {
  DshDispatchActionState,
  DshDispatchListState,
  DshTrackingState,
};
