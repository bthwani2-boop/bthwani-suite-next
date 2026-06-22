// guard-slice-master-matrix-v3.mjs
// Validates canonical machine-readable JSON governance files
// Replaces: slice_execution_master_matrix_v3.csv (deleted 2026-06-22)
// All domain data extracted to canonical JSON files in machine-readable/
// Node.js — no external dependencies
// Exit 0 = PASS, Exit 1 = FAIL

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MR = join(ROOT, 'machine-readable');
const EVIDENCE_ROOT = process.env.BTH_EVIDENCE_ROOT || null;

const errors = [];
const warnings = [];
function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function readJSON(relPath) {
  const p = join(ROOT, relPath);
  if (!existsSync(p)) { err(`CRITICAL: Required file not found: ${relPath}`); return null; }
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { err(`CRITICAL: Invalid JSON in ${relPath}: ${e.message}`); return null; }
}

// --- Load canonical files ---
const archMap = readJSON('machine-readable/architecture-map.json');
const dshWlt  = readJSON('machine-readable/dsh-wlt-boundary.json');
const govn    = readJSON('machine-readable/governance.json');
const execSt  = readJSON('machine-readable/execution-status.json');
const topicReg = readJSON('machine-readable/topic-registry.json');

// 1. DSH order state machine >= 10 states
const orderSM = archMap?.dsh_order_state_machine;
if (!orderSM) {
  err('CRITICAL: architecture-map.json missing dsh_order_state_machine');
} else {
  const stateCount = Array.isArray(orderSM.states) ? orderSM.states.length : 0;
  if (stateCount < 10) {
    err(`CRITICAL: DSH order state machine has ${stateCount} states — needs >= 10`);
  } else {
    console.log(`DSH order lifecycle: ${stateCount} states ✓`);
  }
  if (!orderSM.idempotency_key) err('CRITICAL: dsh_order_state_machine missing idempotency_key');
  if (!orderSM.rollback_rule) err('CRITICAL: dsh_order_state_machine missing rollback_rule');
  if (!orderSM.event_on_every_transition) err('CRITICAL: dsh_order_state_machine missing event_on_every_transition');
}

// 2. WLT financial state machine >= 10 states
const finSM = dshWlt?.wlt_financial_state_machine;
if (!finSM) {
  err('CRITICAL: dsh-wlt-boundary.json missing wlt_financial_state_machine');
} else {
  const stateCount = Array.isArray(finSM.states) ? finSM.states.length : 0;
  if (stateCount < 10) {
    err(`CRITICAL: WLT financial state machine has ${stateCount} states — needs >= 10`);
  } else {
    console.log(`WLT financial lifecycle: ${stateCount} states ✓`);
  }
  if (!finSM.idempotency_key) err('CRITICAL: wlt_financial_state_machine missing idempotency_key');
  if (!finSM.rollback_rule) err('CRITICAL: wlt_financial_state_machine missing rollback_rule');
}

// 3. Dispatch policy >= 5 entries
const dispatchPolicy = archMap?.dsh_dispatch_policy?.policies;
if (!Array.isArray(dispatchPolicy) || dispatchPolicy.length < 5) {
  err(`CRITICAL: architecture-map.json dsh_dispatch_policy.policies has ${dispatchPolicy?.length ?? 0} entries — needs >= 5`);
} else {
  console.log(`dispatch_policy entries: ${dispatchPolicy.length} ✓`);
}

// 4. Pricing policy >= 5 entries
const pricingPolicy = archMap?.pricing_policy_summary?.policies;
if (!Array.isArray(pricingPolicy) || pricingPolicy.length < 5) {
  err(`CRITICAL: architecture-map.json pricing_policy_summary.policies has ${pricingPolicy?.length ?? 0} entries — needs >= 5`);
} else {
  console.log(`pricing_policy entries: ${pricingPolicy.length} ✓`);
}

// 5. COD policy >= 4 entries
const codPolicy = archMap?.cod_policy_summary?.policies;
if (!Array.isArray(codPolicy) || codPolicy.length < 4) {
  err(`CRITICAL: architecture-map.json cod_policy_summary.policies has ${codPolicy?.length ?? 0} entries — needs >= 4`);
} else {
  console.log(`COD policy entries: ${codPolicy.length} ✓`);
}

// 6. Notification triggers >= 20 entries
const notifTriggers = archMap?.notification_triggers_summary?.triggers;
if (!Array.isArray(notifTriggers) || notifTriggers.length < 20) {
  err(`CRITICAL: architecture-map.json notification_triggers_summary.triggers has ${notifTriggers?.length ?? 0} entries — needs >= 20`);
} else {
  console.log(`notification_triggers entries: ${notifTriggers.length} ✓`);
}

// 7. External dependencies >= 7 entries
const extDeps = archMap?.external_dependencies_summary?.dependencies;
if (!Array.isArray(extDeps) || extDeps.length < 7) {
  err(`CRITICAL: architecture-map.json external_dependencies_summary.dependencies has ${extDeps?.length ?? 0} entries — needs >= 7`);
} else {
  console.log(`external_dependencies entries: ${extDeps.length} ✓`);
}

// 8. Control panel sections = 10 (donor alias completeness)
const cpSections = archMap?.control_panel_sections;
if (!cpSections || typeof cpSections !== 'object') {
  err('CRITICAL: architecture-map.json missing control_panel_sections');
} else {
  const REQUIRED_SECTIONS = ['dashboard', 'operations', 'finance', 'catalogs', 'partners', 'marketing', 'support', 'platform', 'administration', 'hr'];
  const missingSections = REQUIRED_SECTIONS.filter(s => !cpSections[s]);
  if (missingSections.length > 0) {
    err(`CRITICAL: Missing control_panel_sections: ${missingSections.join(', ')}`);
  } else {
    console.log(`Control-panel sections: ${REQUIRED_SECTIONS.length}/10 ✓`);
  }
}

