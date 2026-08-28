import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";

import { corrId } from "../_kernel/dsh-http-request";
import { classifyGovernedError, type GovernedProblem } from "../_kernel/governed-problem";
import { fetchWorkforceMe, updateWorkforceMeSelf } from "./workforce-me.api";
import type { WorkforceMeResult } from "./workforce-me.api";
import type { UpdateSelfInput, WorkforceMe } from "./workforce.types";

export type WorkforceProfileState =
  | { kind: "loading" }
  | { kind: "not_provisioned" }
  | { kind: "suspended" }
  | { kind: "error"; message: string; problem: GovernedProblem }
  | { kind: "ready"; me: WorkforceMe };

type WorkforceProfileContextValue = {
  readonly state: WorkforceProfileState;
  readonly reload: () => Promise<void>;
  readonly updateSelf: (input: UpdateSelfInput) => Promise<WorkforceMeResult>;
};

const WorkforceProfileContext = createContext<WorkforceProfileContextValue | null>(null);

function toState(result: WorkforceMeResult): WorkforceProfileState {
  switch (result.kind) {
    case "ok":
      return { kind: "ready", me: result.me };
    case "not_provisioned":
      return { kind: "not_provisioned" };
    case "suspended":
      return { kind: "suspended" };
    case "unauthenticated": {
      const problem = classifyGovernedError({ code: "SESSION_EXPIRED" });
      return { kind: "error", message: problem.message, problem };
    }
    case "error":
      return { kind: "error", message: result.message, problem: result.problem };
  }
}

export function WorkforceProfileProvider({ children }: { children: React.ReactNode }) {
  const identity = useIdentitySession();
  const [state, setState] = useState<WorkforceProfileState>({ kind: "loading" });
  const requestSequence = useRef(0);
  const updateCommandRef = useRef<{ readonly actorId: string; readonly key: string; readonly id: string } | null>(null);

  const identitySessionBinding = identity.state.kind === "authenticated"
    ? [
      identity.state.identity.subject,
      identity.state.identity.sessionId,
      identity.state.identity.sessionSurface,
    ].join(":")
    : null;

  const reload = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setState({ kind: "loading" });
    const result = await fetchWorkforceMe();
    if (sequence === requestSequence.current) setState(toState(result));
  }, []);

  const updateSelf = useCallback(async (input: UpdateSelfInput) => {
    const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
    if (!actorId) return { kind: "unauthenticated" } as const;
    const inputKey = JSON.stringify(input);
    const existing = updateCommandRef.current?.actorId === actorId && updateCommandRef.current.key === inputKey
      ? updateCommandRef.current
      : null;
    const command = existing ?? { actorId, key: inputKey, id: corrId("workforce-profile-update") };
    updateCommandRef.current = command;
    const sequence = ++requestSequence.current;
    const result = await updateWorkforceMeSelf(input, command.id);
    if (sequence === requestSequence.current) setState(toState(result));
    if (result.kind === "ok") updateCommandRef.current = null;
    return result;
  }, [identity.state.kind, identity.state.kind === "authenticated" ? identity.state.identity.subject : null]);

  useEffect(() => {
    if (identity.state.kind === "authenticated") {
      void reload();
      return;
    }
    requestSequence.current += 1;
    setState({ kind: "loading" });
  }, [identity.state.kind, identitySessionBinding, reload]);

  return (
    <WorkforceProfileContext.Provider value={{ state, reload, updateSelf }}>
      {children}
    </WorkforceProfileContext.Provider>
  );
}

export function useWorkforceProfile(): WorkforceProfileContextValue {
  const value = useContext(WorkforceProfileContext);
  if (!value) {
    throw new Error("useWorkforceProfile must be used inside WorkforceProfileProvider");
  }
  return value;
}

export function useWorkforceMeOrNull(): WorkforceMe | null {
  const { state } = useWorkforceProfile();
  return state.kind === "ready" ? state.me : null;
}
