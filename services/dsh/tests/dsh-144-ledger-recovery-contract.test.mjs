import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const recoveryPath = new URL(
  '../../../infra/docker/scripts/recover-dsh-144-checksum.ps1',
  import.meta.url,
);
const invocationPath = new URL(
  '../../../infra/docker/scripts/invoke-runtime-database-migrations.ps1',
  import.meta.url,
);

const recovery = readFileSync(recoveryPath, 'utf8');
const invocation = readFileSync(invocationPath, 'utf8');

const historicalChecksum =
  '382d928f0ac14beae4309786ee9a92b6b947e1e4e1ad4d61d5a02489a7021ed7';
const canonicalChecksum =
  '13947a2eb899a58c72b6875ab8425c6271249127018aa73834e2930d0e26961b';

test('DSH-144 recovery is bounded, audited, and invoked before governed migrations', () => {
  assert.match(recovery, /dsh-144_order_returns_saga\.sql/);
  assert.match(recovery, new RegExp(historicalChecksum));
  assert.match(recovery, new RegExp(canonicalChecksum));
  assert.match(recovery, /schema_migration_recoveries/);
  assert.match(recovery, /FOR UPDATE/);
  assert.match(recovery, /current_success/);
  assert.match(recovery, /current_dirty/);
  assert.match(recovery, /dsh_order_returns/);
  assert.match(recovery, /dsh_order_return_items/);
  assert.match(recovery, /dsh_order_return_actions/);
  assert.match(recovery, /DSH_144_CHECKSUM_RECOVERY_REFUSED/);
  assert.doesNotMatch(recovery, /DELETE\s+FROM\s+public\.schema_migrations/i);

  const recoveryCall = invocation.indexOf('recover-dsh-144-checksum.ps1');
  const governedCall = invocation.indexOf('Invoke-BthwaniGovernedMigrations');
  assert.ok(recoveryCall >= 0, 'runtime migration entry point must invoke the recovery');
  assert.ok(
    governedCall > recoveryCall,
    'bounded recovery must execute before the governed ledger conflict check',
  );
});
