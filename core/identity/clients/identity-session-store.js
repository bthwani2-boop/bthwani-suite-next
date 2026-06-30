"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureIdentitySession = configureIdentitySession;
exports.getIdentityAccessToken = getIdentityAccessToken;
exports.getIdentityState = getIdentityState;
exports.subscribeIdentityState = subscribeIdentityState;
exports.loginIdentity = loginIdentity;
exports.logoutIdentity = logoutIdentity;
exports.devBypassLogin = devBypassLogin;
const identity_client_ts_1 = require("./identity-client.js");
let client = null;
let state = { kind: "unconfigured" };
let stored = null;
const listeners = new Set();
const IS_BROWSER = typeof window !== "undefined" && typeof localStorage !== "undefined";
const STORAGE_KEY = "bthwani-identity-session";
function loadStoredSession() {
    if (!IS_BROWSER)
        return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    }
    catch (e) {
        // ignore
    }
    return null;
}
function saveStoredSession(session) {
    if (!IS_BROWSER)
        return;
    try {
        if (session) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }
        else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }
    catch (e) {
        // ignore
    }
}
function configureIdentitySession(baseUrl) {
    if (!baseUrl || client !== null)
        return;
    client = (0, identity_client_ts_1.createIdentityClient)(baseUrl);
    const saved = loadStoredSession();
    if (saved) {
        stored = saved;
        state = {
            kind: "authenticated",
            identity: saved.identity,
            accessToken: saved.accessToken,
        };
    }
    else {
        state = { kind: "signed_out" };
    }
    emit();
}
function getIdentityAccessToken() {
    return stored?.accessToken ?? null;
}
function getIdentityState() {
    return state;
}
function subscribeIdentityState(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
async function loginIdentity(username, password) {
    if (client === null) {
        state = { kind: "error", message: "IDENTITY_NOT_CONFIGURED" };
        emit();
        return;
    }
    state = { kind: "authenticating" };
    emit();
    try {
        const response = await client.login({
            username,
            password,
            deviceFingerprint: "bthwani-runtime-session",
        });
        stored = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            identity: response.identity,
        };
        saveStoredSession(stored);
        state = {
            kind: "authenticated",
            identity: response.identity,
            accessToken: response.accessToken,
        };
    }
    catch (error) {
        const typed = error;
        state = {
            kind: "error",
            message: typed.kind === "http" ? typed.code : "IDENTITY_UNAVAILABLE",
        };
    }
    emit();
}
async function logoutIdentity() {
    const accessToken = stored?.accessToken;
    stored = null;
    saveStoredSession(null);
    state = { kind: "signed_out" };
    emit();
    if (client !== null && accessToken !== undefined) {
        await client.logout(accessToken).catch(() => undefined);
    }
}
function emit() {
    for (const listener of listeners)
        listener();
}
// Dev-only: bypass identity service and auto-authenticate with a fake session.
// Call this in __DEV__ builds when the identity service is not available.
function devBypassLogin(role) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const surface = (role === "operator" ? "control-panel" : `app-${role}`);
    const scope = role === "operator" ? "all" : (role === "client" || role === "partner" ? "own" : "assigned");
    const subject = `${role}-local-001`;
    const fakeIdentity = {
        subject,
        tenantId: "tenant-dev-001",
        roles: [role],
        permissions: [{ service: "dsh", surface: surface, action: "*", scope }],
        authState: "authenticated",
        surfaceAccess: { [surface]: true },
        serviceAccess: { dsh: true },
        sessionId: `dev-session-${Date.now()}`,
        expiresAt,
    };
    stored = {
        accessToken: `dev-bypass-${role}-${Date.now()}`,
        refreshToken: `dev-bypass-refresh-${role}`,
        identity: fakeIdentity,
    };
    saveStoredSession(stored);
    state = { kind: "authenticated", identity: fakeIdentity, accessToken: stored.accessToken };
    emit();
}
//# sourceMappingURL=identity-session-store.js.map