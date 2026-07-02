"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIdentitySession = useIdentitySession;
const react_1 = require("react");
const identity_session_store_ts_1 = require("./identity-session-store.js");
function useIdentitySession() {
    const state = (0, react_1.useSyncExternalStore)(identity_session_store_ts_1.subscribeIdentityState, identity_session_store_ts_1.getIdentityState, identity_session_store_ts_1.getIdentityState);
    const login = (0, react_1.useCallback)((username, password) => (0, identity_session_store_ts_1.loginIdentity)(username, password), []);
    const logout = (0, react_1.useCallback)(() => (0, identity_session_store_ts_1.logoutIdentity)(), []);
    return { state, login, logout };
}
//# sourceMappingURL=use-identity-session.js.map