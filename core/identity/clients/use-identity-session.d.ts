export declare function useIdentitySession(): {
    state: import("./identity-session-store.ts").IdentitySessionState;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};
//# sourceMappingURL=use-identity-session.d.ts.map