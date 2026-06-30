import { type ActorIdentity } from "./identity-client.ts";
type ActorRole = "client" | "partner" | "captain" | "field" | "operator";
export type IdentitySessionState = {
    readonly kind: "unconfigured";
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
export declare function configureIdentitySession(baseUrl: string): void;
export declare function getIdentityAccessToken(): string | null;
export declare function getIdentityState(): IdentitySessionState;
export declare function subscribeIdentityState(listener: () => void): () => void;
export declare function loginIdentity(username: string, password: string): Promise<void>;
export declare function logoutIdentity(): Promise<void>;
export declare function devBypassLogin(role: ActorRole): void;
export {};
//# sourceMappingURL=identity-session-store.d.ts.map