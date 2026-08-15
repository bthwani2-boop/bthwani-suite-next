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
const modeFlags = [sequenceReady, sequenceComplete, handoff, closure].filter(Boolean).length;
if (!packageArg || modeFlags > 1) throw new Error('Usage: validate-package.mjs <package-path> [--sequence-ready|--sequence-complete|--handoff|--closure]');

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
    const match = /^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}
function requireHeading(violations, file, text, heading) {
  if (!text.includes(heading)) violations.push(`${file}: MISSING_SECTION ${heading}`);
}
function unresolvedMarkers(text) { return [...new Set([...text.matchAll(/__[A-Z0-9_]+__/g)].map((m) => m[0]))]; }
function registryHas(overview, sequenceId, filename) {
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\|\\s*${sequenceId}\\s*\\|\\s*\`${escaped}\`\\s*\\|`).test(overview);
}

const violations = [];
if (!(await exists(packageRoot)) || !(await stat(packageRoot)).isDirectory()) throw new Error('Package path must be an existing directory.');
const entries = await readdir(packageRoot, { withFileTypes: true });
for (const entry of entries) if (entry.isDirectory()) violations.push(`UNEXPECTED_DIRECTORY ${entry.name}: V2 package is flat; use sequence files, not domain trees.`);

const overviewPath = resolve(packageRoot, '00-OVERVIEW.md');
if (!(await exists(overviewPath))) violations.push('00-OVERVIEW.md: MISSING_REQUIRED_FILE');
const overviewText = await exists(overviewPath) ? await readFile(overviewPath, 'utf8') : '';
const overview = meta(overviewText);
const allowedFiles = entries.filter((e) => e.isFile()).map((e) => e.name);
for (const file of allowedFiles) if (file !== '00-OVERVIEW.md' && !/^\d{3}-[a-z0-9-]+\.md$/.test(file)) violations.push(`UNEXPECTED_FILE ${file}: expected 00-OVERVIEW.md or NNN-<sequence>.md`);

const unresolvedOverview = unresolvedMarkers(overviewText);
if (unresolvedOverview.length) violations.push(`00-OVERVIEW.md: UNRESOLVED_TEMPLATE_MARKERS ${unresolvedOverview.join(',')}`);
if (/-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(overviewText)) violations.push('00-OVERVIEW.md: PRIVATE_KEY_MATERIAL_FORBIDDEN');
if (overview.PACKAGE_SCHEMA !== 'BTHWANI_TASK_PACKAGE_V2') violations.push('00-OVERVIEW.md: PACKAGE_SCHEMA_INVALID');
if (!/^PKG-[A-Z0-9_]+$/.test(overview.TASK_ID ?? '')) violations.push('00-OVERVIEW.md: TASK_ID_INVALID');
if (!overview.TASK_NAME) violations.push('00-OVERVIEW.md: TASK_NAME_REQUIRED');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(overview.REPOSITORY ?? '')) violations.push('00-OVERVIEW.md: REPOSITORY_INVALID');
if (!['PREPARE_ONLY', 'EXECUTE_END_TO_END'].includes(overview.MODE)) violations.push('00-OVERVIEW.md: MODE_INVALID');
if (overview.ORCHESTRATOR_PATH !== 'tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md') violations.push('00-OVERVIEW.md: ORCHESTRATOR_PATH_INVALID');
for (const field of ['START_SHA', 'CURRENT_SHA']) if (!isSha(overview[field])) violations.push(`00-OVERVIEW.md: ${field}_INVALID`);
for (const field of ['FINAL_CANDIDATE_SHA', 'HEAD_AT_REVIEW_START', 'HEAD_AT_DECISION']) if (!isUnsetOrSha(overview[field])) violations.push(`00-OVERVIEW.md: ${field}_INVALID`);
const allowedLifecycle = new Set(['OPEN', 'PREPARED', 'EXECUTING', 'VERIFYING', 'BLOCKED', 'CLOSED']);
if (!allowedLifecycle.has(overview.LIFECYCLE_STATE)) violations.push(`00-OVERVIEW.md: LIFECYCLE_STATE_INVALID ${overview.LIFECYCLE_STATE ?? '<missing>'}`);
for (const heading of ['## 1. Truth Baseline','## 2. Macro Blueprint / Dependency Graph','## 3. Sequence Registry','## 4. Global Decisions / Blockers','## 5. Global Coverage / Reconciliation','## 6. Final Target Handoff / Closure']) requireHeading(violations, '00-OVERVIEW.md', overviewText, heading);

