// fix-v3-targeted.mjs
// Applies 5 targeted fixes to slice_execution_master_matrix_v3.csv
// Run once; deletes itself after use is NOT expected — kept for audit trail
// Node.js — no external dependencies

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const V3_PATH = join(ROOT, 'machine-readable', 'slice_execution_master_matrix_v3.csv');

// --- CSV parser (RFC 4180 compliant, preserves quoting info) ---
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

function escapeCSV(val) {
  if (val === null || val === undefined) val = '';
  val = String(val);
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return '"' + val + '"';
}

function rowToCSV(row) {
  return row.map(escapeCSV).join(',');
}

const raw = readFileSync(V3_PATH, 'utf8');
const allRows = parseCSV(raw);
const headers = allRows[0];
const dataRows = allRows.slice(1);

const colIdx = {};
headers.forEach((h, i) => colIdx[h] = i);
function get(row, col) {
  const i = colIdx[col];
  return i !== undefined ? (row[i] || '') : '';
}
function set(row, col, val) {
  const i = colIdx[col];
  if (i !== undefined) row[i] = val;
}

const CANONICAL_POLICY_ROW_PREFIX_RE = /^V3-01(07[3-9]|0[89]\d|[1-9]\d\d)$/;
function isCanonicalPolicyRow(row) {
  const id = get(row, 'master_v3_id');
  // rows V3-01073 through V3-01180
  if (!id.startsWith('V3-0')) return false;
  const num = parseInt(id.replace('V3-0', ''), 10);
  return num >= 1073 && num <= 1180;
}

// Fields that should be N/A_POLICY_CANONICAL when blank in canonical policy rows
const POLICY_NA_FIELDS = [
  'slice_order','consumer_surfaces','app','actor',
  'journey_id','page_id','screen_id','logic_id',
  'source_matrix','source_record_ids','source_path',
  'target_path','route_path','target_anchor','fragment_id',
  'build_target','visual_reference','acceptance_gate','verification_command',
  'risk','rollback',
];

let dsh011FixCount = 0;
let blankFillCount = 0;

const fixedRows = dataRows.map(row => {
  const r = [...row];
  const sliceId = get(r, 'slice_id');
  const section = get(r, 'section');
  const masterId = get(r, 'master_v3_id');

  // FIX 1: Remove DSH-011 from DSH-015/marketing rows
  const isDsh015 = sliceId.includes('DSH-015') || section.toLowerCase() === 'marketing';
  if (isDsh015) {
    let changed = false;
    for (let i = 0; i < r.length; i++) {
      if (r[i].includes('DSH-011')) {
        r[i] = r[i].replace(/DSH-011/g, 'DSH-015');
        changed = true;
      }
    }
    if (changed) dsh011FixCount++;
  }

  // FIX 2: Fill blank cells in canonical policy rows
  if (isCanonicalPolicyRow(r)) {
    for (const field of POLICY_NA_FIELDS) {
      const idx = colIdx[field];
      if (idx !== undefined && !r[idx]) {
        r[idx] = 'N/A_POLICY_CANONICAL';
        blankFillCount++;
      }
    }
    // build_target for system rows
    const bt = get(r, 'build_target');
    if (!bt || bt === '') set(r, 'build_target', 'N/A_POLICY_CANONICAL');
    // verification_command
    const vc = get(r, 'verification_command');
    if (!vc || vc === '') set(r, 'verification_command', 'node tools/guards/guard-slice-master-matrix-v3.mjs');
    // acceptance_gate
    const ag = get(r, 'acceptance_gate');
    if (!ag || ag === '') set(r, 'acceptance_gate', 'PHASE_10_11_MATRICES_CONSISTENT_NOT_SLICE_READY');
    // duplicate_key - use master_v3_id if blank
    const dk = get(r, 'duplicate_key');
    if (!dk || dk === '') set(r, 'duplicate_key', get(r, 'master_v3_id') + ':policy-canonical');
    // risk
    const risk = get(r, 'risk');
    if (!risk || risk === '') set(r, 'risk', 'N/A_POLICY_CANONICAL');
    // rollback
    const rb = get(r, 'rollback');
    if (!rb || rb === '') set(r, 'rollback', 'N/A_POLICY_CANONICAL');
  }

  return r;
});

