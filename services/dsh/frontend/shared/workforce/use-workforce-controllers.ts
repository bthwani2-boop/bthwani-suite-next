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
import { useIdentitySession } from "@bthwani/core-identity";
import { corrId } from "../_kernel/dsh-http-request";
import { fetchZones } from "../platform/platform-policies.api";
import type { DshZone } from "../platform/platform-policies.types";
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

function useWorkforceMutationCommands(targetActorId: string) {
  const identity = useIdentitySession();
  const operatorActorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const commandIds = useMemo(() => new Map<string, string>(), [operatorActorId, targetActorId]);
  const commandFor = useCallback((action: "update" | "suspend" | "reactivate", expectedVersion: number, reason: string) => {
    if (!operatorActorId) throw new Error("جلسة لوحة التحكم غير جاهزة لتنفيذ تغيير حالة الملف.");
    const key = `${operatorActorId}:${targetActorId}:${action}:${expectedVersion}:${reason.trim()}`;
    const existing = commandIds.get(key);
    if (existing) return { key, id: existing };
    const id = corrId(`workforce-${action}`);
    commandIds.set(key, id);
    return { key, id };
  }, [commandIds, operatorActorId, targetActorId]);
  return { commandFor, commandIds };
}

export type WorkforceListState =
  | { kind: "loading" }
  | { kind: "error"; message: string; isSessionExpired: boolean }
  | { kind: "ready"; fieldAgents: readonly FieldAgent[] };

export function useFieldAgentListController(initialStatus?: EngagementStatus, options?: { enabled?: boolean }) {
  const [status, setStatus] = useState<EngagementStatus | undefined>(initialStatus);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<WorkforceListState>({ kind: "loading" });

  const reload = useCallback(async () => {
    if (options?.enabled === false) return;
    setState({ kind: "loading" });
    try {
      const fieldAgents = await listFieldAgents({ ...(status ? { status } : {}), ...(query.trim() ? { q: query.trim() } : {}) });
      setState({ kind: "ready", fieldAgents });
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error), isSessionExpired: isSessionExpiredCode(error) });
    }
  }, [status, query, options?.enabled]);

  useEffect(() => {
    if (options?.enabled !== false) {
      void reload();
    }
  }, [reload, options?.enabled]);

  return { state, status, setStatus, query, setQuery, reload };
}

export type WorkforceDetailState =
  | { kind: "loading" }
  | { kind: "error"; message: string; isSessionExpired: boolean }
  | { kind: "ready"; agent: FieldAgentDetail };

export function useFieldAgentDetailController(actorId: string) {
  const mutationCommands = useWorkforceMutationCommands(actorId);
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
    (input: UpdateFieldAgentInput) => runAction(() => {
      const command = mutationCommands.commandFor("update", 0, JSON.stringify(input));
      return updateFieldAgent(actorId, input, command.id).then((result) => {
        mutationCommands.commandIds.delete(command.key);
        return result;
      });
    }),
    [actorId, mutationCommands, runAction],
  );
  const suspend = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => {
      const command = mutationCommands.commandFor("suspend", expectedVersion, reason);
      return suspendFieldAgent(actorId, expectedVersion, reason, command.id).then((result) => {
        mutationCommands.commandIds.delete(command.key);
        return result;
      });
    }),
    [actorId, mutationCommands, runAction],
  );
  const reactivate = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => {
      const command = mutationCommands.commandFor("reactivate", expectedVersion, reason);
      return reactivateFieldAgent(actorId, expectedVersion, reason, command.id).then((result) => {
        mutationCommands.commandIds.delete(command.key);
        return result;
      });
    }),
    [actorId, mutationCommands, runAction],
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

export function useCaptainListController(initialStatus?: EngagementStatus, options?: { enabled?: boolean }) {
  const [status, setStatus] = useState<EngagementStatus | undefined>(initialStatus);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<CaptainListState>({ kind: "loading" });

  const reload = useCallback(async () => {
    if (options?.enabled === false) return;
    setState({ kind: "loading" });
    try {
      const captains = await listCaptains({ ...(status ? { status } : {}), ...(query.trim() ? { q: query.trim() } : {}) });
      setState({ kind: "ready", captains });
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error), isSessionExpired: isSessionExpiredCode(error) });
    }
  }, [status, query, options?.enabled]);

  useEffect(() => {
    if (options?.enabled !== false) {
      void reload();
    }
  }, [reload, options?.enabled]);

  return { state, status, setStatus, query, setQuery, reload };
}

