import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCaptain,
  createFieldAgent,
  getCaptain,
  getFieldAgent,
  issueCaptainActivationCode,
  issueFieldAgentActivationCode,
  listCaptains,
  listFieldAgents,
  listWorkforceCities,
  listWorkforceShifts,
  reactivateCaptain,
  reactivateFieldAgent,
  revokeCaptainActivationCodes,
  revokeFieldAgentActivationCodes,
  searchSupervisors,
  suspendCaptain,
  suspendFieldAgent,
  updateCaptain,
  updateFieldAgent,
  isSessionExpiredCode,
  workforceErrorMessage,
} from "./workforce.api";
import type {
  ActivationCodeResult,
  Captain,
  CaptainDetail,
  CreateCaptainInput,
  CreateFieldAgentInput,
  EngagementStatus,
  FieldAgent,
  FieldAgentDetail,
  ProviderKind,
  SupervisorCandidate,
  UpdateCaptainInput,
  UpdateFieldAgentInput,
  WorkforceCity,
  WorkforceShift,
} from "./workforce.types";

// Shared controllers consumed by BOTH the HR section and the Partners
// activation tab — one source of truth, no second copy of provider data.

export type WorkforceListState =
  | { kind: "loading" }
  | { kind: "error"; message: string; isSessionExpired: boolean }
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
      setState({ kind: "error", message: workforceErrorMessage(error), isSessionExpired: isSessionExpiredCode(error) });
    }
  }, [status, query]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, status, setStatus, query, setQuery, reload };
}

export type WorkforceDetailState =
  | { kind: "loading" }
  | { kind: "error"; message: string; isSessionExpired: boolean }
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
      setState({ kind: "error", message: workforceErrorMessage(error), isSessionExpired: isSessionExpiredCode(error) });
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

// ---- captains (mirrors the field-agent controllers above) ----

export type CaptainListState =
  | { kind: "loading" }
  | { kind: "error"; message: string; isSessionExpired: boolean }
  | { kind: "ready"; captains: readonly Captain[] };

export function useCaptainListController(initialStatus?: EngagementStatus) {
  const [status, setStatus] = useState<EngagementStatus | undefined>(initialStatus);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<CaptainListState>({ kind: "loading" });

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const captains = await listCaptains({ status, q: query.trim() || undefined });
      setState({ kind: "ready", captains });
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error), isSessionExpired: isSessionExpiredCode(error) });
    }
  }, [status, query]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, status, setStatus, query, setQuery, reload };
}

export type CaptainDetailState =
  | { kind: "loading" }
  | { kind: "error"; message: string; isSessionExpired: boolean }
  | { kind: "ready"; captain: CaptainDetail };

export function useCaptainDetailController(actorId: string) {
  const [state, setState] = useState<CaptainDetailState>({ kind: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [issuedCode, setIssuedCode] = useState<ActivationCodeResult | null>(null);

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const captain = await getCaptain(actorId);
      setState({ kind: "ready", captain });
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error), isSessionExpired: isSessionExpiredCode(error) });
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
    (input: UpdateCaptainInput) => runAction(() => updateCaptain(actorId, input)),
    [actorId, runAction],
  );
  const suspend = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => suspendCaptain(actorId, expectedVersion, reason)),
    [actorId, runAction],
  );
  const reactivate = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => reactivateCaptain(actorId, expectedVersion, reason)),
    [actorId, runAction],
  );
  const issueCode = useCallback(
    (expectedVersion: number) =>
      runAction(async () => {
        setIssuedCode(await issueCaptainActivationCode(actorId, expectedVersion));
      }),
    [actorId, runAction],
  );
  const revokeCodes = useCallback(
    () =>
      runAction(async () => {
        await revokeCaptainActivationCodes(actorId);
        setIssuedCode(null);
      }),
    [actorId, runAction],
  );

  return { state, reload, actionBusy, actionError, issuedCode, update, suspend, reactivate, issueCode, revokeCodes };
}

export type CreateCaptainState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "created"; captain: Captain };

export function useCaptainCreateController() {
  const [state, setState] = useState<CreateCaptainState>({ kind: "idle" });

  const submit = useCallback(async (input: CreateCaptainInput) => {
    setState({ kind: "submitting" });
    try {
      const captain = await createCaptain(input);
      setState({ kind: "created", captain });
      return captain;
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error) });
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, submit, reset };
}

// ---- supervisor picker (search-based, replaces free-text actor-id entry) ----

export function useSupervisorSearchController(kind: ProviderKind) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<readonly SupervisorCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setCandidates([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      searchSupervisors(kind, trimmed)
        .then((result) => {
          if (!cancelled) {
            setCandidates(result);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(workforceErrorMessage(err));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kind, query]);

  return { query, setQuery, candidates, loading, error };
}
