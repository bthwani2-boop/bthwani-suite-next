import { useCallback, useSyncExternalStore } from "react";
import {
  subscribeIdentityState,
  getIdentityState,
  loginIdentity,
  activateIdentity,
  logoutIdentity,
  changePasswordIdentity,
  deleteAccountIdentity,
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

  const changePassword = useCallback(
    (password: string) => changePasswordIdentity(password),
    [],
  );

  const deleteAccount = useCallback(
    () => deleteAccountIdentity(),
    [],
  );

  return { state, login, activate, logout, changePassword, deleteAccount };
}