export type CaptainDetailState =
  | { kind: "loading" }
  | { kind: "error"; message: string; isSessionExpired: boolean }
  | { kind: "ready"; captain: CaptainDetail };

export function useCaptainDetailController(actorId: string) {
  const mutationCommands = useWorkforceMutationCommands(actorId);
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
    (input: UpdateCaptainInput) => runAction(() => {
      const command = mutationCommands.commandFor("update", 0, JSON.stringify(input));
      return updateCaptain(actorId, input, command.id).then((result) => {
        mutationCommands.commandIds.delete(command.key);
        return result;
      });
    }),
    [actorId, mutationCommands, runAction],
  );
  const suspend = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => {
      const command = mutationCommands.commandFor("suspend", expectedVersion, reason);
      return suspendCaptain(actorId, expectedVersion, reason, command.id).then((result) => {
        mutationCommands.commandIds.delete(command.key);
        return result;
      });
    }),
    [actorId, mutationCommands, runAction],
  );
  const reactivate = useCallback(
    (expectedVersion: number, reason: string) => runAction(() => {
      const command = mutationCommands.commandFor("reactivate", expectedVersion, reason);
      return reactivateCaptain(actorId, expectedVersion, reason, command.id).then((result) => {
        mutationCommands.commandIds.delete(command.key);
        return result;
      });
    }),
    [actorId, mutationCommands, runAction],
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

export type ServiceZoneReferenceState = {
  readonly loading: boolean;
  readonly error: string | null;
  readonly zones: readonly DshZone[];
};

export function useServiceZoneReference() {
  const [state, setState] = useState<ServiceZoneReferenceState>({
    loading: true,
    error: null,
    zones: [],
  });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { zones } = await fetchZones(true);
      setState({ loading: false, error: null, zones: zones ?? [] });
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: workforceErrorMessage(error) }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const zoneLabel = useMemo(() => {
    const byId = new Map((state.zones || []).map((z) => [z.id, z.name]));
    return (id?: string) => (id ? byId.get(id) ?? id : "—");
  }, [state.zones]);

  return { ...state, reload, zoneLabel };
}

export function useProviderActivationController(providerKind: "field" | "captain", actorId: string) {
  const mutationCommands = useWorkforceMutationCommands(actorId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<FieldAgentDetail | null>(null);
  const [issuedCode, setIssuedCode] = useState<ActivationCodeResult | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = providerKind === "captain" ? await getCaptain(actorId) : await getFieldAgent(actorId);
      setDetail(data);
    } catch (err) {
      setError(workforceErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [providerKind, actorId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    setActionBusy(true);
    try {
      await action();
      await reload();
      return true;
    } catch (err) {
      setActionError(workforceErrorMessage(err));
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const issueCode = async () => {
    if (!detail) return;
    setIssuedCode(null);
    await runAction(async () => {
      const res = providerKind === "captain"
        ? await issueCaptainActivationCode(actorId, detail.version)
        : await issueFieldAgentActivationCode(actorId, detail.version);
      setIssuedCode(res);
    });
  };

  const revokeCode = async () => {
    setIssuedCode(null);
    await runAction(async () => {
      if (providerKind === "captain") {
        await revokeCaptainActivationCodes(actorId);
      } else {
        await revokeFieldAgentActivationCodes(actorId);
      }
    });
  };

    const suspend = async (reason: string): Promise<boolean> => {
    if (!detail) return false;
    return runAction(async () => {
      const command = mutationCommands.commandFor("suspend", detail.version, reason);
      if (providerKind === "captain") {
        await suspendCaptain(actorId, detail.version, reason, command.id);
      } else {
        await suspendFieldAgent(actorId, detail.version, reason, command.id);
      }
      mutationCommands.commandIds.delete(command.key);
    });
  };
  const reactivate = async (reason: string): Promise<boolean> => {
    if (!detail) return false;
    return runAction(async () => {
      const command = mutationCommands.commandFor("reactivate", detail.version, reason);
      if (providerKind === "captain") {
        await reactivateCaptain(actorId, detail.version, reason, command.id);
      } else {
        await reactivateFieldAgent(actorId, detail.version, reason, command.id);
      }
      mutationCommands.commandIds.delete(command.key);
    });
  };

  return {
    loading,
    error,
    detail,
    issuedCode,
    actionBusy,
    actionError,
    issueCode,
    revokeCode,
    suspend,
    reactivate,
    reload,
    clearIssuedCode: () => setIssuedCode(null),
  };
}
