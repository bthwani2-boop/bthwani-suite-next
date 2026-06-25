// guard-slice-master-matrix-v2.mjs
// Validates canonical machine-readable JSON governance files
// Replaces: slice_execution_master_matrix.csv (deleted 2026-06-22)
// Cross-cutting rules extracted to governance.json#cross_cutting_rules
// Node.js — no external dependencies
// Exit 0 = PASS, Exit 1 = FAIL

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
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
const govn     = readJSON('machine-readable/governance.json');
const archMap  = readJSON('machine-readable/architecture-map.json');
const surfMap  = readJSON('machine-readable/surface-ownership-map.json');
const topicReg = readJSON('machine-readable/topic-registry.json');

// 1. cross_cutting_rules present and complete
const cr = govn?.cross_cutting_rules;
if (!cr) {
  err('CRITICAL: governance.json missing cross_cutting_rules');
} else {
  const required = ['rtl_i18n', 'rbac_tenant', 'audit_privacy', 'idempotency', 'build_targets', 'rollback_compensation'];
  const missing = required.filter(k => !cr[k]);
  if (missing.length > 0) {
    err(`CRITICAL: governance.json cross_cutting_rules missing keys: ${missing.join(', ')}`);
  } else {
    console.log(`Cross-cutting rules: all ${required.length} rule categories present ✓`);
  }
}

// 2. RTL i18n rule is defined
if (cr?.rtl_i18n?.rule) {
  console.log(`RTL/i18n rule: defined ✓`);
} else {
  err('CRITICAL: governance.json cross_cutting_rules.rtl_i18n.rule not defined');
}

// 3. RBAC rules are defined for all actors
const rbac = cr?.rbac_tenant;
if (rbac) {
  const requiredActors = ['client_actor', 'operator_actor', 'captain_actor', 'partner_actor', 'field_actor', 'auth_source'];
  const missingActors = requiredActors.filter(a => !rbac[a]);
  if (missingActors.length > 0) {
    warn(`WARNING: cross_cutting_rules.rbac_tenant missing actor rules: ${missingActors.join(', ')}`);
  } else {
    console.log(`RBAC actor rules: ${requiredActors.length} actors defined ✓`);
  }
}

// 4. Audit/privacy rule defined
if (cr?.audit_privacy?.rule) {
  console.log(`Audit/privacy rule: defined ✓`);
} else {
  err('CRITICAL: governance.json cross_cutting_rules.audit_privacy.rule not defined');
}

// 5. Rollback/compensation rules defined
const rollback = cr?.rollback_compensation;
if (rollback && Object.keys(rollback).length >= 3) {
  console.log(`Rollback/compensation rules: ${Object.keys(rollback).length} scenarios defined ✓`);
} else {
  warn('WARNING: cross_cutting_rules.rollback_compensation should have >= 3 scenarios');
}

// 6. Surface ownership map — all DSH surfaces are UI-only
const REQUIRED_SURFACES = ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel'];
if (surfMap) {
  const surfacesObj = surfMap.surfaces || surfMap;
  for (const surf of REQUIRED_SURFACES) {
    const s = surfacesObj[surf];
    if (!s) { warn(`WARNING: surface-ownership-map.json missing surface: ${surf}`); continue; }
    if (!s.is_ui_only) {
      err(`CRITICAL: surface '${surf}' in surface-ownership-map.json is not declared is_ui_only: true`);
    }
    if (!s.dsh_shared_brain && !s.owning_shared_brain) {
      warn(`WARNING: surface '${surf}' missing dsh_shared_brain or owning_shared_brain`);
    }
    if (!s.forbidden_content || !Array.isArray(s.forbidden_content)) {
      warn(`WARNING: surface '${surf}' missing forbidden_content array`);
    }
  }
  console.log(`Surface UI-only enforcement: checked ${REQUIRED_SURFACES.length} surfaces ✓`);
}

