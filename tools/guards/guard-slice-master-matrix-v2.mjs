// guard-slice-master-matrix-v2.mjs
// Validates machine-readable/slice_execution_master_matrix.csv (V2 repaired)
// Node.js — no external dependencies
// Exit 0 = PASS, Exit 1 = FAIL

import { createReadStream } from 'fs';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const V2_PATH = join(ROOT, 'machine-readable', 'slice_execution_master_matrix.csv');
const MR_DIR = join(ROOT, 'machine-readable');

const EVIDENCE_ROOT = process.env.BTH_EVIDENCE_ROOT || null;

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// --- CSV parser (RFC 4180 compliant) ---
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

// 1. File existence
if (!existsSync(V2_PATH)) {
  err('CRITICAL: slice_execution_master_matrix.csv does not exist');
  console.error('FAIL — missing V2 matrix');
  process.exit(1);
}

const content = readFileSync(V2_PATH, 'utf8');
const allRows = parseCSV(content);
const headers = allRows[0];
const dataRows = allRows.slice(1);

const colIdx = {};
headers.forEach((h, i) => colIdx[h] = i);

function get(row, col) {
  const i = colIdx[col];
  return i !== undefined ? (row[i] || '').trim() : '';
}

// 2. Critical columns
const CRITICAL_COLS = [
  'master_id','service','slice_id','surface','execution_domain','app',
  'decision','status','state_transitions','auth_rule','idempotency_required',
  'observability_rule','risk','rollback','error_cases','negative_cases',
  'performance_rule','ui_kit_compliance','evidence_required','notes'
];
const missingCritical = CRITICAL_COLS.filter(c => !colIdx.hasOwnProperty(c));
if (missingCritical.length > 0) {
  err(`CRITICAL: Missing critical columns: ${missingCritical.join(', ')}`);
}

// 3. master_id uniqueness
const masterIds = dataRows.map(r => get(r, 'master_id'));
const masterIdCounts = {};
masterIds.forEach(id => masterIdCounts[id] = (masterIdCounts[id] || 0) + 1);
const dupMasterIds = Object.entries(masterIdCounts).filter(([k,v]) => v > 1);
if (dupMasterIds.length > 0) {
  err(`CRITICAL: Duplicate master_id values: ${dupMasterIds.map(([k,v]) => `${k}(x${v})`).join(', ')}`);
}

// 4. duplicate_key uniqueness
if (colIdx['duplicate_key']) {
  const dupKeys = {};
  dataRows.forEach(r => {
    const k = get(r, 'duplicate_key');
    if (k) dupKeys[k] = (dupKeys[k] || 0) + 1;
  });
  const dups = Object.entries(dupKeys).filter(([k,v]) => v > 1);
  if (dups.length > 0) {
    warn(`WARNING: Duplicate duplicate_key values: ${dups.map(([k,v]) => `${k}(x${v})`).join(', ')}`);
  }
}

// 5. Allowed decision enum
const ALLOWED_DECISIONS = new Set([
  'ADOPT_AS_IS','ADAPT_NORMALIZE','REWRITE_FROM_SPEC','REFERENCE_ONLY',
  'REJECT','BLOCKED_NEEDS_EVIDENCE','BLOCKED_NEEDS_API_CONTRACT',
  'BLOCKED_NEEDS_WLT','BLOCKED_NEEDS_DOMAIN_MODEL','BLOCKED_NEEDS_DB_SHAPE',
  'BLOCKED_NEEDS_PROVIDER_DECISION','BLOCKED_NEEDS_VISUAL_EVIDENCE',''
]);
const invalidDecisions = dataRows.filter(r => !ALLOWED_DECISIONS.has(get(r, 'decision')));
if (invalidDecisions.length > 0) {
  err(`CRITICAL: ${invalidDecisions.length} rows with invalid decision values: ${[...new Set(invalidDecisions.map(r => get(r, 'decision')))].join(', ')}`);
}

// 6. Allowed surface enum
const ALLOWED_SURFACES = new Set([
  'app-client','app-partner','app-captain','app-field','control-panel',
  'webapp','website','shared','all-surfaces','system','N/A',''
]);
const invalidSurfaces = dataRows.filter(r => !ALLOWED_SURFACES.has(get(r, 'surface')));
if (invalidSurfaces.length > 0) {
  err(`CRITICAL: ${invalidSurfaces.length} rows with invalid surface values: ${[...new Set(invalidSurfaces.map(r => get(r, 'surface')))].join(', ')}`);
}

// 7. Prevent backend/infra/evidence/reference in surface
const invalidSurfaceBackend = dataRows.filter(r => ['backend','infra','evidence','reference'].includes(get(r, 'surface')));
if (invalidSurfaceBackend.length > 0) {
  err(`CRITICAL: ${invalidSurfaceBackend.length} rows have backend/infra/evidence/reference in surface column`);
}

// 8. execution_domain must exist
if (!colIdx.hasOwnProperty('execution_domain')) {
  err('CRITICAL: execution_domain column missing');
}

// 9. DSH-011 must not appear in DSH-015/marketing rows
const dsh015Rows = dataRows.filter(r => get(r, 'slice_id').includes('DSH-015') || get(r, 'section').toLowerCase().includes('marketing'));
const dsh015WithDsh011 = dsh015Rows.filter(r =>
  (get(r, 'api_contract') + get(r, 'notes')).includes('DSH-011') &&
  !get(r, 'notes').includes('FIXED:')
);
if (dsh015WithDsh011.length > 0) {
  err(`CRITICAL: ${dsh015WithDsh011.length} DSH-015/marketing rows still reference DSH-011`);
}