const sequenceFiles = allowedFiles.filter((name) => /^\d{3}-[a-z0-9-]+\.md$/.test(name)).sort();
const sequenceRecords = [];
const allowedSequenceStatuses = new Set(['DIAGNOSING','DECISION_REQUIRED','SOLUTION_READY','PREPARED','READY_TO_EXECUTE','EXECUTING','VERIFYING','COMPLETE','BLOCKED']);
for (let i = 0; i < sequenceFiles.length; i += 1) {
  const filename = sequenceFiles[i];
  const expectedOrder = String(i + 1).padStart(3, '0');
  if (!filename.startsWith(`${expectedOrder}-`)) violations.push(`${filename}: NON_CONTIGUOUS_SEQUENCE_ORDER expected ${expectedOrder}`);
  const text = await readFile(resolve(packageRoot, filename), 'utf8');
  const metadata = meta(text);
  const expectedId = `SEQ-${expectedOrder}`;
  const unresolved = unresolvedMarkers(text);
  if (unresolved.length) violations.push(`${filename}: UNRESOLVED_TEMPLATE_MARKERS ${unresolved.join(',')}`);
  if (/-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(text)) violations.push(`${filename}: PRIVATE_KEY_MATERIAL_FORBIDDEN`);
  for (const field of ['TASK_ID','REPOSITORY','BRANCH','MODE']) if ((metadata[field] ?? '') !== (overview[field] ?? '')) violations.push(`${filename}: ${field}_MISMATCH`);
  if (metadata.SEQUENCE_ID !== expectedId) violations.push(`${filename}: SEQUENCE_ID_INVALID expected ${expectedId}`);
  if (metadata.SEQUENCE_ORDER !== expectedOrder) violations.push(`${filename}: SEQUENCE_ORDER_INVALID expected ${expectedOrder}`);
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(metadata.SEQUENCE_NAME ?? '')) violations.push(`${filename}: SEQUENCE_NAME_INVALID`);
  if (!isSha(metadata.BASE_SHA)) violations.push(`${filename}: BASE_SHA_INVALID`);
  if (!metadata.DERIVATION_BASIS) violations.push(`${filename}: DERIVATION_BASIS_REQUIRED`);
  if (!allowedSequenceStatuses.has(metadata.SEQUENCE_STATUS)) violations.push(`${filename}: SEQUENCE_STATUS_INVALID ${metadata.SEQUENCE_STATUS ?? '<missing>'}`);
  for (const field of ['ROOT_CAUSE_PROVEN','DECISIONS_RESOLVED','REDIAGNOSIS_COMPLETE','IMPACT_MAPPED','VERIFICATION_DEFINED','SOLUTION_READY','IMPLEMENTATION_COMPLETE','CONSUMERS_RECONCILED','LOCAL_CLEANUP_COMPLETE','VERIFICATION_PASS','SCOPE_DELTA_CLASSIFIED']) if (!['YES','NO'].includes(metadata[field])) violations.push(`${filename}: ${field}_MUST_BE_YES_OR_NO`);
  if (!['YES','NO','NOT_APPLICABLE'].includes(metadata.GOVERNANCE_SYNC)) violations.push(`${filename}: GOVERNANCE_SYNC_INVALID`);
  for (const heading of ['## 1. Scope / Context','## 2. Diagnosis / Findings','## 3. Root Cause / Blast Radius','## 4. Decisions / Re-Diagnosis','## 5. Exact Target State','## 6. Treatment / Execution','## 7. Consumers / Contracts / Data / Governance','## 8. Cleanup','## 9. Verification / Runtime / Evidence','## 10. Sequence Exit Gate / Reopen']) requireHeading(violations, filename, text, heading);
  if (!registryHas(overviewText, expectedId, filename)) violations.push(`${filename}: MISSING_OVERVIEW_REGISTRY_ROW`);
  sequenceRecords.push({ filename, metadata });
}

