"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdentityClient = createIdentityClient;
function createIdentityClient(baseUrl) {
    async function request(path, options) {
        let response;
        try {
            response = await fetch(new URL(path, baseUrl), {
                method: options.method,
                headers: {
                    Accept: "application/json",
                    ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
                    ...(options.token !== undefined ? { Authorization: `Bearer ${options.token}` } : {}),
                },
                ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
                signal: AbortSignal.timeout(8000),
            });
        }
        catch (error) {
            throw {
                kind: "network",
                message: error instanceof Error ? error.message : "identity network error",
            };
        }
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw {
                kind: "http",
                status: response.status,
                code: body.code ?? "IDENTITY_ERROR",
                message: body.message ?? "identity request failed",
            };
        }
        if (response.status === 204) {
            return undefined;
        }
        return response.json();
    }
    return {
        login(body) {
            return request("/auth/login", { method: "POST", body });
        },
        session(accessToken) {
            return request("/auth/session", { method: "GET", token: accessToken });
        },
        refresh(refreshToken) {
            return request("/auth/refresh", { method: "POST", body: { refreshToken } });
        },
        logout(accessToken) {
            return request("/auth/logout", { method: "POST", token: accessToken });
        },
    };
}
//# sourceMappingURL=identity-client.js.map