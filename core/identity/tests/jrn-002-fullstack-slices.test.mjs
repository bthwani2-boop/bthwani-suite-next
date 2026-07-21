import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const url = (path) => new URL(path, root);
const read = (path) => readFile(url(path), "utf8");
const json = async (path) => JSON.parse(await read(path));

const roleSurface = new Map([
  ["client", "app-client"],
  ["partner", "app-partner"],
  ["captain", "app-captain"],
  ["field", "app-field"],
  ["operator", "control-panel"],
]);

test("FS-01 product truth fixes actors, value, scope, and acceptance", async () => {
  const truth = await read("governance/product-truth/JRN-002_IDENTITY_ACTIVATION_SESSIONS.md");
  for (const marker of ["## المشكلة", "## الهدف", "## الممثلون", "## القيمة التشغيلية", "## معايير القبول", "## خارج النطاق"]) {
    assert.match(truth, new RegExp(marker));
  }
  assert.match(truth, /same commit|نفس commit/i);
  assert.match(truth, /support session|جلسات الدعم/i);
});

test("FS-02 access matrix covers every active authenticated surface and forbids leakage", async () => {
  const matrix = await json("core/identity/contracts/jrn-002-access-matrix.json");
  assert.equal(matrix.owner, "core/identity");
  for (const [role, surface] of roleSurface) {
    assert.ok(matrix.roles[role]);
    assert.deepEqual(matrix.roles[role].requiredSurfaces, [surface]);
  }
  assert.ok(matrix.forbidden.includes("actor.readOtherSessions"));
  assert.ok(matrix.forbidden.includes("activation.crossSurfaceConsume"));
  assert.ok(matrix.excludedSurfaces.website);
});

test("FS-03 state machine keeps terminal activation and session states terminal", async () => {
  const machine = await json("core/identity/contracts/jrn-002-state-machine.json");
  for (const terminal of ["consumed", "revoked", "expired", "locked"]) {
    assert.deepEqual(machine.activationStates[terminal].allowedTransitions, []);
  }
  for (const terminal of ["rotated", "revoked", "expired"]) {
    assert.deepEqual(machine.sessionStates[terminal].allowedTransitions, []);
  }
  assert.ok(machine.negativeInvariants.some((item) => item.includes("own actor")));
});

test("FS-04 declares Identity as the only credential and session truth owner", async () => {
  const boundary = await json("core/identity/contracts/jrn-002-boundary-manifest.json");
  assert.equal(boundary.truthOwner, "core/identity");
  for (const table of ["identity_actors", "identity_sessions", "identity_activation_challenges", "identity_account_deletions_outbox"]) {
    assert.ok(boundary.ownedData.includes(table));
  }
  assert.ok(boundary.forbiddenOwnership.some((item) => item.includes("WLT")));
  assert.ok(boundary.forbiddenOwnership.some((item) => item.includes("UI surfaces")));
});

test("FS-05 database migrations enforce lifecycle, concurrency, and outbox invariants", async () => {
  const governance = await read("core/identity/database/migrations/identity-005_jrn_002_governance.sql");
  const delivery = await read("core/identity/database/migrations/identity-006_deletion_outbox_delivery.sql");
  for (const marker of [
    "identity_actors_roles_nonempty_check",
    "identity_actors_phone_e164_check",
    "identity_sessions_expiry_order_check",
    "identity_activation_attempts_upper_check",
    "identity_activation_consumed_time_check",
    "identity_sessions_actor_active_idx",
  ]) assert.match(governance, new RegExp(marker));
  for (const marker of ["event_key", "next_attempt_at", "attempts", "identity_deletion_outbox_delivery_idx", "identity_deletion_outbox_reconciliation_idx"]) {
    assert.match(delivery, new RegExp(marker));
  }
});

