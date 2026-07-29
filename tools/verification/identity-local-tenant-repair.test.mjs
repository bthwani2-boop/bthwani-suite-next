import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

const main = read("core/identity/backend/cmd/identity-api/main.go");
const repository = read("core/identity/backend/internal/identity/repository.go");
const platformBootstrap = read("core/identity/backend/internal/identity/platform_local_bootstrap.go");
const migration = read("core/identity/database/migrations/identity-007_local_actor_tenant_repair.sql");
const compose = read("infra/docker/compose.runtime.yml");

test("identity binds the configured tenant before every local bootstrap write", () => {
  const bootstrapInput = main.indexOf("TenantID: bootstrapTenantID");
  const bootstrap = main.indexOf("BootstrapLocalActors");
  const platform = main.indexOf("BootstrapLocalPlatformActors");
  const leadership = main.indexOf("BootstrapSovereignLeadershipAccess");
  const router = main.indexOf("identityhttp.NewRouter");

  assert.ok(bootstrapInput >= 0, "LocalBootstrap must carry the configured tenant");
  assert.ok(bootstrap > bootstrapInput, "local actor bootstrap must use the bound input");
  assert.ok(platform > bootstrap, "platform bootstrap must follow local actor bootstrap");
  assert.ok(leadership > platform, "leadership bootstrap must follow platform bootstrap");
  assert.ok(router > leadership, "auth routes must not serve before bootstrap completes");
  assert.doesNotMatch(main, /RepairLocalBootstrapTenant/);
});

test("local actor bootstrap writes and refreshes tenant_id directly", () => {
  assert.match(repository, /tenantID := strings\.TrimSpace\(input\.TenantID\)/);
  assert.match(repository, /BTHWANI_DEFAULT_TENANT_ID is required when IDENTITY_LOCAL_BOOTSTRAP=true/);
  assert.match(repository, /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7::jsonb, true, now\(\)\)/);
  assert.match(repository, /tenant_id = EXCLUDED\.tenant_id/);
  assert.doesNotMatch(repository, /VALUES \([^\n]*'local-dsh'/);
});

test("platform bootstrap writes and refreshes tenant_id directly", () => {
  assert.match(platformBootstrap, /tenantID := strings\.TrimSpace\(input\.TenantID\)/);
  assert.match(platformBootstrap, /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7::jsonb, true, NOW\(\)\)/);
  assert.match(platformBootstrap, /tenant_id = EXCLUDED\.tenant_id/);
  assert.doesNotMatch(platformBootstrap, /VALUES \([^\n]*'local-dsh'/);
});

test("database and compose preserve the tenant invariant", () => {
  // Published migration history remains immutable and still protects upgraded
  // databases that may contain historical local bootstrap rows.
  assert.match(migration, /identity_actors_tenant_nonblank_chk/);
  assert.match(migration, /CHECK \(btrim\(tenant_id\) <> ''\) NOT VALID/);
  assert.match(compose, /BTHWANI_SAAS_MODE: "\$\{BTHWANI_SAAS_MODE:-active\}"/);
  assert.match(compose, /BTHWANI_DEFAULT_TENANT_ID: "\$\{BTHWANI_DEFAULT_TENANT_ID:-local-dsh\}"/);
  assert.match(compose, /identity-api:[\s\S]*<<: \*bthwani-saas-environment/);
  assert.match(compose, /dsh-api:[\s\S]*<<: \*bthwani-saas-environment/);
});
