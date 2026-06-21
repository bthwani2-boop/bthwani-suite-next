// guard-slice-master-matrix-v3.mjs
// Validates machine-readable/slice_execution_master_matrix_v3.csv
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

const EXACT_HEADER = 'master_v3_id,master_id,slice_id,slice_order,service,section,surface,consumer_surfaces,app,actor,capability,journey_id,page_id,screen_id,logic_id,source_matrix,source_record_ids,source_path,target_path,route_path,target_anchor,fragment_id,layer,artifact_type,operation,domain_rule,business_domain_rules,db_state_lifecycle,dispatch_policy,pricing_policy,finance_policy,notification_triggers,integration_infrastructure,external_dependencies,ui_localization_rules,build_target,rbac_tenant_rule,audit_privacy_rule,rollback_compensation_rule,policy_parameters,policy_owner,provider_decision,api_contract,db_objects,auth_rule,wlt_boundary,wlt_dependency,idempotency_required,state_transitions,error_cases,negative_cases,performance_rule,observability_rule,ui_kit_compliance,visual_reference,evidence_required,decision,status,blocker_code,next_action,acceptance_gate,verification_command,risk,rollback,duplicate_key,notes';

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
      } else { field += ch; }
    }
    row.push(field);
    result.push(row);
  }
  return result;
}

// 1. File existence
if (!existsSync(V3_PATH)) {
  err('CRITICAL: slice_execution_master_matrix_v3.csv does not exist');
  console.error('FAIL — missing V3 matrix');
  process.exit(1);
}

const content = readFileSync(V3_PATH, 'utf8');
const allRows = parseCSV(content);
const rawHeader = allRows[0].join(',');
const headers = allRows[0];
const dataRows = allRows.slice(1);

