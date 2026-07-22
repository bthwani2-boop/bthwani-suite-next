import { useCallback, useEffect, useState } from "react";
import {
  createGovernedIncident,
  fetchGovernedIncidentEvents,
  fetchGovernedIncidents,
  updateGovernedIncident,
  type DshIncidentEvent,
} from "./incident-governance.api";
import {
  clearSupportMutationAttempt,
  getOrCreateSupportMutationAttempt,
} from "./support-mutation-attempt";
import {
  incidentActionError,
  incidentActionIdle,
  incidentActionSubmitting,
  incidentActionSuccess,
  incidentListEmpty,
  incidentListError,
  incidentListIdle,
  incidentListLoading,
  incidentListSuccess,
} from "./support.states";
import { classifySupportError } from "./support.api";
import type {
  DshCreateIncidentInput,
  DshIncidentStatus,
  DshUpdateIncidentInput,
} from "./support.types";

function resolveIncidentMessage(error: unknown): string {
  const classified = classifySupportError(error);
  if (classified.kind === "permission_denied") return "غير مصرح لك بإدارة الحوادث";
  if (classified.kind === "offline") return "تعذر الاتصال؛ ستُستخدم هوية العملية نفسها عند إعادة المحاولة";
  if (classified.kind === "not_found") return "لم يتم إيجاد الحادث";
  if (classified.kind === "conflict") return "تغيرت حالة الحادث؛ حدّث القائمة ثم أعد المحاولة";
  return "تعذر تنفيذ عملية الحادث";
}

function stableFingerprint(value: unknown): string {
  return JSON.stringify(value);
}

export type IncidentEventState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly events: readonly DshIncidentEvent[] };

export function useGovernedSupportIncidentController(authKind = "unauthenticated") {
  const [listState, setListState] = useState(incidentListIdle());
  const [actionState, setActionState] = useState(incidentActionIdle());
  const [eventState, setEventState] = useState<IncidentEventState>({ kind: "idle" });

  const load = useCallback(async (statusFilter?: DshIncidentStatus) => {
    setListState(incidentListLoading());
    try {
      const incidents = await fetchGovernedIncidents(statusFilter);
      setListState(incidents.length === 0 ? incidentListEmpty() : incidentListSuccess(incidents));
    } catch (error) {
      setListState(incidentListError(resolveIncidentMessage(error)));
    }
  }, []);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);

  const loadEvents = useCallback(async (incidentId: string) => {
    if (!incidentId) {
      setEventState({ kind: "idle" });
      return;
    }
    setEventState({ kind: "loading" });
    try {
      setEventState({ kind: "success", events: await fetchGovernedIncidentEvents(incidentId) });
    } catch (error) {
      setEventState({ kind: "error", message: resolveIncidentMessage(error) });
    }
  }, []);

  const raiseIncident = useCallback(async (input: DshCreateIncidentInput): Promise<boolean> => {
    const fingerprint = stableFingerprint(input);
    const attempt = await getOrCreateSupportMutationAttempt({
      scope: "operator",
      operation: "incident-create",
      fingerprint,
    });
    setActionState(incidentActionSubmitting());
    try {
      const incident = await createGovernedIncident(input, attempt.context);
      await clearSupportMutationAttempt({
        scope: "operator",
        operation: "incident-create",
        fingerprint,
      });
      setActionState(incidentActionSuccess(incident));
      await load();
      return true;
    } catch (error) {
      setActionState(incidentActionError(resolveIncidentMessage(error)));
      return false;
    }
  }, [load]);

  const resolveIncident = useCallback(async (
    incidentId: string,
    input: DshUpdateIncidentInput,
  ): Promise<boolean> => {
    const current = listState.kind === "success"
      ? listState.incidents.find((incident) => incident.id === incidentId)
      : undefined;
    if (!current) {
      setActionState(incidentActionError("حدّث قائمة الحوادث قبل تغيير الحالة"));
      return false;
    }
    const governedInput = { ...input, expectedStatus: current.status };
    const fingerprint = stableFingerprint(governedInput);
    const attempt = await getOrCreateSupportMutationAttempt({
      scope: "operator",
      operation: "incident-transition",
      entityId: incidentId,
      fingerprint,
    });
    setActionState(incidentActionSubmitting());
    try {
      const incident = await updateGovernedIncident(incidentId, governedInput, attempt.context);
      await clearSupportMutationAttempt({
        scope: "operator",
        operation: "incident-transition",
        entityId: incidentId,
        fingerprint,
      });
      setActionState(incidentActionSuccess(incident));
      await Promise.all([load(), loadEvents(incidentId)]);
      return true;
    } catch (error) {
      setActionState(incidentActionError(resolveIncidentMessage(error)));
      return false;
    }
  }, [listState, load, loadEvents]);

  const resetAction = useCallback(() => setActionState(incidentActionIdle()), []);

  return {
    listState,
    actionState,
    eventState,
    reload: load,
    reloadEvents: loadEvents,
    raiseIncident,
    resolveIncident,
    resetAction,
  };
}
