import type {
    ActivationActorType,
    ActorIdentity,
    IssueActivationResponse,
    SessionInfo,
} from "./identity-client.ts";
import type { SessionStorageAdapter } from "./identity-session-storage.ts";
export type IdentitySessionState = {
    readonly kind: "unconfigured";
} | {
    readonly kind: "restoring";
} | {
    readonly kind: "signed_out";
} | {
    readonly kind: "authenticating";
} | {
    readonly kind: "authenticated";
    readonly identity: ActorIdentity;
    readonly accessToken: string;
} | {
    readonly kind: "error";
    readonly message: string;
};
export declare function configureIdentitySessionStorage(adapter: SessionStorageAdapter): void;
export declare function configureIdentitySession(baseUrl: string): void;
export declare function getIdentityAccessToken(): string | null;
export declare function getIdentityState(): IdentitySessionState;
export declare function subscribeIdentityState(listener: () => void): () => void;
export declare function loginIdentity(username: string, password: string): Promise<void>;
export declare function requestOtpIdentity(actorType: ActivationActorType, phone: string): Promise<IssueActivationResponse>;
export declare function activateIdentity(actorType: ActivationActorType, phone: string, code: string): Promise<void>;
export declare function listIdentitySessions(): Promise<SessionInfo[]>;
export declare function revokeIdentitySession(sessionId: string): Promise<void>;
export declare function logoutIdentity(): Promise<void>;
export declare function changePasswordIdentity(password: string): Promise<void>;
export declare function deleteAccountIdentity(): Promise<void>;
