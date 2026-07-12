import { useCallback, useSyncExternalStore } from "react";
import {
  subscribeIdentityState,
  getIdentityState,
  loginIdentity,
  activateIdentity,
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
  const activate = useCallback(
    (phone: string, code: string) => activateIdentity(phone, code),
    [],
  );
  const logout = useCallback(() => logoutIdentity(), []);
  return { state, login, activate, logout };
}
