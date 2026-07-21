import { useCallback, useSyncExternalStore } from "react";
import type { ActivationActorType } from "./identity-client.ts";
import {
  subscribeIdentityState,
  getIdentityState,
  loginIdentity,
  requestOtpIdentity,
  activateIdentity,
  listIdentitySessions,
  revokeIdentitySession,
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
  const requestOtp = useCallback(
    (actorType: ActivationActorType, phone: string) => requestOtpIdentity(actorType, phone),
    [],
  );
  const activate = useCallback(
    (actorType: ActivationActorType, phone: string, code: string) =>
      activateIdentity(actorType, phone, code),
    [],
  );
  const listSessions = useCallback(() => listIdentitySessions(), []);
  const revokeSession = useCallback(
    (sessionId: string) => revokeIdentitySession(sessionId),
    [],
  );
  const logout = useCallback(() => logoutIdentity(), []);
  const changePassword = useCallback(
    (password: string) => changePasswordIdentity(password),
    [],
  );
  const deleteAccount = useCallback(() => deleteAccountIdentity(), []);

  return {
    state,
    login,
    requestOtp,
    activate,
    listSessions,
    revokeSession,
    logout,
    changePassword,
    deleteAccount,
  };
}
