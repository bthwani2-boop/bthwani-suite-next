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

export type IdentityActivationAction = {
  (phone: string, code: string): Promise<void>;
  (actorType: ActivationActorType, phone: string, code: string): Promise<void>;
};

let configuredActivationActorType: ActivationActorType | null = null;

export function configureIdentityActivationActorType(actorType: ActivationActorType): void {
  configuredActivationActorType = actorType;
}

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
  const activate = useCallback<IdentityActivationAction>(
    (...args: [string, string] | [ActivationActorType, string, string]) => {
      if (args.length === 2) {
        if (configuredActivationActorType === null) {
          return Promise.reject(new Error("IDENTITY_ACTOR_TYPE_NOT_CONFIGURED"));
        }
        return activateIdentity(configuredActivationActorType, args[0], args[1]);
      }
      return activateIdentity(args[0], args[1], args[2]);
    },
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
