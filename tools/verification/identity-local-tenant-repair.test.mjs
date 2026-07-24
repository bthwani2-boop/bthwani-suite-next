import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

const main = read("core/identity/backend/cmd/identity-api/main.go");
const repair = read("core/identity/backend/internal/identity/local_tenant_repair.go");
const migration = read("core/identity/database/migrations/identity-007_local_actor_tenant_repair.sql");
const compose = read("infra/docker/compose.runtime.yml");

test("identity repairs persisted local tenant context before serving auth routes", () => {
  const bootstrap = main.indexOf("BootstrapLocalActors");
  const platformBootstrap = main.indexOf("BootstrapLocalPlatformActors");
  const repairCall = main.indexOf("RepairLocalBootstrapTenant");
  const router = main.indexOf("identityhttp.NewRouter");

  assert.ok(bootstrap >= 0, "local actor bootstrap is missing");
  assert.ok(platformBootstrap > bootstrap, "platform bootstrap must follow local actor bootstrap");
  assert.ok(repairCall > platformBootstrap, "tenant repair must follow every local actor bootstrap");
  assert.ok(router > repairCall, "auth routes must not serve before tenant repair completes");
  assert.match(main, /envOr\("BTHWANI_DEFAULT_TENANT_ID", "local-dsh"\)/);
});

test("tenant repair is bounded, authoritative, and persistent", () => {
  assert.match(repair, /if !input\.Enabled/);
  assert.match(repair, /UPDATE identity_actors/);
  assert.match(repair, /SET tenant_id = \$1/);
  assert.match(repair, /tenant_id IS DISTINCT FROM \$1/);
  for (const actorId of [
    "operator-local-001",
    "partner-local-001",
    "field-local-001",
    "captain-local-001",
    "client-local-001",
    "platform-approver-local-001",
    "platform-applier-local-001",
    "platform-rollout-manager-local-001",
  ]) {
    assert.ok(repair.includes(actorId), `repair does not cover ${actorId}`);
  }
});

test("database and compose preserve the same SaaS tenant invariant", () => {
  assert.match(migration, /identity_actors_tenant_nonblank_chk/);
  assert.match(migration, /CHECK \(btrim\(tenant_id\) <> ''\) NOT VALID/);
  assert.match(compose, /BTHWANI_SAAS_MODE: "\$\{BTHWANI_SAAS_MODE:-active\}"/);
  assert.match(compose, /BTHWANI_DEFAULT_TENANT_ID: "\$\{BTHWANI_DEFAULT_TENANT_ID:-local-dsh\}"/);
  assert.match(compose, /identity-api:[\s\S]*<<: \*bthwani-saas-environment/);
  assert.match(compose, /dsh-api:[\s\S]*<<: \*bthwani-saas-environment/);
});