// 7. Topic registry — no topic references control-panel without sections
if (topicReg) {
  const topicsObj = topicReg.topics || topicReg;
  const topics = Array.isArray(topicsObj) ? topicsObj : Object.values(topicsObj);
  const cpMissing = topics.filter(t =>
    t && Array.isArray(t.required_surfaces) &&
    (t.required_surfaces.includes('control-panel') || t.optional_surfaces?.includes('control-panel')) &&
    !t.primary_control_panel_section
  );
  if (cpMissing.length > 0) {
    err(`CRITICAL: ${cpMissing.length} topics have control-panel surface but no primary_control_panel_section`);
  } else {
    console.log(`Topic control-panel section naming: all topics properly scoped ✓`);
  }

  // No topic declares wlt financial domains as DSH-owned
  const DSH_FORBIDDEN_CAPS = ['wallet', 'payment_session', 'refund', 'settlement', 'payout', 'commission', 'COD_financial', 'ledger', 'reconciliation'];
  const dshTopics = topics.filter(t => t && t.owning_service === 'dsh');
  const dshFinViolations = [];
  for (const t of dshTopics) {
    const scopeStr = JSON.stringify(t.in_scope || '').toLowerCase();
    for (const cap of DSH_FORBIDDEN_CAPS) {
      if (scopeStr.includes(cap.toLowerCase()) && !scopeStr.includes('reference') && !scopeStr.includes('display') && !scopeStr.includes('read-only')) {
        dshFinViolations.push(`${t.topic_id}:${cap}`);
      }
    }
  }
  if (dshFinViolations.length > 0) {
    err(`CRITICAL: DSH topics with financial ownership violations: ${dshFinViolations.join(', ')}`);
  } else {
    console.log('DSH topic financial ownership violations: 0 ✓');
  }
}

// 8. Architecture map — reserved services must not be active
const RESERVED_SERVICES = ['knz', 'arb', 'amn', 'esf', 'mrf', 'snd', 'kwd'];
if (archMap) {
  const stubServices = archMap.services?.stub_services?.services || [];
  const notReserved = RESERVED_SERVICES.filter(s => !stubServices.includes(s));
  if (notReserved.length > 0) {
    warn(`WARNING: Reserved services not listed in stub_services: ${notReserved.join(', ')}`);
  } else {
    console.log(`Reserved services: ${RESERVED_SERVICES.length} services correctly listed as stub_services ✓`);
  }
}

// 9. DSH order state machine defined
const orderSM = archMap?.dsh_order_state_machine;
if (!orderSM || !Array.isArray(orderSM.states) || orderSM.states.length < 10) {
  err('CRITICAL: architecture-map.json dsh_order_state_machine missing or insufficient states');
} else {
  console.log(`DSH order state machine: ${orderSM.states.length} states ✓`);
}

// 10. Notification triggers defined
const notifTriggers = archMap?.notification_triggers_summary?.triggers;
if (!Array.isArray(notifTriggers) || notifTriggers.length < 20) {
  err(`CRITICAL: notification_triggers_summary.triggers has ${notifTriggers?.length ?? 0} entries — needs >= 20`);
} else {
  console.log(`Notification triggers: ${notifTriggers.length} entries ✓`);
}

// --- Summary ---
const output = {
  timestamp: new Date().toISOString(),
  guard: 'v2-json',
  result: errors.length === 0 ? 'PASS' : 'FAIL',
  errors,
  warnings,
  counts: {
    cross_cutting_rules: Object.keys(cr || {}).length,
    surfaces_checked: REQUIRED_SURFACES.length,
    notification_triggers: notifTriggers?.length ?? 0,
    dsh_order_states: orderSM?.states?.length ?? 0,
    dsh_financial_violations: 0
  }
};

if (EVIDENCE_ROOT) {
  try {
    mkdirSync(EVIDENCE_ROOT, { recursive: true });
    writeFileSync(join(EVIDENCE_ROOT, 'guard-v2-output.json'), JSON.stringify(output, null, 2));
  } catch(e) {
    console.warn(`Could not write evidence: ${e.message}`);
  }
}

console.log('\n=== GUARD V2 (JSON) RESULTS ===');
console.log(JSON.stringify(output.counts, null, 2));
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
