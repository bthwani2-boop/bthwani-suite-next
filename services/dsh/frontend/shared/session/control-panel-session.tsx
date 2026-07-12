"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ActorIdentity } from "@bthwani/core-identity";
import {
  fetchControlPanelSession,
  loginControlPanelSession,
  logoutControlPanelSession,
} from "./control-panel-session.api";

export type ControlPanelSessionState =
  | { readonly kind: "restoring" }
  | { readonly kind: "signed_out" }
  | { readonly kind: "authenticating" }
  | { readonly kind: "authenticated"; readonly identity: ActorIdentity }
  | { readonly kind: "error"; readonly code: string };

export type ControlPanelSession = {
  readonly state: ControlPanelSessionState;
  login(username: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
};

const ControlPanelSessionContext = createContext<ControlPanelSession | null>(null);

export function ControlPanelSessionProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<ControlPanelSessionState>({ kind: "restoring" });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchControlPanelSession();
      if (cancelled) return;
      if (result.ok && result.body) {
        setState({ kind: "authenticated", identity: result.body.identity });
      } else {
        setState({ kind: "signed_out" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setState({ kind: "authenticating" });
    const result = await loginControlPanelSession(username, password);
    if (!mounted.current) return false;
    if (result.ok && result.body) {
      setState({ kind: "authenticated", identity: result.body.identity });
      return true;
    }
    setState({ kind: "error", code: result.body?.code ?? "LOGIN_FAILED" });
    return false;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await logoutControlPanelSession().catch(() => undefined);
    if (mounted.current) setState({ kind: "signed_out" });
  }, []);

  const value = useMemo<ControlPanelSession>(
    () => ({ state, login, logout }),
    [state, login, logout],
  );

  return (
    <ControlPanelSessionContext.Provider value={value}>
      {children}
    </ControlPanelSessionContext.Provider>
  );
}

export function useControlPanelSession(): ControlPanelSession {
  const ctx = useContext(ControlPanelSessionContext);
  if (!ctx) {
    throw new Error("useControlPanelSession must be used within ControlPanelSessionProvider");
  }
  return ctx;
}