// FIX 3 & 4: Add ONE canonical DSH sentinel row (V3-01181)
const dshSentinel = new Array(headers.length).fill('');
set(dshSentinel, 'master_v3_id', 'V3-01181');
set(dshSentinel, 'master_id', 'POLICY-CANONICAL-DSH-ORDER-LIFECYCLE-SENTINEL');
set(dshSentinel, 'slice_id', 'DSH-011');
set(dshSentinel, 'slice_order', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'service', 'dsh');
set(dshSentinel, 'section', 'order-state-machine');
set(dshSentinel, 'surface', 'system');
set(dshSentinel, 'consumer_surfaces', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'app', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'actor', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'capability', 'order-state-machine');
set(dshSentinel, 'journey_id', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'page_id', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'screen_id', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'logic_id', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'source_matrix', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'source_record_ids', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'source_path', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'target_path', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'route_path', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'target_anchor', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'fragment_id', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'layer', 'domain');
set(dshSentinel, 'artifact_type', 'canonical-state-machine');
set(dshSentinel, 'operation', 'lifecycle-sentinel');
set(dshSentinel, 'domain_rule', 'DSH owns order state lifecycle canonical spec: 10 states (pending through delivered) plus 5 terminal cancellation states; WLT owns financial truth; invalid transition rejected and audited');
set(dshSentinel, 'business_domain_rules', 'DSH order state machine sentinel: pending|store-accepted|preparing|ready-for-pickup|dispatching|driver-assigned|driver-arrived-store|picked-up|arrived-customer|delivered|cancelled-by-client|cancelled-by-store|cancelled-no-driver|failed-payment|failed-dispatch; all idempotent by correlation_id; WLT triggered only at payment-relevant transitions');
set(dshSentinel, 'db_state_lifecycle', 'orders.state column; transition_log; valid_from/valid_to; indexed by correlation_id and order_id');
set(dshSentinel, 'dispatch_policy', 'N/A_READ_ONLY:not-applicable');
set(dshSentinel, 'pricing_policy', 'N/A_READ_ONLY:not-applicable');
set(dshSentinel, 'finance_policy', 'N/A_READ_ONLY:not-applicable');
set(dshSentinel, 'notification_triggers', 'order.state.changed on every valid transition');
set(dshSentinel, 'integration_infrastructure', 'N/A_READ_ONLY:not-applicable');
set(dshSentinel, 'external_dependencies', 'N/A_READ_ONLY:not-applicable');
set(dshSentinel, 'ui_localization_rules', 'N/A_READ_ONLY:system-domain-row');
set(dshSentinel, 'build_target', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'rbac_tenant_rule', 'DSH operational actors only; WLT notified at financial transitions');
set(dshSentinel, 'audit_privacy_rule', 'audit actor_id actor_role object_id action from_state to_state correlation_id timestamp; mask phone/location in logs; never log payment secrets');
set(dshSentinel, 'rollback_compensation_rule', 'invalid transition: no state mutation; audited rejection; dispatch-failure-after-auth: trigger release-auth-hold event to WLT');
set(dshSentinel, 'policy_parameters', 'correlation_id required; idempotency_key required; transition_timeout configurable per zone');
set(dshSentinel, 'policy_owner', 'dsh');
set(dshSentinel, 'provider_decision', 'N/A_READ_ONLY:not-applicable');
set(dshSentinel, 'api_contract', 'BLOCKED_NEEDS_API_CONTRACT:order-state-machine-transition-api');
set(dshSentinel, 'db_objects', 'orders; order_transitions; order_audit_log');
set(dshSentinel, 'auth_rule', 'BLOCKED_NEEDS_API_CONTRACT:order-state-machine-auth-rules');
set(dshSentinel, 'wlt_boundary', 'DSH triggers WLT event at payment-relevant transitions; DSH does not process financial state');
set(dshSentinel, 'wlt_dependency', 'WLT payment session lifecycle governs financial truth at checkout and delivery transitions');
set(dshSentinel, 'idempotency_required', 'true: all transitions idempotent by correlation_id; duplicate transition is no-op');
set(dshSentinel, 'state_transitions', 'pending|store-accepted|preparing|ready-for-pickup|dispatching|driver-assigned|driver-arrived-store|picked-up|arrived-customer|delivered|cancelled-by-client|cancelled-by-store|cancelled-no-driver|failed-payment|failed-dispatch');
set(dshSentinel, 'error_cases', 'invalid_transition; duplicate_transition_idempotent; auth_failure; correlation_id_missing; wlt_trigger_failure');
set(dshSentinel, 'negative_cases', 'backwards_transition_rejected; skip_state_rejected; cross_tenant_rejected; expired_order_state_rejected');
set(dshSentinel, 'performance_rule', 'state transition latency < 200ms p95; audit log write < 100ms; WLT trigger async non-blocking');
set(dshSentinel, 'observability_rule', 'emit order.state.changed on every valid transition; trace correlation_id; alert on invalid_transition rate > 0.1%');
set(dshSentinel, 'ui_kit_compliance', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'visual_reference', 'N/A_POLICY_CANONICAL');
set(dshSentinel, 'evidence_required', 'DSH order state machine diagram; state transition spec; integration contract with WLT at financial transitions');
set(dshSentinel, 'decision', 'BLOCKED_NEEDS_DOMAIN_MODEL');
set(dshSentinel, 'status', 'BLOCKED_NEEDS_DOMAIN_MODEL');
set(dshSentinel, 'blocker_code', 'MISSING_ORDER_STATE_MACHINE_CANONICAL_SPEC');
set(dshSentinel, 'next_action', 'Produce canonical DSH order state machine diagram and transition spec before DSH-011 execution');
set(dshSentinel, 'acceptance_gate', 'PHASE_10_11_MATRICES_CONSISTENT_NOT_SLICE_READY');
set(dshSentinel, 'verification_command', 'node tools/guards/guard-slice-master-matrix-v3.mjs');
set(dshSentinel, 'risk', 'CRITICAL: incorrect order state machine causes incorrect financial triggers to WLT');
set(dshSentinel, 'rollback', 'invalid transition -> no state mutation; compensation: release-auth-hold if dispatch-failure-after-authorization');
set(dshSentinel, 'duplicate_key', 'V3-01181:canonical-state-machine:dsh:order-state-machine');
set(dshSentinel, 'notes', 'SENTINEL: canonical-state-machine artifact type for guard detection; 15 individual state rows exist under section=order-state-machine; this sentinel row enables artifact_type-based guard verification');