const nonTerminal = sequenceRecords.filter(({metadata}) => overview.MODE === 'PREPARE_ONLY' ? metadata.SEQUENCE_STATUS !== 'PREPARED' : metadata.SEQUENCE_STATUS !== 'COMPLETE');
if (nonTerminal.length > 1) violations.push(`MULTIPLE_ACTIVE_SEQUENCES ${nonTerminal.map((x) => x.metadata.SEQUENCE_ID).join(',')}: future sequences must not be pre-created.`);
if (overview.CURRENT_SEQUENCE_ID === 'UNSET') {
  if (nonTerminal.length) violations.push(`CURRENT_SEQUENCE_ID_UNSET_BUT_NONTERMINAL_SEQUENCE_EXISTS ${nonTerminal[0].metadata.SEQUENCE_ID}`);
} else {
  const current = sequenceRecords.find((x) => x.metadata.SEQUENCE_ID === overview.CURRENT_SEQUENCE_ID);
  if (!current) violations.push(`CURRENT_SEQUENCE_ID_NOT_FOUND ${overview.CURRENT_SEQUENCE_ID}`);
  if (nonTerminal.length === 1 && nonTerminal[0].metadata.SEQUENCE_ID !== overview.CURRENT_SEQUENCE_ID) violations.push('CURRENT_SEQUENCE_ID_DOES_NOT_MATCH_ACTIVE_SEQUENCE');
}

let decisionVocabulary = null;
if (!(await exists(decisionVocabularyPath))) violations.push('governance/contracts/decision-vocabulary.json: MISSING_DECISION_VOCABULARY');
else { try { decisionVocabulary = JSON.parse(await readFile(decisionVocabularyPath, 'utf8')); } catch (error) { violations.push(`governance/contracts/decision-vocabulary.json: INVALID_JSON ${error.message}`); } }
const canonicalDecisions = new Set((decisionVocabulary?.canonicalDecisions ?? []).map((item) => item.id));
const closedDecision = decisionVocabulary?.closureRules?.closedDecision;
if (!closedDecision || !canonicalDecisions.has(closedDecision)) violations.push('DECISION_VOCABULARY_CLOSED_DECISION_INVALID');
if (overview.FINAL_DECISION && !canonicalDecisions.has(overview.FINAL_DECISION)) violations.push(`00-OVERVIEW.md: FINAL_DECISION_NOT_CANONICAL ${overview.FINAL_DECISION}`);

function currentSequence() { return sequenceRecords.find((x) => x.metadata.SEQUENCE_ID === overview.CURRENT_SEQUENCE_ID); }
function requireSolutionReady(label, record) {
  if (!record) { violations.push(`${label}: CURRENT_SEQUENCE_REQUIRED`); return; }
  for (const field of ['ROOT_CAUSE_PROVEN','DECISIONS_RESOLVED','REDIAGNOSIS_COMPLETE','IMPACT_MAPPED','VERIFICATION_DEFINED','SOLUTION_READY']) if (!yes(record.metadata[field])) violations.push(`${record.filename}: ${label}_${field}_NOT_PASS`);
}
function requireModeTerminal(label, record) {
  requireSolutionReady(label, record);
  if (!record) return;
  const m = record.metadata;
  if (overview.MODE === 'PREPARE_ONLY') {
    if (m.SEQUENCE_STATUS !== 'PREPARED') violations.push(`${record.filename}: ${label}_REQUIRES_SEQUENCE_STATUS=PREPARED`);
    if (yes(m.IMPLEMENTATION_COMPLETE)) violations.push(`${record.filename}: PREPARE_ONLY_CANNOT_CLAIM_IMPLEMENTATION_COMPLETE`);
  } else {
    if (m.SEQUENCE_STATUS !== 'COMPLETE') violations.push(`${record.filename}: ${label}_REQUIRES_SEQUENCE_STATUS=COMPLETE`);
    for (const field of ['IMPLEMENTATION_COMPLETE','CONSUMERS_RECONCILED','LOCAL_CLEANUP_COMPLETE','VERIFICATION_PASS','SCOPE_DELTA_CLASSIFIED']) if (!yes(m[field])) violations.push(`${record.filename}: ${label}_${field}_NOT_PASS`);
    if (!['YES','NOT_APPLICABLE'].includes(m.GOVERNANCE_SYNC)) violations.push(`${record.filename}: ${label}_GOVERNANCE_SYNC_NOT_PASS`);
  }
}
function requireGlobalGates(label) { for (const field of ['DISCOVERY_COMPLETE','DIAGNOSIS_COMPLETE','DECISION_COMPLETE','COVERAGE_COMPLETE','PACKAGE_READY']) if (!yes(overview[field])) violations.push(`00-OVERVIEW.md: ${label}_${field}_NOT_PASS`); }