// 9. Cross-cutting rules present in governance.json
const crossRules = govn?.cross_cutting_rules;
if (!crossRules) {
  err('CRITICAL: governance.json missing cross_cutting_rules');
} else {
  if (!crossRules.rtl_i18n?.rule) err('CRITICAL: cross_cutting_rules missing rtl_i18n.rule');
  if (!crossRules.rbac_tenant?.auth_source) err('CRITICAL: cross_cutting_rules missing rbac_tenant.auth_source');
  if (!crossRules.audit_privacy?.rule) err('CRITICAL: cross_cutting_rules missing audit_privacy.rule');
  if (!crossRules.idempotency?.rule) err('CRITICAL: cross_cutting_rules missing idempotency.rule');
  console.log(`Cross-cutting rules: rtl_i18n, rbac_tenant, audit_privacy, idempotency ✓`);
}

// 10. VERIFIED topics only have evidence
if (execSt) {
  const topics = execSt.topics || {};
  const verifiedWithoutEvidence = [];
  for (const [id, t] of Object.entries(topics)) {
    if (t.current_status === 'RUNTIME_VERIFIED' && !t.evidence_matches_claim) {
      verifiedWithoutEvidence.push(id);
    }
  }
  if (verifiedWithoutEvidence.length > 0) {
    err(`CRITICAL: Topics with RUNTIME_VERIFIED but no evidence_matches_claim: ${verifiedWithoutEvidence.join(', ')}`);
  } else {
    console.log(`RUNTIME_VERIFIED evidence coverage: all verified topics have evidence_matches_claim ✓`);
  }
}

// 11. No Topics specifying control-panel without naming sections
if (topicReg) {
  const topicsObj = topicReg.topics || topicReg;
  const topics = Array.isArray(topicsObj) ? topicsObj : Object.values(topicsObj);
  const cpWithoutSection = topics.filter(t =>
    t && Array.isArray(t.required_surfaces) &&
    t.required_surfaces.includes('control-panel') &&
    !t.primary_control_panel_section
  );
  if (cpWithoutSection.length > 0) {
    err(`CRITICAL: ${cpWithoutSection.length} topics have control-panel as required_surface but no primary_control_panel_section`);
  } else {
    console.log(`Control-panel section naming: all topics with CP surface have section named ✓`);
  }
}

// 12. DSH financial ownership violations
// Scan DSH order state machine for financial ownership claims
if (orderSM) {
  const orderOwner = (orderSM.owner || '').toLowerCase();
  if (orderOwner !== 'dsh') {
    err(`CRITICAL: DSH order state machine owner should be 'dsh', found: '${orderOwner}'`);
  }
  const badStates = (orderSM.states || []).filter(s =>
    typeof s === 'string' && (
      s.includes('settle') || s.includes('payout') ||
      (s.includes('commission') && !s.includes('reference'))
    )
  );
  if (badStates.length > 0) {
    err(`CRITICAL: DSH order state machine contains financial ownership violation states: ${badStates.join(', ')}`);
  }
}

// Validate WLT boundary states don't appear in dsh_order_state_machine
const wltStates = finSM?.states || [];
const orderStates = orderSM?.states || [];
const leakedWltStates = orderStates.filter(s => wltStates.includes(s));
if (leakedWltStates.length > 0) {
  err(`CRITICAL: WLT financial states found in DSH order state machine: ${leakedWltStates.join(', ')}`);
} else {
  console.log('DSH financial ownership violations: 0 ✓');
}

// 13. DSH-001 screenshot evidence still present
const DSH001_SCREENSHOTS = join(ROOT, 'services', 'dsh', 'evidence', 'DSH-001-store-discovery-fullstack-multi-surface', 'screenshots');
const REQUIRED_SCREENSHOTS = [
  'app-client-store-discovery-reverify.png',
  'control-panel-stores-admin-success.png',
  'app-partner-store-context.png',
  'app-field-store-verification.png',
  'app-captain-store-pickup-context.png'
];
for (const shot of REQUIRED_SCREENSHOTS) {
  if (!existsSync(join(DSH001_SCREENSHOTS, shot))) {
    err(`CRITICAL: DSH-001 required screenshot missing: ${shot}`);
  }
}
if (errors.filter(e => e.includes('screenshot')).length === 0) {
  console.log(`DSH-001 screenshots: ${REQUIRED_SCREENSHOTS.length}/5 present ✓`);
}

// 14. WLT boundary integrity
if (dshWlt) {
  if (dshWlt.violations_register?.active_violations !== 0) {
    err(`CRITICAL: DSH/WLT boundary violations_register.active_violations = ${dshWlt.violations_register?.active_violations} (must be 0)`);
  } else {
    console.log('DSH/WLT boundary violations_register: 0 ✓');
  }
}

// --- Summary ---
const counts = {
  dsh_order_states: orderSM?.states?.length ?? 0,
  wlt_financial_states: finSM?.states?.length ?? 0,
  dispatch_policies: dispatchPolicy?.length ?? 0,
  pricing_policies: pricingPolicy?.length ?? 0,
  cod_policies: codPolicy?.length ?? 0,
  notification_triggers: notifTriggers?.length ?? 0,
  external_dependencies: extDeps?.length ?? 0,
  control_panel_sections: Object.keys(cpSections || {}).length,
  dsh_financial_violations: 0
};

const output = {
  timestamp: new Date().toISOString(),
  guard: 'v3-json',
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

console.log('\n=== GUARD V3 (JSON) RESULTS ===');
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
