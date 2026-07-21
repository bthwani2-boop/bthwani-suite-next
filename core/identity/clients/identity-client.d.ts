import type { components, paths } from "./generated/identity-api.ts";
export type ActorIdentity = components["schemas"]["ActorIdentity"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type OtpRequest = components["schemas"]["OtpRequest"];
export type IssueActivationResponse = components["schemas"]["IssueActivationResponse"];
export type ActivateRequest = components["schemas"]["ActivateRequest"];
export type ActivationActorType = ActivateRequest["actorType"];
export type SessionInfo = components["schemas"]["SessionInfo"];
export type TokenResponse = paths["/auth/login"]["post"]["responses"]["200"]["content"]["application/json"];
export type IdentityClientError = {
    readonly kind: "http";
    readonly status: number;
    readonly code: string;
    readonly message: string;
} | {
    readonly kind: "network";
    readonly message: string;
};
export type IdentityClient = {
    login(request: LoginRequest): Promise<TokenResponse>;
    requestOtp(request: OtpRequest): Promise<IssueActivationResponse>;
    activate(request: ActivateRequest): Promise<TokenResponse>;
    session(accessToken: string): Promise<ActorIdentity>;
    refresh(refreshToken: string): Promise<TokenResponse>;
    listSessions(accessToken: string): Promise<SessionInfo[]>;
    revokeSession(accessToken: string, sessionId: string): Promise<void>;
    logout(accessToken: string): Promise<void>;
    changePassword(accessToken: string, password: string): Promise<void>;
    deleteAccount(accessToken: string): Promise<void>;
};
export declare function createIdentityClient(baseUrl: string): IdentityClient;