test("FS-06 operation registry matches OpenAPI, routes, and both clients", async () => {
  const registry = await json("core/identity/contracts/jrn-002-operation-registry.json");
  const [openapi, server, client, workforce] = await Promise.all([
    read(registry.openapi),
    read("core/identity/backend/internal/http/server.go"),
    read(registry.client),
    read("core/workforce/backend/internal/identityclient/client.go"),
  ]);
  const workforceMethods = {
    "workforce.provisionActor": "Provision",
    "workforce.searchActors": "SearchActors",
    "workforce.getActor": "Actor",
    "workforce.deactivateActor": "Deactivate",
    "workforce.reactivateActor": "Reactivate",
    "workforce.issueActivation": "IssueActivation",
    "workforce.latestActivation": "LatestActivation",
    "workforce.revokeActivations": "RevokeActivations",
  };
  for (const operation of registry.operations) {
    assert.match(openapi, new RegExp(`operationId:\\s*${operation.operationId}\\b`), operation.operationId);
    assert.ok(openapi.includes(`  ${operation.path}:`) || openapi.includes(`  ${operation.path.replaceAll("{", "{")}:`), operation.path);
    assert.ok(server.includes(`\"${operation.method} ${operation.path}\"`), `${operation.method} ${operation.path}`);
    if (operation.clientMethod.startsWith("workforce.")) {
      assert.match(workforce, new RegExp(`func \\(c \\*Client\\) ${workforceMethods[operation.clientMethod]}\\b`));
    } else {
      assert.match(client, new RegExp(`\\b${operation.clientMethod}\\(`), operation.clientMethod);
    }
  }
});

test("FS-07 backend request governance is in the canonical middleware chain", async () => {
  const [middleware, main] = await Promise.all([
    read("core/identity/backend/internal/http/request_contract.go"),
    read("core/identity/backend/cmd/identity-api/main.go"),
  ]);
  for (const marker of ["X-Correlation-ID", "Cache-Control", "no-store", "X-Content-Type-Options", "UNSUPPORTED_MEDIA_TYPE", "INVALID_IDEMPOTENCY_KEY"]) {
    assert.match(middleware, new RegExp(marker));
  }
  assert.match(main, /RequestContractMiddleware/);
  assert.match(main, /ReadHeaderTimeout:\s*5 \* time\.Second/);
  assert.match(main, /MaxHeaderBytes:\s*32 \* 1024/);
});

test("FS-08 deletion outbox has stable idempotency, retry, and reconciliation", async () => {
  const delivery = await read("core/identity/database/migrations/identity-006_deletion_outbox_delivery.sql");
  assert.match(delivery, /identity\.account\.deleted:/);
  assert.match(delivery, /processed_at IS NULL/);
  assert.match(delivery, /event_key/);
  assert.match(delivery, /next_attempt_at/);
});

test("FS-09 shared brain exposes allowed actions and translated recovery", async () => {
  const [policy, index, gate] = await Promise.all([
    read("core/identity/clients/identity-session-policy.ts"),
    read("core/identity/clients/index.ts"),
    read("services/dsh/frontend/shared/session/IdentitySessionGate.tsx"),
  ]);
  assert.match(index, /identity-session-policy/);
  assert.match(policy, /identitySessionAllowedActions/);
  assert.match(policy, /identityErrorPresentation/);
  assert.match(policy, /IDENTITY_SESSION_INVALID/);
  assert.match(gate, /identityErrorPresentation/);
});

test("FS-10 and FS-12 bind every surface to role, surface, secure storage, and server truth", async () => {
  const registry = await json("core/identity/contracts/jrn-002-surface-registry.json");
  const consistency = await json("core/identity/contracts/jrn-002-consistency-policy.json");
  assert.equal(registry.surfaces.length, 5);
  for (const surface of registry.surfaces) {
    assert.ok(existsSync(url(surface.entry)), surface.entry);
    if (surface.surface !== "control-panel") {
      const entry = await read(surface.entry);
      assert.match(entry, /IdentitySessionGate/);
      assert.ok(entry.includes(`requiredRole=\"${surface.requiredRole}\"`));
      assert.ok(entry.includes(`requiredSurface=\"${surface.requiredSurface}\"`));
      assert.match(entry, /SecureStore/);
    } else {
      const serverBoundary = await read(surface.serverBoundary);
      assert.match(serverBoundary, /identityServerClient/);
      assert.match(serverBoundary, /server-only/i);
    }
  }
  assert.ok(consistency.crossSurfaceInvariants.some((item) => item.includes("No runtime uses demo identity")));
});

