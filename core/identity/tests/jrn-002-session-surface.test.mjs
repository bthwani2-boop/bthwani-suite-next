import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

test("JRN-002 binds actor-specific activation and the full session lifecycle", async () => {
  const [client, store, hook, gate, account] = await Promise.all([
    read("core/identity/clients/identity-client.ts"),
    read("core/identity/clients/identity-session-store.ts"),
    read("core/identity/clients/use-identity-session.ts"),
    read("services/dsh/frontend/shared/session/IdentitySessionGate.tsx"),
    read("services/dsh/frontend/app-client/account/IdentityHubScreen.tsx"),
  ]);

  for (const operation of ["requestOtp", "listSessions", "revokeSession"]) {
    assert.match(client, new RegExp(`\\b${operation}\\b`), `${operation} must exist in the sovereign client`);
    assert.match(hook, new RegExp(`\\b${operation}\\b`), `${operation} must be exposed by the shared hook`);
  }

  assert.match(store, /activateIdentity\(\s*actorType: ActivationActorType,/s);
  assert.match(store, /actorType,\s*phone,\s*code,/s);
  assert.doesNotMatch(store, /actorType:\s*["']field["']/);
  assert.match(gate, /requestOtp\(requiredRole, phone\.trim\(\)\)/);
  assert.match(gate, /activate\(requiredRole, phone\.trim\(\), code\.trim\(\)\)/);
  assert.match(account, /identity\.phoneE164/);
  assert.match(account, /listSessions\(\)/);
  assert.match(account, /revokeSession\(sessionId\)/);
  assert.doesNotMatch(account, /@bthwani\.yemen/);
});

test("JRN-002 keeps HTTP, CORS, OpenAPI, and Workforce actor search aligned", async () => {
  const [server, main, browserCors, contract, workforceClient] = await Promise.all([
    read("core/identity/backend/internal/http/server.go"),
    read("core/identity/backend/cmd/identity-api/main.go"),
    read("core/identity/backend/internal/http/browser_cors.go"),
    read("core/identity/contracts/auth.openapi.yaml"),
    read("core/workforce/backend/internal/identityclient/client.go"),
  ]);

  assert.match(server, /Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS"/);
  assert.match(server, /sendJSON\(w, http\.StatusOK, views\)/);
  assert.doesNotMatch(server, /map\[string\]any\{"actors": views\}/);
  assert.match(main, /BrowserCorsMiddleware/);
  assert.match(browserCors, /CORS_ORIGIN_FORBIDDEN/);
  assert.doesNotMatch(browserCors, /Access-Control-Allow-Methods/);
  assert.match(contract, /\/internal\/actors\/search:/);
  assert.match(contract, /type: array/);
  assert.match(workforceClient, /var result \[\]ActorView/);
});