if (sequenceReady) {
  const record = currentSequence(); requireSolutionReady('SEQUENCE_READY', record);
  if (record) {
    if (overview.MODE === 'PREPARE_ONLY' && !['SOLUTION_READY','PREPARED'].includes(record.metadata.SEQUENCE_STATUS)) violations.push(`${record.filename}: PREPARE_SEQUENCE_READY_STATUS_INVALID`);
    if (overview.MODE === 'EXECUTE_END_TO_END' && record.metadata.SEQUENCE_STATUS !== 'READY_TO_EXECUTE') violations.push(`${record.filename}: EXECUTE_SEQUENCE_READY_REQUIRES_STATUS=READY_TO_EXECUTE`);
  }
}
if (sequenceComplete) requireModeTerminal('SEQUENCE_COMPLETE', currentSequence());
if (handoff) {
  if (overview.MODE !== 'PREPARE_ONLY') violations.push('HANDOFF_REQUIRES_PREPARE_ONLY');
  if (overview.CURRENT_SEQUENCE_ID !== 'UNSET') violations.push('HANDOFF_REQUIRES_CURRENT_SEQUENCE_ID=UNSET');
  requireGlobalGates('HANDOFF');
  if (overview.LIFECYCLE_STATE !== 'PREPARED') violations.push('HANDOFF_REQUIRES_LIFECYCLE_STATE=PREPARED');
  if (yes(overview.IMPLEMENTATION_COMPLETE)) violations.push('PREPARE_ONLY_CANNOT_CLAIM_IMPLEMENTATION_COMPLETE');
  if (overview.FINAL_DECISION) violations.push('PREPARE_ONLY_MUST_NOT_ISSUE_FINAL_PRODUCT_DECISION');
  for (const record of sequenceRecords) if (record.metadata.SEQUENCE_STATUS !== 'PREPARED') violations.push(`${record.filename}: HANDOFF_REQUIRES_PREPARED`);
}
if (closure) {
  if (overview.MODE !== 'EXECUTE_END_TO_END') violations.push('CLOSURE_REQUIRES_EXECUTE_END_TO_END');
  if (overview.CURRENT_SEQUENCE_ID !== 'UNSET') violations.push('CLOSURE_REQUIRES_CURRENT_SEQUENCE_ID=UNSET');
  requireGlobalGates('CLOSURE');
  for (const field of ['IMPLEMENTATION_COMPLETE','EVIDENCE_COMPLETE','CLEANUP_COMPLETE','GOVERNANCE_SYNC_COMPLETE','FRESH_HEAD_VALID','FINAL_ADVERSARIAL_PASS']) if (!yes(overview[field])) violations.push(`00-OVERVIEW.md: CLOSURE_${field}_NOT_PASS`);
  for (const record of sequenceRecords) if (record.metadata.SEQUENCE_STATUS !== 'COMPLETE') violations.push(`${record.filename}: CLOSURE_REQUIRES_COMPLETE`);
  if (overview.LIFECYCLE_STATE !== 'CLOSED') violations.push('CLOSURE_REQUIRES_LIFECYCLE_STATE=CLOSED');
  for (const field of ['FINAL_CANDIDATE_SHA','HEAD_AT_REVIEW_START','HEAD_AT_DECISION']) if (!isSha(overview[field])) violations.push(`00-OVERVIEW.md: ${field}_INVALID_FOR_CLOSURE`);
  if (overview.FINAL_CANDIDATE_SHA && overview.HEAD_AT_DECISION && overview.FINAL_CANDIDATE_SHA !== overview.HEAD_AT_DECISION) violations.push('FINAL_CANDIDATE_SHA_MUST_EQUAL_HEAD_AT_DECISION');
  if (overview.FINAL_DECISION !== closedDecision) violations.push(`FINAL_DECISION_MUST_EQUAL_GOVERNED_CLOSED_DECISION ${closedDecision ?? '<missing>'}`);
}

if (violations.length) {
  console.error(`PACKAGE VALIDATION: FAIL (${violations.length})`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
const suffix = closure ? ' --closure' : handoff ? ' --handoff' : sequenceComplete ? ' --sequence-complete' : sequenceReady ? ' --sequence-ready' : '';
console.log(`PACKAGE VALIDATION: PASS${suffix}`);
console.log('Proof limit: structural/package/sequence-gate validation only; not Product/Runtime correctness.');