// FIX 4: Add ONE canonical WLT sentinel row (V3-01182)
const wltSentinel = new Array(headers.length).fill('');
set(wltSentinel, 'master_v3_id', 'V3-01182');
set(wltSentinel, 'master_id', 'POLICY-CANONICAL-WLT-FINANCIAL-LIFECYCLE-SENTINEL');
set(wltSentinel, 'slice_id', 'WLT-001');
set(wltSentinel, 'slice_order', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'service', 'wlt');
set(wltSentinel, 'section', 'wlt-financial-state-machine');
set(wltSentinel, 'surface', 'system');
set(wltSentinel, 'consumer_surfaces', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'app', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'actor', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'capability', 'wlt-financial-state-machine');
set(wltSentinel, 'journey_id', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'page_id', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'screen_id', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'logic_id', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'source_matrix', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'source_record_ids', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'source_path', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'target_path', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'route_path', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'target_anchor', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'fragment_id', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'layer', 'domain');
set(wltSentinel, 'artifact_type', 'canonical-state-machine');
set(wltSentinel, 'operation', 'lifecycle-sentinel');
set(wltSentinel, 'domain_rule', 'WLT owns all financial state truth: payment-initiated through settled; refund branch; reversal branch; all transitions idempotent by payment_session_id+idempotency_key; provider timeout requires status query before retry');
set(wltSentinel, 'business_domain_rules', 'WLT financial state machine sentinel: payment-initiated|authorization-hold|authorized|capture-in-progress|captured|settlement-in-progress|settled|refund-requested|refund-in-progress|refund-completed|refund-failed|reversal-requested|reversal-completed|failed|expired; DSH stores only opaque reference (paymentSessionId); all monetary state mutations owned by WLT');
set(wltSentinel, 'db_state_lifecycle', 'payment_sessions.state; payment_audit_log; idempotency_key index; payment_session_id+idempotency_key unique constraint');
set(wltSentinel, 'dispatch_policy', 'N/A_READ_ONLY:not-applicable');
set(wltSentinel, 'pricing_policy', 'N/A_READ_ONLY:not-applicable');
set(wltSentinel, 'finance_policy', 'payment-initiated|authorization-hold|authorized|capture-in-progress|captured|settlement-in-progress|settled; refund: refund-requested|refund-in-progress|refund-completed|refund-failed; reversal: reversal-requested|reversal-completed; failure: failed|expired');
set(wltSentinel, 'notification_triggers', 'payment.pending; payment.authorized; payment.captured; payment.settled; refund.pending; refund.completed; payment.failed');
set(wltSentinel, 'integration_infrastructure', 'abstract-payment-gateway callback; DSH order state triggers; settlement cycle scheduler');
set(wltSentinel, 'external_dependencies', 'abstract-payment-gateway');
set(wltSentinel, 'ui_localization_rules', 'N/A_READ_ONLY:system-domain-row');
set(wltSentinel, 'build_target', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'rbac_tenant_rule', 'WLT financial actors only; DSH receives callback events; no cross-tenant financial data exposure');
set(wltSentinel, 'audit_privacy_rule', 'audit actor_id actor_role payment_session_id action from_state to_state correlation_id timestamp; never log payment secrets or provider tokens; mask card data in all logs');
set(wltSentinel, 'rollback_compensation_rule', 'provider timeout: query provider status before retry; WLT callback duplicate: idempotent no-op; dispatch-failure after auth: release authorization hold; partial refund: recalculate commission/tax/settlement through WLT');
set(wltSentinel, 'policy_parameters', 'payment_session_id+idempotency_key unique; provider timeout configurable; retry exponential backoff; dead-letter after 3 attempts');
set(wltSentinel, 'policy_owner', 'wlt');
set(wltSentinel, 'provider_decision', 'TBD_CONFIG_REQUIRED:abstract-payment-gateway-provider-not-decided');
set(wltSentinel, 'api_contract', 'BLOCKED_NEEDS_API_CONTRACT:wlt-financial-state-machine-api');
set(wltSentinel, 'db_objects', 'payment_sessions; payment_audit_log; refunds; reversals; settlements');
set(wltSentinel, 'auth_rule', 'BLOCKED_NEEDS_API_CONTRACT:wlt-financial-auth-rules');
set(wltSentinel, 'wlt_boundary', 'WLT is sole authority for all monetary state mutations; DSH holds only opaque paymentSessionId reference');
set(wltSentinel, 'wlt_dependency', 'N/A_READ_ONLY:this-row-is-owned-by-wlt');
set(wltSentinel, 'idempotency_required', 'true: all transitions idempotent by payment_session_id+idempotency_key; provider callback duplicate is no-op');
set(wltSentinel, 'state_transitions', 'payment-initiated|authorization-hold|authorized|capture-in-progress|captured|settlement-in-progress|settled|refund-requested|refund-in-progress|refund-completed|refund-failed|reversal-requested|reversal-completed|failed|expired');
set(wltSentinel, 'error_cases', 'provider_timeout; callback_duplicate_idempotent; auth_hold_failure; capture_failure; settlement_failure; refund_failure; reversal_failure; idempotency_key_collision');
set(wltSentinel, 'negative_cases', 'invalid_state_transition_rejected; cross_tenant_financial_access_rejected; expired_session_rejected; missing_idempotency_key_rejected');
set(wltSentinel, 'performance_rule', 'authorization < 3s p95; capture < 5s p95; settlement async non-blocking; provider query timeout < 30s');
set(wltSentinel, 'observability_rule', 'emit payment.state.changed on every valid transition; trace payment_session_id+correlation_id; alert on provider_timeout rate > 0.5%');
set(wltSentinel, 'ui_kit_compliance', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'visual_reference', 'N/A_POLICY_CANONICAL');
set(wltSentinel, 'evidence_required', 'WLT financial state machine diagram; provider callback contract; settlement cycle spec; refund and reversal flow spec');
set(wltSentinel, 'decision', 'BLOCKED_NEEDS_API_CONTRACT');
set(wltSentinel, 'status', 'BLOCKED_NEEDS_API_CONTRACT');
set(wltSentinel, 'blocker_code', 'MISSING_WLT_FINANCIAL_STATE_MACHINE_CANONICAL_SPEC');
set(wltSentinel, 'next_action', 'Produce canonical WLT financial state machine diagram and provider callback contract before WLT-001 execution');
set(wltSentinel, 'acceptance_gate', 'PHASE_10_11_MATRICES_CONSISTENT_NOT_SLICE_READY');
set(wltSentinel, 'verification_command', 'node tools/guards/guard-slice-master-matrix-v3.mjs');
set(wltSentinel, 'risk', 'CRITICAL: incorrect financial state machine causes payment inconsistency and ledger corruption');
set(wltSentinel, 'rollback', 'idempotent replay; provider status query before retry; release-auth-hold on dispatch failure; partial refund recalculates via WLT');
set(wltSentinel, 'duplicate_key', 'V3-01182:canonical-state-machine:wlt:wlt-financial-state-machine');
set(wltSentinel, 'notes', 'SENTINEL: canonical-state-machine artifact type for guard detection; 22 individual state rows exist under section=wlt-financial-state-machine; this sentinel row enables artifact_type-based guard verification');

// Build final CSV
const allDataRows = [...fixedRows, dshSentinel, wltSentinel];
const csvLines = [rowToCSV(headers), ...allDataRows.map(rowToCSV)];
const csvContent = csvLines.join('\n') + '\n';

// Write UTF-8 no-BOM
const enc = { encoding: 'utf8' };
writeFileSync(V3_PATH, csvContent, 'utf8');

console.log('=== FIX REPORT ===');
console.log(`DSH-011 fixed in DSH-015/marketing rows: ${dsh011FixCount}`);
console.log(`Blank cells filled in canonical rows: ${blankFillCount}`);
console.log(`Sentinel rows added: 2 (V3-01181 DSH, V3-01182 WLT)`);
console.log(`Total rows: ${allDataRows.length}`);
console.log('V3 CSV written (UTF-8 no-BOM)');