test("FS-11 and FS-14 expose Arabic loading, forbidden, error, and weak-network recovery", async () => {
  const [gate, experience] = await Promise.all([
    read("services/dsh/frontend/shared/session/IdentitySessionGate.tsx"),
    json("core/identity/contracts/jrn-002-experience-policy.json"),
  ]);
  for (const marker of ["LoadingState", "PermissionState", "ErrorState", "جاري التحقق من الجلسة", "لا تملك صلاحية الوصول", "طلب رمز التفعيل"]) {
    assert.match(gate, new RegExp(marker));
  }
  assert.equal(experience.direction, "rtl");
  assert.ok(experience.weakNetwork.length >= 4);
  assert.equal(experience.performance.requestBodyLimitBytes, 32768);
});

test("FS-13 security policy and implementation fail closed", async () => {
  const [policy, cors, server, store] = await Promise.all([
    json("core/identity/contracts/jrn-002-security-policy.json"),
    read("core/identity/backend/internal/http/browser_cors.go"),
    read("core/identity/backend/internal/http/server.go"),
    read("core/identity/clients/identity-session-store.ts"),
  ]);
  assert.equal(policy.classification, "HIGH_IMPACT_AUTHENTICATION");
  assert.match(cors, /CORS_ORIGIN_FORBIDDEN/);
  assert.match(server, /subtle\.ConstantTimeCompare/);
  assert.doesNotMatch(store, /actorType:\s*["']field["']/);
  assert.doesNotMatch(store, /passwordHash|codeHash|refreshTokenHash/);
});

test("FS-15 runbook defines SLA, alerts, diagnostics, support, and rollback", async () => {
  const runbook = await read("governance/runbooks/JRN-002_IDENTITY_OPERATIONS.md");
  for (const marker of ["## Service objectives", "## Signals", "## Alerts", "## Diagnostic sequence", "## Support responses", "## Rollback"]) {
    assert.match(runbook, new RegExp(marker));
  }
  assert.match(runbook, /X-Correlation-ID/);
  assert.match(runbook, /event_key/);
});

test("FS-16 leaves one canonical implementation and no stale artifacts", async () => {
  const cleanup = await json("core/identity/contracts/jrn-002-cleanup-registry.json");
  for (const path of cleanup.removedArtifacts) assert.equal(existsSync(url(path)), false, path);
  const [store, account, main] = await Promise.all([
    read(cleanup.canonical.sessionStore),
    read("services/dsh/frontend/app-client/account/IdentityHubScreen.tsx"),
    read("core/identity/backend/cmd/identity-api/main.go"),
  ]);
  assert.doesNotMatch(store, /devBypassLogin/);
  assert.doesNotMatch(account, /@bthwani\.yemen/);
  assert.doesNotMatch(main, /BrowserCorsMiddleware/);
});

test("FS-17 permanent verification owns static, Go, TypeScript, PostgreSQL, and HTTP runtime evidence", async () => {
  const [targeted, runtime] = await Promise.all([
    read(".github/workflows/jrn-001-010-sambassam-verify.yml"),
    read(".github/workflows/jrn-002-identity-runtime.yml"),
  ]);
  assert.match(targeted, /jrn-002-fullstack-slices\.test\.mjs/);
  assert.match(targeted, /pnpm --dir core\/identity typecheck/);
  assert.match(targeted, /go test \.\/internal\/http \.\/internal\/identity/);
  assert.match(runtime, /postgres:16-alpine/);
  assert.match(runtime, /JRN-002_RUNTIME_PASS/);
  assert.match(runtime, /journeys\/jrn-002\/runtime-proof/);
});
