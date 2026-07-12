import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createFieldAgent,
  getFieldAgent,
  issueFieldAgentActivationCode,
  listFieldAgents,
  listWorkforceCities,
  listWorkforceShifts,
  reactivateFieldAgent,
  revokeFieldAgentActivationCodes,
  suspendFieldAgent,
  updateFieldAgent,
  workforceErrorMessage,
} from "./workforce.api";
import type {
  ActivationCodeResult,
  CreateFieldAgentInput,
  EngagementStatus,
  FieldAgent,
  FieldAgentDetail,
  UpdateFieldAgentInput,
  WorkforceCity,
  WorkforceShift,
} from "./workforce.types";

// Shared controllers consumed by BOTH the HR section and the Partners
// activation tab — one source of truth, no second copy of provider data.

export type WorkforceListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; fieldAgents: readonly FieldAgent[] };

export function useFieldAgentListController(initialStatus?: EngagementStatus) {
  const [status, setStatus] = useState<EngagementStatus | undefined>(initialStatus);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<WorkforceListState>({ kind: "loading" });

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const fieldAgents = await listFieldAgents({ status, q: query.trim() || undefined });
      setState({ kind: "ready", fieldAgents });
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error) });
    }
  }, [status, query]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, status, setStatus, query, setQuery, reload };
}

export type WorkforceDetailState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; agent: FieldAgentDetail };

export function useFieldAgentDetailController(actorId: string) {
  const [state, setState] = useState<WorkforceDetailState>({ kind: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [issuedCode, setIssuedCode] = useState<ActivationCodeResult | null>(null);

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const agent = await getFieldAgent(actorId);
      setState({ kind: "ready", agent });
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error) });
    }
  }, [actorId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runAction = useCallback(
    async (action: () => Promise<unknown>) => {
      setActionError(null);
      setActionBusy(true);
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
    (input: UpdateFieldAgentInput) => runAction(() => updateFieldAgent(actorId, input)),
    [actorId, runAction],
  );
  const suspend = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => suspendFieldAgent(actorId, expectedVersion, reason)),
    [actorId, runAction],
  );
  const reactivate = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => reactivateFieldAgent(actorId, expectedVersion, reason)),
    [actorId, runAction],
  );
  const issueCode = useCallback(
    (expectedVersion: number) =>
      runAction(async () => {
        setIssuedCode(await issueFieldAgentActivationCode(actorId, expectedVersion));
      }),
    [actorId, runAction],
  );
  const revokeCodes = useCallback(
    () =>
      runAction(async () => {
        await revokeFieldAgentActivationCodes(actorId);
        setIssuedCode(null);
      }),
    [actorId, runAction],
  );

  return { state, reload, actionBusy, actionError, issuedCode, update, suspend, reactivate, issueCode, revokeCodes };
}

export type CreateFieldAgentState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "created"; agent: FieldAgent };

export function useFieldAgentCreateController() {
  const [state, setState] = useState<CreateFieldAgentState>({ kind: "idle" });

  const submit = useCallback(async (input: CreateFieldAgentInput) => {
    setState({ kind: "submitting" });
    try {
      const agent = await createFieldAgent(input);
      setState({ kind: "created", agent });
      return agent;
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error) });
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, submit, reset };
}

export type WorkforceReferenceState = {
  readonly loading: boolean;
  readonly error: string | null;
  readonly cities: readonly WorkforceCity[];
  readonly shifts: readonly WorkforceShift[];
};

export function useWorkforceReferenceData(includeInactive = false) {
  const [state, setState] = useState<WorkforceReferenceState>({
    loading: true,
    error: null,
    cities: [],
    shifts: [],
  });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [cities, shifts] = await Promise.all([
        listWorkforceCities(includeInactive),
        listWorkforceShifts(includeInactive),
      ]);
      setState({ loading: false, error: null, cities, shifts });
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: workforceErrorMessage(error) }));
    }
  }, [includeInactive]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const cityLabel = useMemo(() => {
    const byCode = new Map(state.cities.map((city) => [city.code, city.nameAr]));
    return (code?: string) => (code ? byCode.get(code) ?? code : "—");
  }, [state.cities]);

  const shiftLabel = useMemo(() => {
    const byCode = new Map(state.shifts.map((shift) => [shift.code, shift.nameAr]));
    return (code?: string) => (code ? byCode.get(code) ?? code : "—");
  }, [state.shifts]);

  return { ...state, reload, cityLabel, shiftLabel };
}
