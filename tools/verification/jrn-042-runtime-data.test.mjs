import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import Ajv from 'ajv';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));

const truthPath = 'governance/product/contracts/jrn-042-runtime-data-migrations-backup.product-truth.json';
const catalogPath = 'infra/data-plane/jrn-042-runtime-governance.json';
const composePath = 'infra/docker/compose.runtime.yml';
const observabilityPath = 'infra/docker/compose.observability.yml';
const commandPath = 'tools/scripts/run-jrn-042-runtime-data.ps1';
const expected = [
  ['identity', 'identity-api', 'identity_runtime', 'identity_runtime', 58082, '/identity/health', '/identity/readiness'],
  ['workforce', 'workforce-api', 'workforce_runtime', 'workforce_runtime', 58086, '/workforce/health', '/workforce/readiness'],
  ['dsh', 'dsh-api', 'dsh_runtime', 'dsh_runtime', 58080, '/dsh/health', '/dsh/readiness'],
  ['wlt', 'wlt-api', 'wlt_runtime', 'wlt_runtime', 58083, '/wlt/health', '/wlt/readiness'],
  ['providers', 'providers-api', 'providers_runtime', 'providers_runtime', 58087, '/providers/health', '/providers/readiness'],
  ['platform-control', 'platform-control-api', 'platform_control_runtime', 'platform_control_runtime', 58088, '/platform/health', '/platform/readiness'],
];

test('product truth validates', () => {
  const validate = new Ajv({ allErrors: true, strict: false }).compile(json('governance/product/product-truth.schema.json'));
  const truth = json(truthPath);
  assert.equal(validate(truth), true, JSON.stringify(validate.errors, null, 2));
  assert.equal(truth.capabilityId, 'JRN_042_RUNTIME_DATA_MIGRATIONS_BACKUP');
  assert.equal(truth.acceptance.runtimeEvidenceRequired, true);
  assert.equal(truth.acceptance.visualEvidenceRequired, false);
});

test('catalog declares six isolated services', () => {
  const catalog = json(catalogPath);
  assert.equal(catalog.services.length, 6);
  for (const key of ['id', 'database', 'owner', 'hostPort']) {
    assert.equal(new Set(catalog.services.map((service) => service[key])).size, 6, `${key} must be unique`);
  }
  for (const [id, composeService, database, owner, port, health, readiness] of expected) {
    const service = catalog.services.find((item) => item.id === id);
    assert.ok(service, `missing ${id}`);
    assert.deepEqual(
      [service.composeService, service.database, service.owner, service.hostPort, service.healthPath, service.readinessPath],
      [composeService, database, owner, port, health, readiness],
    );
    const migrations = path.join(root, service.migrationDirectory);
    assert.ok(fs.existsSync(migrations), `missing migration directory for ${id}`);
    assert.ok(fs.readdirSync(migrations).some((name) => name.endsWith('.sql')), `no migrations for ${id}`);
  }
});

test('compose uses loopback, persistence and isolated DSNs', () => {
  const compose = read(composePath);
  assert.match(compose, /127\.0\.0\.1:\$\{BTHWANI_POSTGRES_PORT:-55432\}:5432/);
  assert.match(compose, /bthwani-postgres-runtime-data:\/var\/lib\/postgresql\/data/);
  assert.match(compose, /^  mongo:\s*"forbidden"\s*$/m);
  assert.doesNotMatch(compose, /^  mongo:\s*$/m);
  assert.doesNotMatch(compose, /^  mongodb:\s*$/m);
  for (const [, service, database, owner, port] of expected) {
    assert.match(compose, new RegExp(`\\n  ${service}:`));
    assert.match(compose, new RegExp(`127\\.0\\.0\\.1:\\$\\{[^}]+:-${port}\\}`));
    assert.match(compose, new RegExp(`postgres:\\/\\/\\$\\{[^}]+:-${owner}\\}:\\$\\{[^}]+\\}@postgres:5432\\/\\$\\{[^}]+:-${database}\\}`));
  }
});

test('Providers readiness is database-backed and fail closed', () => {
  const server = read('core/providers/backend/internal/http/server.go');
  const readinessTest = read('core/providers/backend/internal/http/readiness_test.go');
  assert.match(server, /GET \/providers\/readiness/);
  assert.match(server, /PingContext\(r\.Context\(\)\)/);
  assert.match(server, /StatusServiceUnavailable/);
  assert.match(server, /database_unavailable/);
  assert.match(readinessTest, /expected readiness to fail closed with 503/);
});

test('migrations are ordered, checksummed, locked and fail closed', () => {
  const invocation = read('infra/docker/scripts/invoke-runtime-database-migrations.ps1');
  const runner = read('infra/docker/scripts/schema-migration-runner.ps1');
  for (const [id] of expected) assert.match(invocation, new RegExp(`"${id}"`));
  assert.match(invocation, /Sort-Object Name/);
  for (const token of ['checksum_sha256', 'source_commit_sha', 'pg_advisory_lock', 'DIRTY_MIGRATION_STATE', 'MIGRATION_CHECKSUM_MISMATCH', 'UNTRACKED_LEGACY_SCHEMA']) {
    assert.ok(runner.includes(token), `migration runner misses ${token}`);
  }
});

