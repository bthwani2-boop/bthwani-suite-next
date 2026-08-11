import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const runnerPath = new URL(
  '../../../infra/docker/scripts/invoke-runtime-database-migrations.ps1',
  import.meta.url,
);
const rebuildPath = new URL(
  '../../../infra/docker/scripts/rebuild-runtime-service-database.ps1',
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
const rebuild = readFileSync(rebuildPath, 'utf8');
const compose = readFileSync(composePath, 'utf8');
const runtimeEnv = readFileSync(runtimeEnvPath, 'utf8');

test('local migration drift recovery rebuilds one governed service database', () => {
  assert.equal(existsSync(legacyRecoveryPath), false, 'one-off DSH-144 recovery must be removed');
  assert.match(runner, /rebuild-runtime-service-database\.ps1/);

  // Recovery permission is an explicit switch passed by the bootstrap-dev phase.
  // It used to be inferred from the pnpm lifecycle-event environment variable,
  // which any process hop silently dropped and which also authorized the five
  // app start scripts to rebuild a database.
  assert.match(runner, /\[switch\]\$AllowLocalLedgerRecovery/);
  assert.match(runner, /if \(\$AllowLocalLedgerRecovery\) \{ return \$true \}/);
  assert.doesNotMatch(runner, /npm_lifecycle_event/);

  // The recoverable conflict codes are enumerated once, beside the SQL that
  // raises them, so the classifier cannot drift away from the authority.
  const migrationAuthority = readFileSync(migrationAuthorityPath, 'utf8');
  assert.match(migrationAuthority, /GOVERNED_MIGRATION_LEDGER_CONFLICT/);
  assert.match(migrationAuthority, /BthwaniRecoverableLedgerConflictCodes/);

  assert.doesNotMatch(runner, /recover-dsh-144-checksum/);
  assert.doesNotMatch(runner, /UPDATE\s+(?:public\.)?schema_migrations/i);
  assert.doesNotMatch(runner, /DELETE\s+FROM\s+(?:public\.)?schema_migrations/i);

  for (const service of ['identity', 'workforce', 'dsh', 'wlt', 'providers', 'platform-control']) {
    assert.match(rebuild, new RegExp(`"${service.replace('-', '\\-')}"`));
  }
  assert.match(rebuild, /DROP DATABASE IF EXISTS/);
  assert.match(rebuild, /CREATE DATABASE/);
  assert.match(rebuild, /CREATE EXTENSION IF NOT EXISTS/);
  assert.match(rebuild, /Service database rebuild is forbidden in production/);
  assert.match(rebuild, /AllowLocalDevelopmentRebuild/);
  assert.doesNotMatch(rebuild, /UPDATE\s+(?:public\.)?schema_migrations/i);
  assert.doesNotMatch(rebuild, /DELETE\s+FROM\s+(?:public\.)?schema_migrations/i);
});

test('runtime PostgreSQL authority defaults to the governed PostGIS image', () => {
  assert.match(compose, /postgis\/postgis:16-3\.4-alpine/);
  assert.match(runtimeEnv, /^BTHWANI_POSTGRES_IMAGE=postgis\/postgis:16-3\.4-alpine$/m);
});
