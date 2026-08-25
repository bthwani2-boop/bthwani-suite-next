import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const runnerPath = new URL(
  '../../../infra/docker/scripts/invoke-runtime-database-migrations.ps1',
  import.meta.url,
);
const resetPath = new URL(
  '../../../infra/docker/scripts/reset-runtime-service-database.ps1',
  import.meta.url,
);
const obsoleteRebuildPath = new URL(
  '../../../infra/docker/scripts/rebuild-runtime-service-database.ps1',
  import.meta.url,
);
const runtimePath = new URL(
  '../../../infra/docker/scripts/runtime.ps1',
  import.meta.url,
);
const legacyRecoveryPath = new URL(
  '../../../infra/docker/scripts/recover-dsh-144-checksum.ps1',
  import.meta.url,
);
const migrationAuthorityPath = new URL(
  '../../../infra/docker/scripts/schema-migration-runner.ps1',
  import.meta.url,
);
const composePath = new URL('../../../infra/docker/compose.runtime.yml', import.meta.url);
const runtimeEnvPath = new URL(
  '../../../infra/docker/env/runtime.env.example',
  import.meta.url,
);

const runner = readFileSync(runnerPath, 'utf8');
const reset = readFileSync(resetPath, 'utf8');
const runtime = readFileSync(runtimePath, 'utf8');
const compose = readFileSync(composePath, 'utf8');
const runtimeEnv = readFileSync(runtimeEnvPath, 'utf8');

test('local migration drift recovery has one canonical runtime owner and keeps the API fail-closed until convergence', () => {
  assert.equal(existsSync(legacyRecoveryPath), false, 'one-off DSH-144 recovery must be removed');
  assert.equal(existsSync(obsoleteRebuildPath), false, 'obsolete self-restarting rebuild authority must be removed');
  assert.match(runner, /reset-runtime-service-database\.ps1/);
  assert.doesNotMatch(runner, /rebuild-runtime-service-database\.ps1/);
  assert.match(runner, /\[switch\]\$AllowLocalLedgerRecovery/);
  assert.match(runner, /return \[bool\]\$AllowLocalLedgerRecovery/);
  assert.doesNotMatch(runner, /npm_lifecycle_event/);
  assert.doesNotMatch(runner, /BTHWANI_ALLOW_LOCAL_DATABASE_REBUILD/);
  assert.match(runtime, /GovernedMigrationScript -Service \$serviceName -SourceCommitSha \$sourceCommitSha -AllowLocalLedgerRecovery/);
  assert.doesNotMatch(runtime, /Invoke-CanonicalLocalDatabaseRecovery/);

  const migrationAuthority = readFileSync(migrationAuthorityPath, 'utf8');
  assert.match(migrationAuthority, /GOVERNED_MIGRATION_LEDGER_CONFLICT/);
  assert.match(migrationAuthority, /BthwaniRecoverableLedgerConflictCodes/);

  assert.doesNotMatch(runner, /recover-dsh-144-checksum/);
  assert.doesNotMatch(runner, /UPDATE\s+(?:public\.)?schema_migrations/i);
  assert.doesNotMatch(runner, /DELETE\s+FROM\s+(?:public\.)?schema_migrations/i);

  for (const service of ['identity', 'workforce', 'dsh', 'wlt', 'providers', 'platform-control']) {
    assert.match(reset, new RegExp(`"${service.replace('-', '\\-')}"`));
  }
  assert.match(reset, /DROP DATABASE IF EXISTS/);
  assert.match(reset, /CREATE DATABASE/);
  assert.match(reset, /CREATE EXTENSION IF NOT EXISTS/);
  assert.match(reset, /Service database reset is forbidden in production/);
  assert.match(reset, /AllowLocalDevelopmentReset/);
  assert.match(reset, /-Action service-stop/);
  assert.doesNotMatch(reset, /-Action service-up/);
  assert.match(reset, /api_restart=DEFERRED_TO_CANONICAL_RUNTIME/);
  assert.doesNotMatch(reset, /UPDATE\s+(?:public\.)?schema_migrations/i);
  assert.doesNotMatch(reset, /DELETE\s+FROM\s+(?:public\.)?schema_migrations/i);

  const resetIndex = runner.indexOf('& $ResetScript');
  const replayIndex = runner.indexOf('Invoke-GovernedMigrationPass', resetIndex);
  assert.ok(resetIndex >= 0 && replayIndex > resetIndex, 'canonical migrations must replay after reset');
  assert.doesNotMatch(runtime, /DROP DATABASE IF EXISTS/);
  assert.doesNotMatch(runtime, /CREATE DATABASE/);
  assert.doesNotMatch(runtime, /CREATE EXTENSION IF NOT EXISTS/);
  assert.doesNotMatch(runtime, /AllowLocalDevelopmentRebuild/);
});

test('runtime PostgreSQL authority defaults to the governed PostGIS image', () => {
  assert.match(compose, /postgis\/postgis:16-3\.4-alpine/);
  assert.match(runtimeEnv, /^BTHWANI_POSTGRES_IMAGE=postgis\/postgis:16-3\.4-alpine$/m);
});
