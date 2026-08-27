import { useCallback, useEffect, useRef, useState } from "react";
import {
  acceptDispatchAssignment,
  classifyDispatchError,
  createGovernedDispatchAssignment,
  declineDispatchAssignment,
  fetchCaptainDispatchAssignments,
  fetchClientOrderTracking,
  fetchOperatorDispatchAssignments,
  submitPoD,
  updateDeliveryStatus,
} from "./dispatch.api";
import { corrId } from "../_kernel/dsh-http-request";
import { useIdentitySession } from "@bthwani/core-identity";
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
  DshDispatchActionState,
  DshDispatchListState,
  DshGovernedCreateAssignmentInput,
  DshSubmitPoDInput,
  DshTrackingState,
} from "./dispatch.types";

export function useCaptainDeliveryController() {
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const commandIds = useRef<Record<string, string>>({});
  const [state, setState] = useState<DshDispatchListState>(dispatchIdleState());
  const [actionState, setActionState] = useState<DshDispatchActionState>(dispatchActionIdleState());

  const commandFor = useCallback((key: string) => {
    const scopedKey = `${actorId ?? "anonymous"}:${key}`;
    const existing = commandIds.current[scopedKey];
    if (existing) return { key: scopedKey, id: existing };
    const id = corrId(`captain-dispatch-${key}`);
    commandIds.current[scopedKey] = id;
    return { key: scopedKey, id };
  }, [actorId]);

  const load = useCallback(async () => {
    setState(beginDispatchLoad());
    try {
      const assignments = await fetchCaptainDispatchAssignments();
      setState(resolveDispatchLoadSuccess(assignments));
    } catch (error) {
      setState(resolveDispatchLoadError(classifyDispatchError(error), "captain"));
    }
  }, []);

  const handleActionError = useCallback(async (
    error: unknown,
    action: "accept" | "decline" | "status" | "pod",
  ) => {
    const classified = classifyDispatchError(error);
    setActionState(resolveDispatchActionError(classified, action));
    if (classified.kind === "conflict" || classified.kind === "not_found") {
      await load();
    }
  }, [load]);

  const accept = useCallback(async (assignmentId: string) => {
    if (!actorId) {
      setActionState(dispatchActionErrorState("جلسة الكابتن غير جاهزة لتنفيذ الإسناد."));
      return;
    }
    const command = commandFor(`accept:${assignmentId}`);
    setActionState(dispatchActionSubmittingState());
    try {
      const assignment = await acceptDispatchAssignment(assignmentId, command.id);
      delete commandIds.current[command.key];
      setActionState(dispatchActionSuccessState(assignment));
      await load();
    } catch (error) {
      await handleActionError(error, "accept");
    }
  }, [actorId, commandFor, handleActionError, load]);

  const decline = useCallback(async (assignmentId: string, reason: string) => {
    if (!actorId) {
      setActionState(dispatchActionErrorState("جلسة الكابتن غير جاهزة لرفض الإسناد."));
      return;
    }
    const command = commandFor(`decline:${assignmentId}:${reason}`);
    setActionState(dispatchActionSubmittingState());
    try {
      const assignment = await declineDispatchAssignment(assignmentId, reason, "captain_declined", command.id);
      delete commandIds.current[command.key];
      setActionState(dispatchActionSuccessState(assignment));
      await load();
    } catch (error) {
      await handleActionError(error, "decline");
    }
  }, [actorId, commandFor, handleActionError, load]);

  const advance = useCallback(async (assignmentId: string, currentStatus: Parameters<typeof nextDeliveryStatus>[0]) => {
    const next = nextDeliveryStatus(currentStatus);
    if (!next) {
      setActionState(dispatchActionErrorState("لا توجد حالة تالية متاحة لهذه المهمة."));
      return;
    }
    if (!actorId) {
      setActionState(dispatchActionErrorState("جلسة الكابتن غير جاهزة لتحديث حالة التوصيل."));
      return;
    }
    const command = commandFor(`status:${assignmentId}:${next}`);
    setActionState(dispatchActionSubmittingState());
    try {
      const current = state.kind === "success"
        ? state.assignments.find((item) => item.id === assignmentId)
        : undefined;
      if (!current || !Number.isInteger(current.version) || current.version < 1) {
        throw new Error("assignment version is unavailable; reload is required");
      }
      const assignment = await updateDeliveryStatus(assignmentId, next, {
        expectedVersion: current.version,
        idempotencyKey: command.id,
      });
      delete commandIds.current[command.key];
      setActionState(dispatchActionSuccessState(assignment));
      await load();
    } catch (error) {
      await handleActionError(error, "status");
    }
  }, [actorId, commandFor, handleActionError, load, state]);

  const submitProof = useCallback(async (assignmentId: string, input: DshSubmitPoDInput) => {
    const validation = resolvePoDValidation(input);
    if (validation) {
      setActionState(validation);
      return;
    }
    if (!actorId) {
      setActionState(dispatchActionErrorState("جلسة الكابتن غير جاهزة لإرسال إثبات التسليم."));
      return;
    }
    const command = commandFor(`pod:${assignmentId}:${JSON.stringify(input)}`);
    setActionState(dispatchActionSubmittingState());
    try {
      const assignment = await submitPoD(assignmentId, input, command.id);
      delete commandIds.current[command.key];
      setActionState(dispatchActionSuccessState(assignment));
      await load();
    } catch (error) {
      await handleActionError(error, "pod");
    }
  }, [actorId, commandFor, handleActionError, load]);

  useEffect(() => { void load(); }, [load]);

  return { state, actionState, reload: load, accept, decline, advance, submitProof };
}

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
