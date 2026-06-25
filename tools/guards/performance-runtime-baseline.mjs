// performance-runtime-baseline.mjs
// Validates Phase 13 Performance & Runtime Baseline rules against canonical JSON.
// Node.js — no external dependencies
// Exit 0 = PASS, Exit 1 = FAIL

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARCHITECTURE_PATH = join(ROOT, 'machine-readable', 'architecture-map.json');
const EVIDENCE_ROOT = process.env.BTH_EVIDENCE_ROOT || null;

const errors = [];
const warnings = [];
function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

if (!existsSync(ARCHITECTURE_PATH)) {
  err('CRITICAL: machine-readable/architecture-map.json does not exist');
  console.error('FAIL — missing canonical architecture map');
  process.exit(1);
}

let architecture;
try {
  architecture = JSON.parse(readFileSync(ARCHITECTURE_PATH, 'utf8'));
} catch (error) {
  err(`CRITICAL: invalid architecture-map.json: ${error.message}`);
}

const baseline = architecture?.performance_runtime_baseline;
if (!baseline) {
  err('CRITICAL: architecture-map.json missing performance_runtime_baseline');
}

function requireTrue(value, path) {
  if (value !== true) err(`CRITICAL: ${path} must be true`);
}

function requirePositiveNumber(value, path) {
  if (typeof value !== 'number' || value <= 0) {
    err(`CRITICAL: ${path} must be a positive number`);
  }
}

const targets = baseline?.targets ?? {};
for (const key of [
  'p95_api_reads_ms',
  'p95_api_writes_ms',
  'db_basic_query_ms',
  'cpu_utilization_percent_max',
  'ram_stability_window_minutes',
  'error_rate_percent_max',
]) {
  requirePositiveNumber(targets[key], `performance_runtime_baseline.targets.${key}`);
}

const backend = baseline?.backend_rules ?? {};
for (const key of [
  'independent_runtimes',
  'server_timeouts_required',
  'context_scoped_timeouts_required',
  'health_and_readiness_required',
  'bounded_concurrency_required',
  'rate_limits_required',
]) {
  requireTrue(backend[key], `performance_runtime_baseline.backend_rules.${key}`);
}
const requiredLogFields = ['timestamp', 'level', 'service', 'correlation_id', 'actor_id'];
for (const field of requiredLogFields) {
  if (!backend.structured_log_fields?.includes(field)) {
    err(`CRITICAL: structured_log_fields missing ${field}`);
  }
}

const database = baseline?.database_rules ?? {};
for (const key of [
  'pagination_required_for_lists',
  'strict_default_and_max_limits_required',
  'indexes_required_for_filters_sorts_and_foreign_keys',
  'n_plus_one_forbidden',
  'optimized_read_models_required_for_heavy_reads',
]) {
  requireTrue(database[key], `performance_runtime_baseline.database_rules.${key}`);
}

const providers = baseline?.provider_rules ?? {};
for (const key of [
  'timeouts_required',
  'bounded_retries_required',
  'idempotency_required_for_mutations',
  'circuit_breakers_required',
  'audit_metadata_required',
  'health_checks_required',
  'controlled_failover_required',
]) {
  requireTrue(providers[key], `performance_runtime_baseline.provider_rules.${key}`);
}
if (providers.retry_max_attempts > 3 || providers.retry_max_attempts < 1) {
  err('CRITICAL: provider retry_max_attempts must be between 1 and 3');
}

const operations = baseline?.active_operation_contracts;
if (!Array.isArray(operations) || operations.length === 0) {
  err('CRITICAL: performance_runtime_baseline.active_operation_contracts must not be empty');
}

const operationIds = new Set();
for (const operation of operations ?? []) {
  if (!operation.operation_id || operationIds.has(operation.operation_id)) {
    err(`CRITICAL: duplicate or missing operation_id: ${operation.operation_id ?? '<missing>'}`);
  }
  operationIds.add(operation.operation_id);
  if (!['dsh', 'wlt'].includes(operation.service)) {
    err(`CRITICAL: ${operation.operation_id} has unsupported service ${operation.service}`);
  }
  if (operation.structured_logging !== 'REQUIRED') {
    err(`CRITICAL: ${operation.operation_id} must require structured logging`);
  }
  if (operation.kind === 'list_read') {
    if (!['limit-offset', 'cursor'].includes(operation.pagination)) {
      err(`CRITICAL: ${operation.operation_id} must declare pagination`);
    }
    if (!(operation.default_limit > 0) || !(operation.max_limit >= operation.default_limit)) {
      err(`CRITICAL: ${operation.operation_id} has invalid default/max limits`);
    }
  }
  if (operation.external_provider !== 'NONE') {
    err(`CRITICAL: ${operation.operation_id} activates an unapproved external provider`);
  }
}

if (baseline?.measurement_status !== 'NOT_MEASURED') {
  err('CRITICAL: measurement_status must remain NOT_MEASURED until load-test evidence exists');
}

const counts = {
  active_operations_checked: operations?.length ?? 0,
  list_operations_checked: (operations ?? []).filter((operation) => operation.kind === 'list_read').length,
  external_providers_active: (operations ?? []).filter((operation) => operation.external_provider !== 'NONE').length,
  measurement_status: baseline?.measurement_status ?? 'MISSING',
};

const output = {
  timestamp: new Date().toISOString(),
  guard: 'performance-runtime-baseline',
  result: errors.length === 0 ? 'PASS' : 'FAIL',
  errors,
  warnings,
  counts
};

if (EVIDENCE_ROOT) {
  try {
    mkdirSync(EVIDENCE_ROOT, { recursive: true });
    writeFileSync(join(EVIDENCE_ROOT, 'guard-performance-baseline-output.json'), JSON.stringify(output, null, 2));
    writeFileSync(join(EVIDENCE_ROOT, 'guard-performance-baseline-output.txt'),
      `RESULT: ${output.result}\nErrors: ${errors.length}\nWarnings: ${warnings.length}\n` +
      errors.map(e => `ERROR: ${e}`).join('\n') + '\n' +
      warnings.map(w => `WARN: ${w}`).join('\n')
    );
  } catch(e) {
    console.warn(`Could not write evidence: ${e.message}`);
  }
}

console.log('\n=== GUARD PERFORMANCE BASELINE RESULTS ===');
console.log(JSON.stringify(counts, null, 2));
console.log(`\nErrors: ${errors.length}, Warnings: ${warnings.length}`);

if (errors.length === 0) {
  console.log('\nRESULT: PASS');
  process.exit(0);
} else {
  console.log('\nRESULT: FAIL');
  errors.forEach(e => console.error(`  ERROR: ${e}`));
  warnings.forEach(w => console.warn(`  WARN: ${w}`));
  process.exit(1);
}
