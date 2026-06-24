import { useCallback, useSyncExternalStore } from "react";
import {
  configureIdentitySession,
  getIdentityAccessToken,
  getIdentityState,
  loginIdentity,
  logoutIdentity,
  subscribeIdentityState,
  devBypassLogin,
  type IdentitySessionState,
} from "@bthwani/core-identity";

export {
  configureIdentitySession,
  getIdentityAccessToken,
  getIdentityState,
  devBypassLogin,
  type IdentitySessionState,
};

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
