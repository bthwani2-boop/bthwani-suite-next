#!/usr/bin/env node
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const packageArg = args.find((value) => !value.startsWith('--'));
const sequenceReady = args.includes('--sequence-ready');
const sequenceComplete = args.includes('--sequence-complete');
const handoff = args.includes('--handoff');
const closure = args.includes('--closure');
const sequenceIndex = args.indexOf('--sequence');
const selectedSequenceId = sequenceIndex >= 0 ? args[sequenceIndex + 1] : null;
if (sequenceIndex >= 0 && (!selectedSequenceId || selectedSequenceId.startsWith('--'))) throw new Error('--sequence requires SEQ-NNN.');
if (selectedSequenceId && !/^SEQ-\d{3}$/.test(selectedSequenceId)) throw new Error('--sequence must be SEQ-NNN.');
if (!packageArg || [sequenceReady, sequenceComplete, handoff, closure].filter(Boolean).length > 1) throw new Error('Usage: validate-package.mjs <package-path> [--sequence-ready|--sequence-complete] [--sequence SEQ-NNN] | [--handoff|--closure]');

const packageRoot = resolve(packageArg);
const frameworkRoot = resolve('plans/diagnose-implementing');
const decisionVocabularyPath = resolve('governance/contracts/decision-vocabulary.json');
if (!packageRoot.startsWith(`${frameworkRoot}${sep}`)) throw new Error('Package path must be under plans/diagnose-implementing/.');
if (basename(packageRoot) === '_template') throw new Error('Validate a generated package, not _template.');

