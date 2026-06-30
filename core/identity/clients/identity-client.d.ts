import type { components, paths } from "./generated/identity-api.ts";
export type ActorIdentity = components["schemas"]["ActorIdentity"];
export type LoginRequest = components["schemas"]["LoginRequest"];
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
    session(accessToken: string): Promise<ActorIdentity>;
    refresh(refreshToken: string): Promise<TokenResponse>;
    logout(accessToken: string): Promise<void>;
};
export declare function createIdentityClient(baseUrl: string): IdentityClient;
//# sourceMappingURL=identity-client.d.ts.map