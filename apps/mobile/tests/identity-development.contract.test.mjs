import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("all mobile apps persist stable Identity installation fingerprints", async () => {
  for (const app of ["app-client", "app-partner", "app-field", "app-captain"]) {
    const source = await read(`apps/${app}/runtime/src/App.tsx`);
    assert.match(source, /configureIdentityDeviceFingerprintProvider/);
    assert.match(source, /SecureStore/);
    assert.match(source, /randomUUID/);
  }
});

test("password login binds sessions to server-owned canonical surfaces", async () => {
  const [repository, server] = await Promise.all([
    read("core/identity/backend/internal/identity/repository.go"),
    read("core/identity/backend/internal/http/server.go"),
  ]);

  assert.match(repository, /resolvePasswordLoginSurface\(actor\)/);
  assert.match(repository, /createSession\(ctx, actor, fingerprint, surface\)/);
  assert.doesNotMatch(repository, /createSession\(ctx, actor, fingerprint, "control-panel"\)/);
  assert.match(server, /LOGIN_SURFACE_FORBIDDEN/);
});

test("quick developer login stays local-only and never bundles privileged secrets", async () => {
  const [gate, sessionAdapter, broker, devData, runtime, reverse, ...apps] = await Promise.all([
    read("services/dsh/frontend/shared/session/IdentitySessionGate.tsx"),
    read("services/dsh/frontend/shared/session/dev-session-broker.adapter.ts"),
    read("tools/dev/local-dev-session-broker.mjs"),
    read("apps/mobile/mobile-dev-data.mjs"),
    read("apps/mobile/start-mobile-runtime.ps1"),
    read("apps/mobile/reverse-all.ps1"),
    read("apps/app-client/runtime/src/App.tsx"),
    read("apps/app-partner/runtime/src/App.tsx"),
    read("apps/app-field/runtime/src/App.tsx"),
    read("apps/app-captain/runtime/src/App.tsx"),
  ]);

  assert.match(gate, /Platform\.OS !== "web"/);
  assert.match(gate, /typeof __DEV__ !== "undefined"/);
  assert.match(gate, /getIdentityDeviceFingerprint/);
  assert.match(gate, /adoptSession/);
  assert.match(gate, /requestDevelopmentSession/);
  assert.doesNotMatch(gate, /127\.0\.0\.1:58100/);

  assert.match(sessionAdapter, /127\.0\.0\.1:58100/);
  assert.match(sessionAdapter, /10\.0\.2\.2:58100/);
  assert.match(sessionAdapter, /isDshDeviceLoopbackBridgeEnabled/);
  assert.match(broker, /HOST = '127\.0\.0\.1'/);
  assert.match(broker, /LOCAL_DEV_SESSION_BROKER_FORBIDDEN_IN_PRODUCTION/);
  assert.match(broker, /MUST_BE_LOOPBACK_FOR_DEV_SESSION_BROKER/);
  assert.match(broker, /issueProviderSession/);
  assert.doesNotMatch(broker, /0\.0\.0\.0/);
  assert.match(runtime, /local-dev-session-broker\.mjs/);
  assert.match(runtime, /58100/);
  assert.match(reverse, /58100/);

  const mobileSource = apps.join("\n");
  assert.doesNotMatch(mobileSource, /IDENTITY_LOCAL_BOOTSTRAP_PASSWORD/);
  assert.doesNotMatch(mobileSource, /LOCAL_ONLY_replace_with_workforce_internal_service_token/);
  assert.doesNotMatch(mobileSource, /123456/);

  const mainStart = devData.indexOf("async function main()");
  assert.ok(mainStart >= 0);
  const main = devData.slice(mainStart);
  const repairBranch = main.indexOf("if (MODE === 'repair')");
  const operatorLogin = main.indexOf("getPasswordToken(LOCAL_ACTORS.operator.username)");
  const readOnlyCheck = main.indexOf("collectReadOnlyReadinessFailures()");
  assert.ok(repairBranch >= 0);
  assert.ok(operatorLogin > repairBranch, "operator login/session creation must stay inside repair mode");
  assert.ok(readOnlyCheck > repairBranch, "check mode must use the non-mutating collector");
});