// 2. Exact header match
const cleanHeader = rawHeader.replace(/"/g, '');
if (cleanHeader !== EXACT_HEADER) {
  err(`CRITICAL: V3 header does not match exact specification`);
  console.error(`Expected: ${EXACT_HEADER}`);
  console.error(`Actual:   ${cleanHeader}`);
}

const colIdx = {};
headers.forEach((h, i) => colIdx[h.replace(/"/g,'')] = i);
function get(row, col) {
  const i = colIdx[col];
  return i !== undefined ? (row[i] || '').replace(/^"|"$/g,'').trim() : '';
}

// 3. Row count >= 1150
if (dataRows.length < 1150) {
  err(`CRITICAL: V3 row count ${dataRows.length} < 1150 required`);
} else {
  console.log(`Row count: ${dataRows.length} ✓`);
}

// 4. master_v3_id uniqueness
const v3Ids = dataRows.map(r => get(r, 'master_v3_id'));
const v3IdCounts = {};
v3Ids.forEach(id => v3IdCounts[id] = (v3IdCounts[id] || 0) + 1);
const dupV3Ids = Object.entries(v3IdCounts).filter(([k,v]) => v > 1);
if (dupV3Ids.length > 0) {
  err(`CRITICAL: Duplicate master_v3_id: ${dupV3Ids.map(([k,v]) => `${k}(x${v})`).join(', ')}`);
}

// 5. VERIFIED is allowed only for the evidence-backed DSH-001 executable rows.
const readyRows = dataRows.filter(r => get(r, 'status') === 'READY_FOR_SLICE');
if (readyRows.length > 0) {
  err(`CRITICAL: ${readyRows.length} rows have forbidden READY_FOR_SLICE status`);
}
const verifiedRows = dataRows.filter(r => get(r, 'status') === 'VERIFIED');
const invalidVerifiedRows = verifiedRows.filter(r => get(r, 'slice_id') !== 'DSH-001');
if (invalidVerifiedRows.length > 0) {
  err(`CRITICAL: ${invalidVerifiedRows.length} VERIFIED rows are outside DSH-001`);
}
const dsh001BlockedRows = dataRows.filter(r =>
  get(r, 'slice_id') === 'DSH-001' && get(r, 'status').startsWith('BLOCKED_')
);
if (dsh001BlockedRows.length > 0) {
  err(`CRITICAL: ${dsh001BlockedRows.length} DSH-001 rows remain blocked`);
}
if (verifiedRows.length > 0) {
  const evidencePath = join(ROOT, 'services', 'dsh', 'evidence', 'DSH-001-store-discovery', 'screenshot-app-client-store-discovery.png');
  if (!existsSync(evidencePath)) {
    err('CRITICAL: DSH-001 VERIFIED rows require runtime and visual evidence');
  }
}

// 6. Canonical DSH order lifecycle (section-based + sentinel artifact_type check)
const dshOrderStates = dataRows.filter(r => get(r, 'section') === 'order-state-machine');
if (dshOrderStates.length < 10) {
  err(`CRITICAL: Canonical DSH order lifecycle missing — only ${dshOrderStates.length} state rows (need >= 10)`);
} else {
  console.log(`DSH order lifecycle: ${dshOrderStates.length} states ✓`);
}
const dshCanonicalSentinel = dataRows.filter(r =>
  get(r, 'artifact_type') === 'canonical-state-machine' && get(r, 'capability') === 'order-state-machine'
);
if (dshCanonicalSentinel.length < 1) {
  err(`CRITICAL: No canonical-state-machine sentinel row for DSH order lifecycle (artifact_type=canonical-state-machine, capability=order-state-machine)`);
} else {
  console.log(`DSH canonical-state-machine sentinel: ${dshCanonicalSentinel.length} ✓`);
}

// 7. Canonical WLT financial lifecycle (section-based + sentinel artifact_type check)
const wltFinStates = dataRows.filter(r => get(r, 'section') === 'wlt-financial-state-machine');
if (wltFinStates.length < 10) {
  err(`CRITICAL: Canonical WLT financial lifecycle missing — only ${wltFinStates.length} state rows (need >= 10)`);
} else {
  console.log(`WLT financial lifecycle: ${wltFinStates.length} states ✓`);
}
const wltCanonicalSentinel = dataRows.filter(r =>
  get(r, 'artifact_type') === 'canonical-state-machine' && get(r, 'capability') === 'wlt-financial-state-machine'
);
if (wltCanonicalSentinel.length < 1) {
  err(`CRITICAL: No canonical-state-machine sentinel row for WLT financial lifecycle (artifact_type=canonical-state-machine, capability=wlt-financial-state-machine)`);
} else {
  console.log(`WLT canonical-state-machine sentinel: ${wltCanonicalSentinel.length} ✓`);
}

// 8. dispatch_policy rows >= 5
const dispatchRows = dataRows.filter(r => {
  const dp = get(r, 'dispatch_policy');
  return dp && dp !== 'N/A_READ_ONLY:not-applicable' && dp !== '';
});
if (dispatchRows.length < 5) {
  err(`CRITICAL: dispatch_policy rows ${dispatchRows.length} < 5`);
} else {
  console.log(`dispatch_policy rows: ${dispatchRows.length} ✓`);
}

// 9. pricing_policy rows >= 5
const pricingRows = dataRows.filter(r => {
  const pp = get(r, 'pricing_policy');
  return pp && pp !== 'N/A_READ_ONLY:not-applicable' && pp !== '';
});
if (pricingRows.length < 5) {
  err(`CRITICAL: pricing_policy rows ${pricingRows.length} < 5`);
} else {
  console.log(`pricing_policy rows: ${pricingRows.length} ✓`);
}

// 10. COD rows >= 4
const codRows = dataRows.filter(r => get(r, 'section') === 'cod-policy');
if (codRows.length < 4) {
  err(`CRITICAL: COD policy rows ${codRows.length} < 4`);
} else {
  console.log(`COD policy rows: ${codRows.length} ✓`);
}

// 11. notification_triggers rows >= 20
const notifRows = dataRows.filter(r => {
  const nt = get(r, 'notification_triggers');
  return nt && nt !== 'N/A_READ_ONLY:not-applicable' && nt !== '';
});
if (notifRows.length < 20) {
  err(`CRITICAL: notification_triggers rows ${notifRows.length} < 20`);
} else {
  console.log(`notification_triggers rows: ${notifRows.length} ✓`);
}

// 12. external_dependencies rows >= 7
const extDepRows = dataRows.filter(r => {
  const ed = get(r, 'external_dependencies');
  return ed && ed !== 'N/A_READ_ONLY:not-applicable' && ed !== '';
});
if (extDepRows.length < 7) {
  err(`CRITICAL: external_dependencies rows ${extDepRows.length} < 7`);
} else {
  console.log(`external_dependencies rows: ${extDepRows.length} ✓`);
}

// 13. Screen/journey rows have ui_localization_rules
const uiSurfaces = new Set(['app-client','app-partner','app-captain','app-field','control-panel','webapp','website']);
const screenRows = dataRows.filter(r => uiSurfaces.has(get(r, 'surface')) || ['screen','journey','page'].includes(get(r, 'artifact_type')));
const screenMissingLoc = screenRows.filter(r => !get(r, 'ui_localization_rules'));
if (screenMissingLoc.length > 0) {
  err(`CRITICAL: ${screenMissingLoc.length} screen/journey rows missing ui_localization_rules`);
} else {
  console.log(`Screen/journey ui_localization_rules: all ${screenRows.length} rows covered ✓`);
}

// 14. Object operations have rbac_tenant_rule
const objectOpRows = dataRows.filter(r =>
  get(r, 'layer').includes('backend') ||
  get(r, 'operation').match(/create|update|delete|read|list|get|post|put|patch/i)
);
const objectMissingRbac = objectOpRows.filter(r => !get(r, 'rbac_tenant_rule'));
if (objectMissingRbac.length > 0) {
  warn(`WARNING: ${objectMissingRbac.length} object operation rows missing rbac_tenant_rule`);
} else {
  console.log(`RBAC coverage: all ${objectOpRows.length} object operation rows covered ✓`);
}

// 15. Write/financial/order/support rows have audit_privacy_rule
const auditableRows = dataRows.filter(r =>
  get(r, 'service') === 'wlt' || get(r, 'slice_id').startsWith('WLT') || get(r, 'slice_id').startsWith('DSH-WLT') ||
  get(r, 'operation').match(/create|update|delete|post|put|patch/i) ||
  get(r, 'section').includes('order') || get(r, 'section').includes('support')
);
const auditMissing = auditableRows.filter(r => !get(r, 'audit_privacy_rule'));
if (auditMissing.length > 0) {
  warn(`WARNING: ${auditMissing.length} auditable rows missing audit_privacy_rule`);
} else {
  console.log(`Audit/privacy coverage: all ${auditableRows.length} auditable rows covered ✓`);
}

// 16. Critical write/payment/dispatch rows have rollback_compensation_rule
const criticalRows = dataRows.filter(r =>
  get(r, 'service') === 'wlt' || get(r, 'slice_id').startsWith('WLT') ||
  get(r, 'section').includes('dispatch') || get(r, 'section').includes('payment') ||
  get(r, 'artifact_type').includes('policy')
);
const rollbackMissing = criticalRows.filter(r => !get(r, 'rollback_compensation_rule'));
if (rollbackMissing.length > 0) {
  warn(`WARNING: ${rollbackMissing.length} critical rows missing rollback_compensation_rule`);
} else {
  console.log(`Rollback coverage: all ${criticalRows.length} critical rows covered ✓`);
}

// 17. No DSH financial ownership violations
const dshFinViolations = dataRows.filter(r => {
  const svc = get(r, 'service');
  const cap = get(r, 'capability').toLowerCase();
  const section = get(r, 'section');
  if (svc !== 'dsh') return false;
  if (section === 'dsh-wlt-boundary' || section === 'donor-alias-normalization' || section === 'notification-policy' || section === 'openapi-endpoint-contract') return false;
  const domainRule = get(r, 'domain_rule').toLowerCase();
  if (domainRule.includes('preserves wlt') || domainRule.includes('reference') || domainRule.includes('bridge')) return false;
  return (cap.includes('settle') && !cap.includes('settlement-status-bridge')) ||
    (cap.includes('payout') && !cap.includes('reference')) ||
    cap.includes('commission-calc') ||
    cap.includes('final-ledger');
});
if (dshFinViolations.length > 0) {
  err(`CRITICAL: ${dshFinViolations.length} DSH financial ownership violations detected`);
} else {
  console.log('DSH financial ownership violations: 0 ✓');
}

// 18. All external_dependencies rows have provider_decision
const extDepMissingProvider = extDepRows.filter(r => {
  const pd = get(r, 'provider_decision');
  return !pd || pd === 'N/A_READ_ONLY:not-applicable';
});
if (extDepMissingProvider.length > 0) {
  err(`CRITICAL: ${extDepMissingProvider.length} external_dep rows missing provider_decision`);
} else {
  console.log(`Provider decision coverage: all ${extDepRows.length} ext-dep rows covered ✓`);
}

// 19. Donor aliases 11/11 represented
const REQUIRED_ALIASES = ['dashboard','operations','finance','catalogs','community-services','support','partners','marketing','platform','administration','hr'];
const aliasRows = dataRows.filter(r => get(r, 'section') === 'donor-alias-normalization');
const aliasCapabilities = aliasRows.map(r => get(r, 'capability'));
const missingAliases = REQUIRED_ALIASES.filter(a => !aliasCapabilities.some(c => c.includes(a)));
if (missingAliases.length > 0) {
  err(`CRITICAL: Missing donor aliases: ${missingAliases.join(', ')}`);
} else {
  console.log(`Donor aliases: 11/11 represented ✓`);
}

// 20. No forbidden service owners
const FORBIDDEN_SERVICES = new Set(['dsh-wlt','platform','control-panel','app-client','app-partner','app-captain','app-field']);
const forbiddenSvcRows = dataRows.filter(r => FORBIDDEN_SERVICES.has(get(r, 'service')));
if (forbiddenSvcRows.length > 0) {
  err(`CRITICAL: ${forbiddenSvcRows.length} rows with forbidden service owners: ${[...new Set(forbiddenSvcRows.map(r => get(r, 'service')))].join(', ')}`);
} else {
  console.log('Forbidden service owners: 0 ✓');
}

// --- Summary ---
const counts = {
  rows: dataRows.length,
  dispatch_policy: dispatchRows.length,
  pricing_policy: pricingRows.length,
  cod_policy: codRows.length,
  notification_triggers: notifRows.length,
  external_dependencies: extDepRows.length,
  dsh_order_lifecycle: dshOrderStates.length,
  dsh_canonical_state_machine_sentinel: dshCanonicalSentinel.length,
  wlt_financial_lifecycle: wltFinStates.length,
  wlt_canonical_state_machine_sentinel: wltCanonicalSentinel.length,
  screen_journey_ui_loc: screenRows.length,
  object_ops_rbac: objectOpRows.length,
  critical_rows_rollback: criticalRows.length,
  donor_aliases: aliasRows.length,
  dsh_financial_violations: dshFinViolations.length
};

const output = {
  timestamp: new Date().toISOString(),
  guard: 'v3',
  result: errors.length === 0 ? 'PASS' : 'FAIL',
  errors,
  warnings,
  counts
};

if (EVIDENCE_ROOT) {
  try {
    mkdirSync(EVIDENCE_ROOT, { recursive: true });
    writeFileSync(join(EVIDENCE_ROOT, 'guard-v3-output.json'), JSON.stringify(output, null, 2));
    writeFileSync(join(EVIDENCE_ROOT, 'guard-v3-output.txt'),
      `RESULT: ${output.result}\nErrors: ${errors.length}\nWarnings: ${warnings.length}\n` +
      errors.map(e => `ERROR: ${e}`).join('\n') + '\n' +
      warnings.map(w => `WARN: ${w}`).join('\n')
    );
  } catch(e) {
    console.warn(`Could not write evidence: ${e.message}`);
  }
}

console.log('\n=== GUARD V3 RESULTS ===');
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
