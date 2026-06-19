// performance-runtime-baseline.mjs
// Validates Phase 13 Performance & Runtime Baseline rules against the V3 matrix
// Node.js — no external dependencies
// Exit 0 = PASS, Exit 1 = FAIL

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const V3_PATH = join(ROOT, 'machine-readable', 'slice_execution_master_matrix_v3.csv');
const EVIDENCE_ROOT = process.env.BTH_EVIDENCE_ROOT || null;

const errors = [];
const warnings = [];
function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

if (!existsSync(V3_PATH)) {
  err('CRITICAL: slice_execution_master_matrix_v3.csv does not exist');
  console.error('FAIL — missing V3 matrix');
  process.exit(1);
}

// RFC 4180 compliant CSV parser
function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let inQuotes = false, field = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        row.push(field); field = '';
      } else {
        field += ch;
      }
    }
    row.push(field);
    result.push(row);
  }
  return result;
}

const content = readFileSync(V3_PATH, 'utf8');
const allRows = parseCSV(content);
const headers = allRows[0];
const dataRows = allRows.slice(1);

const colIdx = {};
headers.forEach((h, i) => colIdx[h.replace(/"/g, '')] = i);

function get(row, col) {
  const i = colIdx[col];
  return i !== undefined ? (row[i] || '').replace(/^"|"$/g, '').trim() : '';
}

let checkedListCount = 0;
let checkedProviderCount = 0;
let checkedMutationCount = 0;
let checkedBackendCount = 0;

for (const row of dataRows) {
  const id = get(row, 'master_v3_id');
  const service = get(row, 'service');
  const layer = get(row, 'layer');
  const artifactType = get(row, 'artifact_type');
  const op = get(row, 'operation').toLowerCase();
  const cap = get(row, 'capability').toLowerCase();
  const perf = get(row, 'performance_rule');
  const obs = get(row, 'observability_rule');
  const db = get(row, 'db_objects');
  const ext = get(row, 'external_dependencies');
  const idxReq = get(row, 'idempotency_required');
  const status = get(row, 'status');
  const decision = get(row, 'decision');
  const notes = get(row, 'notes').toLowerCase();

  const isBlocked = status.startsWith('BLOCKED_') || decision.startsWith('BLOCKED_') || status === 'RESERVED_INVENTORY';
  const isNA = perf.startsWith('N/A') || perf === 'not-applicable' || status === 'REJECTED';

  if (isNA) continue;

  // 1. Validate List Operations
  const isListOp = /\blist\b/.test(op) || op.includes('query') || op.includes('get /dsh/stores') || op.includes('get /wlt/refunds') || op.includes('get /wlt/settlements') || /\blist\b/.test(cap) || cap.includes('read model') || cap.includes('read-model');
  const isReadLayer = layer.includes('backend') || layer.includes('logic') || layer.includes('database') || layer.includes('domain');

  if (isListOp && isReadLayer) {
    checkedListCount++;
    const lowerPerf = perf.toLowerCase();
    
    // Check pagination & limits (except if blocked/pending contract)
    if (!isBlocked) {
      const hasPagination = lowerPerf.includes('pagination') || lowerPerf.includes('cursor') || lowerPerf.includes('offset') || lowerPerf.includes('page');
      const hasLimit = lowerPerf.includes('limit') || lowerPerf.includes('page size') || lowerPerf.includes('max');
      
      if (!hasPagination) {
        err(`ROW ${id} (${service}): List operation '${op}' must specify pagination in performance_rule. Got: '${perf}'`);
      }
      if (!hasLimit) {
        err(`ROW ${id} (${service}): List operation '${op}' must specify default/strict limits in performance_rule. Got: '${perf}'`);
      }
    }

    // Check indexes for database reads
    if (db && db !== 'N/A' && !db.includes('not-applicable') && !isBlocked) {
      const hasIndex = lowerPerf.includes('index') || lowerPerf.includes('indexed') || db.includes('index');
      if (!hasIndex) {
        warn(`ROW ${id} (${service}): Read operation accessing '${db}' should specify index/indexing in performance_rule.`);
      }
    }

    // Check read models for heavy queries (settlement, ledger, catalogs)
    const isHeavy = cap.includes('settlement') || cap.includes('ledger') || cap.includes('catalog') || cap.includes('history');
    if (isHeavy && !isBlocked) {
      const hasReadModel = lowerPerf.includes('read model') || lowerPerf.includes('read-model') || lowerPerf.includes('view') || lowerPerf.includes('materialized') || lowerPerf.includes('summary') || lowerPerf.includes('lookup');
      if (!hasReadModel) {
        warn(`ROW ${id} (${service}): Heavy list capability '${cap}' should utilize a read-model or optimized view.`);
      }
    }
  }

  // 2. Validate External Dependencies & Providers
  const hasExtDep = ext && ext !== 'N/A' && !ext.includes('not-applicable') && ext !== 'N/A_POLICY_CANONICAL';
  if (hasExtDep && !isBlocked) {
    checkedProviderCount++;
    const lowerPerf = perf.toLowerCase();
    const lowerNotes = notes.toLowerCase();
    const lowerRollback = get(row, 'rollback_compensation_rule').toLowerCase();

    const hasTimeout = lowerPerf.includes('timeout') || lowerNotes.includes('timeout') || lowerRollback.includes('timeout');
    const hasCircuitBreaker = lowerPerf.includes('circuit') || lowerNotes.includes('circuit') || lowerRollback.includes('circuit') || lowerPerf.includes('failover') || lowerNotes.includes('failover');
    const hasRetry = lowerPerf.includes('retry') || lowerNotes.includes('retry') || lowerRollback.includes('retry') || lowerPerf.includes('backoff') || lowerNotes.includes('backoff');

    if (!hasTimeout) {
      err(`ROW ${id} (${service}): External dependency '${ext}' must specify timeouts. Got: '${perf}'`);
    }
    if (!hasRetry && !hasCircuitBreaker) {
      warn(`ROW ${id} (${service}): External dependency '${ext}' should specify retries or circuit breakers.`);
    }
  }

  // 3. Validate Mutating/Write Operations (Idempotency and Rollback)
  const isMutation = op.includes('create') || op.includes('update') || op.includes('delete') || op.includes('post') || op.includes('put') || op.includes('patch') || op.includes('cancel') || op.includes('settle') || op.includes('payout');
  if (isMutation && isReadLayer && !isBlocked) {
    checkedMutationCount++;
    const lowerIdx = idxReq.toLowerCase();
    
    // Check idempotency for critical services
    if (service === 'wlt' || service === 'dsh') {
      const hasIdempotency = lowerIdx.includes('true') || lowerIdx.includes('idempotent') || lowerIdx.includes('idempotency') || lowerIdx === 'yes';
      if (!hasIdempotency) {
        err(`ROW ${id} (${service}): Mutating operation '${op}' must require idempotency (idempotency_required).`);
      }
    }
  }

  // 4. Validate Structured Logs & Observability
  if (isReadLayer && !isBlocked) {
    checkedBackendCount++;
    const lowerObs = obs.toLowerCase();
    const hasLogs = lowerObs.includes('log') || lowerObs.includes('structured') || lowerObs.includes('json') || lowerObs.includes('trace') || lowerObs.includes('emit') || lowerObs.includes('alert');
    if (!hasLogs) {
      warn(`ROW ${id} (${service}): Backend layer row should specify structured logging/observability rules.`);
    }
  }
}

const counts = {
  total_rows: dataRows.length,
  list_operations_checked: checkedListCount,
  external_providers_checked: checkedProviderCount,
  mutations_checked: checkedMutationCount,
  backend_rows_checked: checkedBackendCount
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
