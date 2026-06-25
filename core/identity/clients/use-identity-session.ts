import { useCallback, useSyncExternalStore } from "react";
import {
  subscribeIdentityState,
  getIdentityState,
  loginIdentity,
  logoutIdentity,
} from "./identity-session-store.ts";

export function useIdentitySession() {
  const state = useSyncExternalStore(
    subscribeIdentityState,
    getIdentityState,
    getIdentityState,
  );
  const login = useCallback(
    (username: string, password: string) => loginIdentity(username, password),
    [],
  );
  const logout = useCallback(() => logoutIdentity(), []);
  return { state, login, logout };
}