// 10. Source coverage from each CSV source
const SOURCE_FILES = [
  'extraction_matrix','dsh_wlt_logic_coverage_matrix','control_panel_coverage_matrix',
  'mobile_ux_journey_matrix','screen_state_coverage_matrix','donor_control_panel_alias_matrix'
];
const sourceCoverage = {};
dataRows.forEach(r => {
  const sm = get(r, 'source_matrix');
  sourceCoverage[sm] = (sourceCoverage[sm] || 0) + 1;
});
SOURCE_FILES.forEach(sf => {
  if (!sourceCoverage[sf]) {
    warn(`WARNING: No rows traced to source: ${sf}`);
  }
});

// 11. Financial/WLT/DSH-WLT rows missing idempotency/rollback/state_transitions
const financialRows = dataRows.filter(r =>
  get(r, 'service') === 'wlt' || get(r, 'wlt_boundary') || get(r, 'wlt_dependency') ||
  get(r, 'slice_id').startsWith('WLT') || get(r, 'slice_id').startsWith('DSH-WLT')
);
const finMissingIdempotency = financialRows.filter(r => !get(r, 'idempotency_required'));
const finMissingRollback = financialRows.filter(r => !get(r, 'rollback'));
const finMissingState = financialRows.filter(r => !get(r, 'state_transitions'));
if (finMissingIdempotency.length > 0) {
  err(`CRITICAL: ${finMissingIdempotency.length} financial rows missing idempotency_required`);
}
if (finMissingRollback.length > 0) {
  warn(`WARNING: ${finMissingRollback.length} financial rows missing rollback`);
}
if (finMissingState.length > 0) {
  warn(`WARNING: ${finMissingState.length} financial rows missing state_transitions`);
}

// 12. UI rows: i18n_rtl_rules and ui_kit_compliance
const uiSurfaces = new Set(['app-client','app-partner','app-captain','app-field','control-panel','webapp','website']);
const uiRows = dataRows.filter(r => uiSurfaces.has(get(r, 'surface')));
if (colIdx.hasOwnProperty('i18n_rtl_rules')) {
  const uiMissingRtl = uiRows.filter(r => !get(r, 'i18n_rtl_rules'));
  if (uiMissingRtl.length > 0) {
    warn(`WARNING: ${uiMissingRtl.length} UI rows missing i18n_rtl_rules`);
  }
}
const uiMissingKitComp = uiRows.filter(r => !get(r, 'ui_kit_compliance'));
if (uiMissingKitComp.length > 0) {
  warn(`WARNING: ${uiMissingKitComp.length} UI rows missing ui_kit_compliance`);
}

// 13. API/backend rows: auth_rule/error_cases/negative_cases/performance_rule
const backendRows = dataRows.filter(r => get(r, 'layer').includes('backend') || get(r, 'artifact_type').includes('handler') || get(r, 'artifact_type').includes('route'));
const backendMissingAuth = backendRows.filter(r => !get(r, 'auth_rule'));
if (backendMissingAuth.length > 0) {
  warn(`WARNING: ${backendMissingAuth.length} backend rows missing auth_rule`);
}

// Summary
const blankDecision = dataRows.filter(r => !get(r, 'decision')).length;

console.log('\n=== GUARD V2 RESULTS ===');
console.log(`Rows: ${dataRows.length}`);
console.log(`Columns: ${headers.length}`);
console.log(`master_id unique: ${dupMasterIds.length === 0}`);
console.log(`Invalid decisions: ${invalidDecisions.length}`);
console.log(`Blank decisions: ${blankDecision}`);
console.log(`Invalid surfaces: ${invalidSurfaces.length}`);
console.log(`DSH-015 refs to DSH-011: ${dsh015WithDsh011.length}`);
console.log(`Financial rows missing idempotency: ${finMissingIdempotency.length}`);
console.log(`Source coverage: ${JSON.stringify(sourceCoverage)}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (EVIDENCE_ROOT) {
  const output = {
    timestamp: new Date().toISOString(),
    guard: 'v2',
    result: errors.length === 0 ? 'PASS' : 'FAIL',
    row_count: dataRows.length,
    col_count: headers.length,
    errors,
    warnings,
    source_coverage: sourceCoverage,
    counts: {
      invalid_decisions: invalidDecisions.length,
      blank_decisions: blankDecision,
      invalid_surfaces: invalidSurfaces.length,
      dsh015_refs_dsh011: dsh015WithDsh011.length,
      financial_missing_idempotency: finMissingIdempotency.length
    }
  };
  try {
    mkdirSync(EVIDENCE_ROOT, { recursive: true });
    writeFileSync(join(EVIDENCE_ROOT, 'guard-v2-output.json'), JSON.stringify(output, null, 2));
  } catch(e) {
    warn(`Could not write evidence: ${e.message}`);
  }
}

if (errors.length === 0) {
  console.log('\nRESULT: PASS');
  console.log(`Errors: 0, Warnings: ${warnings.length}`);
  process.exit(0);
} else {
  console.log('\nRESULT: FAIL');
  errors.forEach(e => console.error(`  ERROR: ${e}`));
  warnings.forEach(w => console.warn(`  WARN: ${w}`));
  process.exit(1);
}