async function exists(path) { try { await access(path, constants.F_OK); return true; } catch { return false; } }
function isSha(value) { return /^[0-9a-f]{40}$/i.test(value ?? ''); }
function isUnsetOrSha(value) { return value === 'UNSET' || isSha(value); }
function yes(value) { return value === 'YES'; }
function meta(text) {
  const out = {};
  const header = text.split(/\r?\n##\s+/)[0];
  for (const line of header.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
function unresolved(text) { return [...new Set([...text.matchAll(/__[A-Z0-9_]+__/g)].map((m) => m[0]))]; }
function splitIds(value) { return !value || value === 'NONE' ? [] : value.split(',').map((x) => x.trim()).filter(Boolean); }
function requireHeading(v, file, text, heading) { if (!text.includes(heading)) v.push(`${file}: MISSING_SECTION ${heading}`); }
function registryHas(overview, id, filename) {
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\|\\s*${id}\\s*\\|\\s*\`${escaped}\`\\s*\\|`).test(overview);
}

const violations = [];
if (!(await exists(packageRoot)) || !(await stat(packageRoot)).isDirectory()) throw new Error('Package path must be an existing directory.');
const entries = await readdir(packageRoot, { withFileTypes: true });
for (const entry of entries) if (entry.isDirectory()) violations.push(`UNEXPECTED_DIRECTORY ${entry.name}: V2 package is flat.`);
const files = entries.filter((e) => e.isFile()).map((e) => e.name);
for (const file of files) if (file !== '00-OVERVIEW.md' && !/^\d{3}-[a-z0-9-]+\.md$/.test(file)) violations.push(`UNEXPECTED_FILE ${file}`);

const overviewPath = resolve(packageRoot, '00-OVERVIEW.md');
const overviewText = await exists(overviewPath) ? await readFile(overviewPath, 'utf8') : '';
if (!overviewText) violations.push('00-OVERVIEW.md: MISSING_REQUIRED_FILE');
const overview = meta(overviewText);
const unresolvedOverview = unresolved(overviewText);
if (unresolvedOverview.length) violations.push(`00-OVERVIEW.md: UNRESOLVED_TEMPLATE_MARKERS ${unresolvedOverview.join(',')}`);
if (overview.PACKAGE_SCHEMA !== 'BTHWANI_TASK_PACKAGE_V2') violations.push('00-OVERVIEW.md: PACKAGE_SCHEMA_INVALID');
if (!/^PKG-[A-Z0-9_]+$/.test(overview.TASK_ID ?? '')) violations.push('00-OVERVIEW.md: TASK_ID_INVALID');
if (!['PREPARE_ONLY','EXECUTE_END_TO_END'].includes(overview.MODE)) violations.push('00-OVERVIEW.md: MODE_INVALID');
for (const field of ['START_SHA','CURRENT_SHA','LATEST_RECONCILED_SHA']) if (!isSha(overview[field])) violations.push(`00-OVERVIEW.md: ${field}_INVALID`);
for (const field of ['FINAL_CANDIDATE_SHA','HEAD_AT_REVIEW_START','HEAD_AT_DECISION']) if (!isUnsetOrSha(overview[field])) violations.push(`00-OVERVIEW.md: ${field}_INVALID`);
for (const field of ['FINDINGS_ACCOUNTED','SCOPE_DELTAS_ACCOUNTED','DECISIONS_ACCOUNTED','CONSUMERS_ACCOUNTED','EVIDENCE_ACCOUNTED','CLEANUP_ACCOUNTED','ACCOUNTING_COMPLETE','DISCOVERY_COMPLETE','DIAGNOSIS_COMPLETE','DECISION_COMPLETE','COVERAGE_COMPLETE','PACKAGE_READY','IMPLEMENTATION_COMPLETE','EVIDENCE_COMPLETE','CLEANUP_COMPLETE','GOVERNANCE_SYNC_COMPLETE','FRESH_HEAD_VALID','FINAL_ADVERSARIAL_PASS']) if (!['YES','NO'].includes(overview[field])) violations.push(`00-OVERVIEW.md: ${field}_MUST_BE_YES_OR_NO`);
if (!overview.INTEGRATION_OWNER) violations.push('00-OVERVIEW.md: INTEGRATION_OWNER_REQUIRED');
for (const h of ['## 1. Truth Baseline','## 2. Macro Blueprint / Dependency Graph','## 3. Sequence Registry / Execution Frontier','## 4. Global Decisions / Blockers','## 5. Global Accounting / Coverage / Reconciliation','## 6. Final Target Handoff / Closure']) requireHeading(violations,'00-OVERVIEW.md',overviewText,h);

const seqFiles = files.filter((f) => /^\d{3}-[a-z0-9-]+\.md$/.test(f)).sort();
const allowedStatuses = new Set(['DIAGNOSING','DECISION_REQUIRED','SOLUTION_READY','READY_TO_EXECUTE','EXECUTING','VERIFYING','SUSPENDED_BY_DEPENDENCY','REOPENED','BLOCKED_EXTERNAL','PREPARED','COMPLETE']);
const records = [];
for (let i = 0; i < seqFiles.length; i += 1) {
  const filename = seqFiles[i];
  const order = String(i + 1).padStart(3,'0');
  if (!filename.startsWith(`${order}-`)) violations.push(`${filename}: NON_CONTIGUOUS_SEQUENCE_ORDER expected ${order}`);
  const text = await readFile(resolve(packageRoot, filename),'utf8');
  const m = meta(text);
  const id = `SEQ-${order}`;
  if (m.SEQUENCE_ID !== id) violations.push(`${filename}: SEQUENCE_ID_INVALID expected ${id}`);
  if (m.SEQUENCE_ORDER !== order) violations.push(`${filename}: SEQUENCE_ORDER_INVALID expected ${order}`);
  for (const field of ['TASK_ID','REPOSITORY','BRANCH','MODE']) if ((m[field] ?? '') !== (overview[field] ?? '')) violations.push(`${filename}: ${field}_MISMATCH`);
  for (const field of ['BASE_SHA','RECONCILED_HEAD_SHA']) if (!isSha(m[field])) violations.push(`${filename}: ${field}_INVALID`);
  if (!m.DERIVATION_BASIS) violations.push(`${filename}: DERIVATION_BASIS_REQUIRED`);
  if (!allowedStatuses.has(m.SEQUENCE_STATUS)) violations.push(`${filename}: SEQUENCE_STATUS_INVALID ${m.SEQUENCE_STATUS ?? '<missing>'}`);
  if (!['UNPROVEN','SERIAL_REQUIRED','PROVEN_INDEPENDENT'].includes(m.PARALLEL_SAFETY)) violations.push(`${filename}: PARALLEL_SAFETY_INVALID`);
  if (!m.CONFLICT_DOMAIN) violations.push(`${filename}: CONFLICT_DOMAIN_REQUIRED`);
  if (!m.EXECUTION_OWNER) violations.push(`${filename}: EXECUTION_OWNER_REQUIRED`);
  for (const field of ['ROOT_CAUSE_PROVEN','DECISIONS_RESOLVED','DECISION_IMPACT_PROPAGATED','REDIAGNOSIS_COMPLETE','IMPACT_MAPPED','FINDINGS_DISPOSITIONED','DEPENDENCIES_DISPOSITIONED','VERIFICATION_DEFINED','SOLUTION_READY','IMPLEMENTATION_COMPLETE','CONSUMERS_RECONCILED','LOCAL_CLEANUP_COMPLETE','VERIFICATION_PASS','SCOPE_DELTA_CLASSIFIED']) if (!['YES','NO'].includes(m[field])) violations.push(`${filename}: ${field}_MUST_BE_YES_OR_NO`);
  if (!['YES','NO','NOT_APPLICABLE'].includes(m.GOVERNANCE_SYNC)) violations.push(`${filename}: GOVERNANCE_SYNC_INVALID`);
  for (const h of ['## 1. Scope / Context / Graph Position','## 2. Diagnosis / Findings / Disposition','## 3. Root Cause / Blast Radius','## 4. Decisions / Impact Propagation / Re-Diagnosis','## 5. Exact Target State / Coherent Cutover','## 6. Treatment / Execution','## 7. Consumers / Contracts / Data / Governance','## 8. Cleanup','## 9. Verification / Runtime / Evidence','## 10. Sequence Exit / Suspension / Reopen']) requireHeading(violations,filename,text,h);
  if (!registryHas(overviewText,id,filename)) violations.push(`${filename}: MISSING_OVERVIEW_REGISTRY_ROW`);
  records.push({ filename, metadata:m });
}

const byId = new Map(records.map((r) => [r.metadata.SEQUENCE_ID,r]));
const frontier = splitIds(overview.ACTIVE_EXECUTION_FRONTIER);
for (const id of frontier) if (!byId.has(id)) violations.push(`ACTIVE_EXECUTION_FRONTIER_UNKNOWN ${id}`);
const activeStatuses = new Set(['DIAGNOSING','DECISION_REQUIRED','SOLUTION_READY','READY_TO_EXECUTE','EXECUTING','VERIFYING','REOPENED']);
const parkedStatuses = new Set(['SUSPENDED_BY_DEPENDENCY','BLOCKED_EXTERNAL']);
for (const record of records) {
  const m = record.metadata;
  const listed = frontier.includes(m.SEQUENCE_ID);
  if (activeStatuses.has(m.SEQUENCE_STATUS) && !listed) violations.push(`${record.filename}: ACTIVE_NONTERMINAL_MISSING_FROM_FRONTIER`);
  if (parkedStatuses.has(m.SEQUENCE_STATUS) && listed) violations.push(`${record.filename}: PARKED_SEQUENCE_MUST_NOT_BE_IN_ACTIVE_FRONTIER`);
}
const frontierRecords = frontier.map((id) => byId.get(id)).filter(Boolean);
const writeLive = frontierRecords.filter((r) => ['READY_TO_EXECUTE','EXECUTING','VERIFYING'].includes(r.metadata.SEQUENCE_STATUS));
const conflictOwners = new Map();
for (const record of writeLive) {
  const m = record.metadata;
  if (m.CONFLICT_DOMAIN === 'UNCLASSIFIED') violations.push(`${record.filename}: LIVE_WRITE_CONFLICT_DOMAIN_UNCLASSIFIED`);
  if (m.EXECUTION_OWNER === 'UNASSIGNED') violations.push(`${record.filename}: LIVE_WRITE_EXECUTION_OWNER_UNASSIGNED`);
  const existing = conflictOwners.get(m.CONFLICT_DOMAIN);
  if (existing) violations.push(`CONFLICT_DOMAIN_PARALLEL_WRITE ${m.CONFLICT_DOMAIN}: ${existing} <> ${m.SEQUENCE_ID}`);
  conflictOwners.set(m.CONFLICT_DOMAIN,m.SEQUENCE_ID);
}
if (writeLive.length > 1) for (const r of writeLive) if (r.metadata.PARALLEL_SAFETY !== 'PROVEN_INDEPENDENT') violations.push(`${r.filename}: MULTI_FRONTIER_LIVE_WRITE_REQUIRES_PARALLEL_SAFETY=PROVEN_INDEPENDENT`);

function selectedRecord(label) {
  if (selectedSequenceId) {
    const record = byId.get(selectedSequenceId);
    if (!record) violations.push(`${label}: SELECTED_SEQUENCE_NOT_FOUND ${selectedSequenceId}`);
    return record;
  }
  if (frontier.length !== 1) { violations.push(`${label}: REQUIRE --sequence SEQ-NNN WHEN FRONTIER_SIZE=${frontier.length}`); return null; }
  return byId.get(frontier[0]);
}
function requireCommon(label, record) {
  if (!record) { violations.push(`${label}: SEQUENCE_REQUIRED`); return; }
  for (const field of ['ROOT_CAUSE_PROVEN','DECISIONS_RESOLVED','DECISION_IMPACT_PROPAGATED','REDIAGNOSIS_COMPLETE','IMPACT_MAPPED','FINDINGS_DISPOSITIONED','DEPENDENCIES_DISPOSITIONED','VERIFICATION_DEFINED','SOLUTION_READY']) if (!yes(record.metadata[field])) violations.push(`${record.filename}: ${label}_${field}_NOT_PASS`);
}
function requireTerminal(label, record) {
  requireCommon(label,record); if (!record) return; const m=record.metadata;
  if (overview.MODE === 'PREPARE_ONLY') {
    if (m.SEQUENCE_STATUS !== 'PREPARED') violations.push(`${record.filename}: ${label}_REQUIRES_PREPARED`);
    if (yes(m.IMPLEMENTATION_COMPLETE)) violations.push(`${record.filename}: PREPARE_ONLY_IMPLEMENTATION_COMPLETE_FORBIDDEN`);
  } else {
    if (m.SEQUENCE_STATUS !== 'COMPLETE') violations.push(`${record.filename}: ${label}_REQUIRES_COMPLETE`);
    for (const f of ['IMPLEMENTATION_COMPLETE','CONSUMERS_RECONCILED','LOCAL_CLEANUP_COMPLETE','VERIFICATION_PASS','SCOPE_DELTA_CLASSIFIED']) if (!yes(m[f])) violations.push(`${record.filename}: ${label}_${f}_NOT_PASS`);
    if (!['YES','NOT_APPLICABLE'].includes(m.GOVERNANCE_SYNC)) violations.push(`${record.filename}: ${label}_GOVERNANCE_SYNC_NOT_PASS`);
  }
}
function requireAccounting(label) {
  for (const f of ['FINDINGS_ACCOUNTED','SCOPE_DELTAS_ACCOUNTED','DECISIONS_ACCOUNTED','CONSUMERS_ACCOUNTED','EVIDENCE_ACCOUNTED','CLEANUP_ACCOUNTED','ACCOUNTING_COMPLETE']) if (!yes(overview[f])) violations.push(`00-OVERVIEW.md: ${label}_${f}_NOT_PASS`);
}
function requireGlobal(label) {
  for (const f of ['DISCOVERY_COMPLETE','DIAGNOSIS_COMPLETE','DECISION_COMPLETE','COVERAGE_COMPLETE','PACKAGE_READY']) if (!yes(overview[f])) violations.push(`00-OVERVIEW.md: ${label}_${f}_NOT_PASS`);
  requireAccounting(label);
}

if (sequenceReady) {
  const r = selectedRecord('SEQUENCE_READY');
  requireCommon('SEQUENCE_READY',r);
  if (r && !frontier.includes(r.metadata.SEQUENCE_ID)) violations.push(`${r.filename}: SEQUENCE_READY_MUST_BE_IN_ACTIVE_FRONTIER`);
  if (r && overview.MODE === 'EXECUTE_END_TO_END' && r.metadata.SEQUENCE_STATUS !== 'READY_TO_EXECUTE') violations.push(`${r.filename}: SEQUENCE_READY_STATUS_INVALID`);
  if (r && r.metadata.RECONCILED_HEAD_SHA !== overview.LATEST_RECONCILED_SHA) violations.push(`${r.filename}: RECONCILED_HEAD_SHA_MUST_EQUAL_OVERVIEW_LATEST_RECONCILED_SHA`);
  if (r && overview.MODE === 'EXECUTE_END_TO_END') {
    if (r.metadata.CONFLICT_DOMAIN === 'UNCLASSIFIED') violations.push(`${r.filename}: SEQUENCE_READY_CONFLICT_DOMAIN_UNCLASSIFIED`);
    if (r.metadata.EXECUTION_OWNER === 'UNASSIGNED') violations.push(`${r.filename}: SEQUENCE_READY_EXECUTION_OWNER_UNASSIGNED`);
  }
}
if (sequenceComplete) {
  const r = selectedRecord('SEQUENCE_COMPLETE');
  if (r && !frontier.includes(r.metadata.SEQUENCE_ID)) violations.push(`${r.filename}: SEQUENCE_COMPLETE_MUST_BE_IN_ACTIVE_FRONTIER_UNTIL_REGISTRY_CLEAR`);
  requireTerminal('SEQUENCE_COMPLETE',r);
}

let vocab=null;
if (await exists(decisionVocabularyPath)) { try { vocab=JSON.parse(await readFile(decisionVocabularyPath,'utf8')); } catch(e){ violations.push(`decision-vocabulary: INVALID_JSON ${e.message}`); } } else violations.push('decision-vocabulary: MISSING');
const canonical = new Set((vocab?.canonicalDecisions ?? []).map((x)=>x.id));
const closed = vocab?.closureRules?.closedDecision;
if (overview.FINAL_DECISION && !canonical.has(overview.FINAL_DECISION)) violations.push(`00-OVERVIEW.md: FINAL_DECISION_NOT_CANONICAL ${overview.FINAL_DECISION}`);

if (handoff) {
  if (overview.MODE !== 'PREPARE_ONLY') violations.push('HANDOFF_REQUIRES_PREPARE_ONLY');
  if (frontier.length) violations.push('HANDOFF_REQUIRES_EMPTY_ACTIVE_EXECUTION_FRONTIER');
  requireGlobal('HANDOFF');
  if (overview.LIFECYCLE_STATE !== 'PREPARED') violations.push('HANDOFF_REQUIRES_LIFECYCLE_STATE=PREPARED');
  for (const r of records) if (r.metadata.SEQUENCE_STATUS !== 'PREPARED') violations.push(`${r.filename}: HANDOFF_REQUIRES_PREPARED`);
}
if (closure) {
  if (overview.MODE !== 'EXECUTE_END_TO_END') violations.push('CLOSURE_REQUIRES_EXECUTE_END_TO_END');
  if (frontier.length) violations.push('CLOSURE_REQUIRES_EMPTY_ACTIVE_EXECUTION_FRONTIER');
  requireGlobal('CLOSURE');
  for (const f of ['IMPLEMENTATION_COMPLETE','EVIDENCE_COMPLETE','CLEANUP_COMPLETE','GOVERNANCE_SYNC_COMPLETE','FRESH_HEAD_VALID','FINAL_ADVERSARIAL_PASS']) if (!yes(overview[f])) violations.push(`00-OVERVIEW.md: CLOSURE_${f}_NOT_PASS`);
  for (const r of records) if (r.metadata.SEQUENCE_STATUS !== 'COMPLETE') violations.push(`${r.filename}: CLOSURE_REQUIRES_COMPLETE`);
  if (overview.LIFECYCLE_STATE !== 'CLOSED') violations.push('CLOSURE_REQUIRES_LIFECYCLE_STATE=CLOSED');
  for (const f of ['FINAL_CANDIDATE_SHA','HEAD_AT_REVIEW_START','HEAD_AT_DECISION']) if (!isSha(overview[f])) violations.push(`00-OVERVIEW.md: ${f}_INVALID_FOR_CLOSURE`);
  if (overview.FINAL_CANDIDATE_SHA !== overview.HEAD_AT_DECISION) violations.push('FINAL_CANDIDATE_SHA_MUST_EQUAL_HEAD_AT_DECISION');
  if (!closed || overview.FINAL_DECISION !== closed) violations.push(`FINAL_DECISION_MUST_EQUAL_GOVERNED_CLOSED_DECISION ${closed ?? '<missing>'}`);
}

if (violations.length) {
  console.error(`PACKAGE VALIDATION: FAIL (${violations.length})`);
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
}
const suffix = closure?' --closure':handoff?' --handoff':sequenceComplete?' --sequence-complete':sequenceReady?' --sequence-ready':'';
console.log(`PACKAGE VALIDATION: PASS${suffix}`);
console.log('Proof limit: structural/accounting/sequence-gate consistency only; not Product/Runtime correctness.');
