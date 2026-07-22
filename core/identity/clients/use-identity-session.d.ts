import type { ActivationActorType } from "./identity-client.ts";

export type IdentityActivationAction = {
    (phone: string, code: string): Promise<void>;
    (actorType: ActivationActorType, phone: string, code: string): Promise<void>;
};

export declare function configureIdentityActivationActorType(actorType: ActivationActorType): void;
export declare function useIdentitySession(): {
    state: import("./identity-session-store.ts").IdentitySessionState;
    login: (username: string, password: string) => Promise<void>;
    requestOtp: (actorType: ActivationActorType, phone: string) => Promise<import("./identity-client.ts").IssueActivationResponse>;
    activate: IdentityActivationAction;
    listSessions: () => Promise<import("./identity-client.ts").SessionInfo[]>;
    revokeSession: (sessionId: string) => Promise<void>;
    logout: () => Promise<void>;
    changePassword: (password: string) => Promise<void>;
    deleteAccount: () => Promise<void>;
};
