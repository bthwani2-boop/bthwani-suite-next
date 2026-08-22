import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function repositoryPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(repositoryPath(relativePath), "utf8");
}

const retiredAuthorities = [
  "infra/docker/scripts/wlt-migration-probes.ps1",
  "services/wlt/tests/wlt-migration-probes.test.mjs",
  "tools/scripts/test-wlt-migration-ledger.ps1",
  "tools/mobile/repair-wlt-migration-ledger.ps1",
  "tools/mobile/converge-local-runtime-database.ps1",
];

describe("WLT database authority", () => {
  it("does not retain probe or legacy-ledger execution authorities", () => {
    for (const relativePath of retiredAuthorities) {
      assert.equal(
        fs.existsSync(repositoryPath(relativePath)),
        false,
        `retired database authority must stay deleted: ${relativePath}`,
      );
    }
  });

  it("routes WLT migrations through the shared governed runner", () => {
    const runtimeAdapter = read("infra/docker/scripts/invoke-runtime-database-migrations.ps1");
    const governedRunner = read("infra/docker/scripts/schema-migration-runner.ps1");

    assert.match(runtimeAdapter, /schema-migration-runner\.ps1/);
    assert.match(runtimeAdapter, /Invoke-BthwaniGovernedMigrations/);
    assert.match(governedRunner, /Get-BthwaniMigrationManifestEntries/);
    assert.match(governedRunner, /Resolve-BthwaniGovernedMigrationPlan/);
    assert.match(governedRunner, /runtime_schema_migrations_legacy_retired/);
    assert.match(governedRunner, /LEGACY_MIGRATION_LEDGER_CONFLICT/);
  });

  it("keeps WLT-904 as a real forward repair with a live invariant assertion", () => {
    const migration = read(
      "services/wlt/database/migrations/wlt-904_reconciliation_claim_guard_repair.sql",
    );
    const invariant = read("services/wlt/database/tests/payout-destination-invariants.sql");

    assert.match(migration, /CREATE OR REPLACE FUNCTION wlt_reject_duplicate_reconciliation_claim/);
    assert.match(migration, /CREATE TRIGGER wlt_single_reconciliation_claim_trigger/);
    assert.match(migration, /BEFORE UPDATE OF reconciliation_status/);
    assert.match(invariant, /wlt_single_reconciliation_claim_trigger/);
    assert.match(invariant, /NOT tgisinternal/);
  });

  it("declares an empty WLT local seed set explicitly", () => {
    const runtimeSeedAdapter = read("infra/docker/scripts/invoke-runtime-database-seeds.ps1");
    const canonicalSeedRunner = read("tools/scripts/invoke-service-seeds.ps1");

    assert.match(runtimeSeedAdapter, /wlt\s*=\s*@\{/);
    assert.match(runtimeSeedAdapter, /AllowEmptySeedSet\s*=\s*\$true/);
    assert.match(canonicalSeedRunner, /explicit-absent-empty-directory/);
    assert.match(canonicalSeedRunner, /explicit-empty-set/);
  });
});
