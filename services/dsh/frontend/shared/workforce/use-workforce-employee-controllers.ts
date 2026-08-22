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
} from "./workforce.api";
import type {
  CreateEmployeeInput,
  Employee,
  EmployeeDetail,
  EngagementStatus,
  UpdateEmployeeInput,
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
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "created"; employee: Employee };

export function useEmployeeCreateController() {
  const [state, setState] = useState<EmployeeCreateState>({ kind: "idle" });

  const submit = useCallback(async (input: CreateEmployeeInput) => {
    setState({ kind: "submitting" });
    try {
      const employee = await createEmployee(input);
      setState({ kind: "created", employee });
      return employee;
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error) });
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, submit, reset };
}
