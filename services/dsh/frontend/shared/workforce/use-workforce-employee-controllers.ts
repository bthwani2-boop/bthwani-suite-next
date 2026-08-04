import { useCallback, useEffect, useState } from "react";

import {
  createEmployee,
  getEmployee,
  isSessionExpiredCode,
  listEmployees,
  reactivateEmployee,
  suspendEmployee,
  updateEmployee,
  workforceErrorMessage,
  startProvisioningCase,
  resumeProvisioningCase,
} from "./workforce.api";
import type {
  CreateEmployeeInput,
  Employee,
  EmployeeDetail,
  EngagementStatus,
  UpdateEmployeeInput,
  StartProvisioningInput,
} from "./workforce.types";

export type EmployeeListState =
  | { kind: "loading" }
  | { kind: "error"; message: string; isSessionExpired: boolean }
  | { kind: "ready"; employees: readonly Employee[] };

export function useEmployeeListController(initialStatus?: EngagementStatus) {
  const [status, setStatus] = useState<EngagementStatus | undefined>(initialStatus);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<EmployeeListState>({ kind: "loading" });

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const employees = await listEmployees({ status, q: query.trim() || undefined });
      setState({ kind: "ready", employees });
    } catch (error) {
      setState({
        kind: "error",
        message: workforceErrorMessage(error),
        isSessionExpired: isSessionExpiredCode(error),
      });
    }
  }, [query, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, status, setStatus, query, setQuery, reload };
}

export type EmployeeDetailState =
  | { kind: "loading" }
  | { kind: "error"; message: string; isSessionExpired: boolean }
  | { kind: "ready"; employee: EmployeeDetail };

export function useEmployeeDetailController(actorId: string) {
  const [state, setState] = useState<EmployeeDetailState>({ kind: "loading" });
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", employee: await getEmployee(actorId) });
    } catch (error) {
      setState({
        kind: "error",
        message: workforceErrorMessage(error),
        isSessionExpired: isSessionExpiredCode(error),
      });
    }
  }, [actorId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runAction = useCallback(
    async (action: () => Promise<unknown>) => {
      setActionBusy(true);
      setActionError(null);
      try {
        await action();
        await reload();
        return true;
      } catch (error) {
        setActionError(workforceErrorMessage(error));
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [reload],
  );

  const update = useCallback(
    (input: UpdateEmployeeInput) => runAction(() => updateEmployee(actorId, input)),
    [actorId, runAction],
  );
  const suspend = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => suspendEmployee(actorId, expectedVersion, reason)),
    [actorId, runAction],
  );
  const reactivate = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => reactivateEmployee(actorId, expectedVersion, reason)),
    [actorId, runAction],
  );

  return { state, reload, actionBusy, actionError, update, suspend, reactivate };
}

export type EmployeeCreateState =
  | { kind: "idle" }
  | { kind: "provisioning"; caseId: string; status: string }
  | { kind: "error"; message: string; caseId?: string }
  | { kind: "created"; caseId: string };

export function useEmployeeCreateController() {
  const [state, setState] = useState<EmployeeCreateState>({ kind: "idle" });

  const submit = useCallback(async (input: StartProvisioningInput) => {
    setState({ kind: "provisioning", caseId: "", status: "DRAFT" });
    try {
      const pc = await startProvisioningCase(input);
      if (pc.status === "READY_FOR_ACTIVATION" || pc.status === "COMPLETED") {
        setState({ kind: "created", caseId: pc.id });
      } else if (pc.status.startsWith("FAILED")) {
        setState({ kind: "error", message: pc.failureReason || "Failed", caseId: pc.id });
      } else {
        setState({ kind: "provisioning", caseId: pc.id, status: pc.status });
      }
      return pc;
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error) });
      return null;
    }
  }, []);

  const resume = useCallback(async (caseId: string) => {
    setState({ kind: "provisioning", caseId, status: "RESUMING" });
    try {
      const pc = await resumeProvisioningCase(caseId);
      if (pc.status === "READY_FOR_ACTIVATION" || pc.status === "COMPLETED") {
        setState({ kind: "created", caseId: pc.id });
      } else if (pc.status.startsWith("FAILED")) {
        setState({ kind: "error", message: pc.failureReason || "Failed", caseId: pc.id });
      } else {
        setState({ kind: "provisioning", caseId: pc.id, status: pc.status });
      }
      return pc;
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error), caseId });
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, submit, resume, reset };
}