test('outbox packages retain retry and terminal failure semantics', () => {
  const catalog = json(catalogPath);
  const workers = [...catalog.asynchronousDelivery.dshWorkers, ...catalog.asynchronousDelivery.wltWorkers];
  assert.ok(workers.length >= 6);
  for (const worker of workers) {
    assert.ok(fs.existsSync(path.join(root, worker)), `missing ${worker}`);
    const directory = path.dirname(path.join(root, worker));
    const source = fs.readdirSync(directory).filter((name) => name.endsWith('.go')).map((name) => fs.readFileSync(path.join(directory, name), 'utf8')).join('\n');
    assert.match(source, /(retry|attempt|backoff|next[_A-Z]?retry|next[_A-Z]?attempt)/i, `no bounded retry in ${worker}`);
    assert.match(source, /(failed|dead.?letter|exhaust|last[_A-Z]?error)/i, `no terminal failure in ${worker}`);
  }
  const identity = read(catalog.asynchronousDelivery.identityOutboxMigration);
  assert.match(identity, /outbox/i);
  assert.match(identity, /(attempt|retry)/i);
  assert.match(identity, /(failed|last_error)/i);
});

test('backup and restore cover six databases, MinIO, checksums and explicit force', () => {
  const catalog = json(catalogPath);
  const backup = read(catalog.backupRestore.backupCommand);
  const restore = read(catalog.backupRestore.restoreCommand);
  const verify = read(catalog.backupRestore.integrityCommand);
  const roundTrip = read(catalog.backupRestore.roundTripCommand);
  assert.equal(catalog.backupRestore.requiredDatabases, 6);
  assert.equal(catalog.backupRestore.minioRequired, true);
  for (const [, , database, owner] of expected) {
    for (const source of [backup, restore, verify, roundTrip]) assert.ok(source.includes(database), `${database} omitted from DR`);
    assert.ok(backup.includes(owner));
    assert.ok(restore.includes(owner));
  }
  assert.match(backup, /ConsistencyMode/);
  assert.match(backup, /Get-FileHash[\s\S]*SHA256/);
  assert.match(restore, /SupportsShouldProcess/);
  assert.match(restore, /\[switch\]\$Force/);
  assert.match(restore, /RequireQuiesced/);
  assert.match(roundTrip, /Quiesced six-database and MinIO backup\/restore round trip: PASS/);
});

test('closure command binds same-commit evidence and gates destructive DR', () => {
  const command = read(commandPath);
  for (const token of ['exact immutable commit SHA', 'Services.Count -ne 6', 'SourceCommitSha $ResolvedCommitSha', 'schema_migrations', "table_name LIKE '%outbox%'", 'Full mode requires -ForceDisasterRecovery', 'test-runtime-backup-restore.ps1', 'LiveLike posture refused']) {
    assert.ok(command.includes(token), `closure command misses ${token}`);
  }
  assert.match(command, /health = Wait-ProvidersHealth/);
  assert.match(command, /readiness = Wait-JsonStatus/);
  assert.doesNotMatch(command, /down[\s\S]{0,80}-v/);
});

test('observability is pinned, loopback bound and bounded', () => {
  const observability = read(observabilityPath);
  assert.doesNotMatch(observability, /image:\s*[^\n]+:latest\s*$/m);
  assert.match(observability, /jaegertracing\/all-in-one:1\.62\.0/);
  assert.match(observability, /127\.0\.0\.1:\$\{BTHWANI_JAEGER_UI_PORT:-16686\}:16686/);
  assert.match(observability, /127\.0\.0\.1:\$\{BTHWANI_OTLP_GRPC_PORT:-4317\}:4317/);
  assert.match(observability, /bthwani-runtime/);
  assert.match(observability, /mem_limit:/);
  assert.match(observability, /max-size:/);
});

test('registry retains JRN-042 scope and FS-01 through FS-18', () => {
  const registry = read('governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md');
  const start = registry.indexOf('### JRN-042');
  const end = registry.indexOf('### JRN-043', start);
  assert.ok(start >= 0 && end > start);
  const section = registry.slice(start, end).toLowerCase();
  for (const phrase of ['health/readiness', 'postgresql', 'migrations', 'outbox', 'dead-letter', 'backup', 'restore', 'monitoring', 'secrets', 'rollback']) {
    assert.ok(section.includes(phrase), `JRN-042 misses ${phrase}`);
  }
  for (let index = 1; index <= 18; index += 1) assert.ok(registry.includes(`FS-${String(index).padStart(2, '0')}`));
});
