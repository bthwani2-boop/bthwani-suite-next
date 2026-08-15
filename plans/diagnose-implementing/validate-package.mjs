#!/usr/bin/env node
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const packageArg = args.find((value) => !value.startsWith('--'));
const strict = args.includes('--strict');
const waveComplete = args.includes('--wave-complete');
const closure = args.includes('--closure');
if (!packageArg) throw new Error('Usage: validate-package.mjs <package-path> [--strict] [--wave-complete] [--closure]');

const packageRoot = resolve(packageArg);
const frameworkRoot = resolve('plans/diagnose-implementing');
const decisionVocabularyPath = resolve('governance/contracts/decision-vocabulary.json');
if (!packageRoot.startsWith(`${frameworkRoot}${sep}`)) throw new Error('Package path must be under plans/diagnose-implementing/.');
if (basename(packageRoot) === '_template') throw new Error('Validate a generated package, not _template.');

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

const requiredFiles = ['01-DIAGNOSIS.md', '02-EXECUTION.md', '03-VERIFICATION-CLOSURE.md'];
const allowedLifecycleStates = new Set(['OPEN', 'PREPARED', 'READY_TO_EXECUTE', 'EXECUTING', 'VERIFYING', 'BLOCKED', 'CLOSED']);
const allowedWaveStates = new Set(['NOT_SELECTED', 'DIAGNOSING', 'DECISION_REQUIRED', 'READY_TO_EXECUTE', 'IMPLEMENTING', 'VERIFYING', 'COMPLETE', 'BLOCKED']);
const violations = [];
const texts = {};
for (const file of requiredFiles) {
  const path = resolve(packageRoot, file);
  if (!(await exists(path))) {
    violations.push(`${file}: MISSING_REQUIRED_FILE`);
    continue;
  }
  texts[file] = await readFile(path, 'utf8');
}

if (!(await exists(decisionVocabularyPath))) {
  violations.push('governance/contracts/decision-vocabulary.json: MISSING_DECISION_VOCABULARY');
}
let decisionVocabulary = null;
try {
  if (await exists(decisionVocabularyPath)) decisionVocabulary = JSON.parse(await readFile(decisionVocabularyPath, 'utf8'));
} catch (error) {
  violations.push(`governance/contracts/decision-vocabulary.json: INVALID_JSON ${error.message}`);
}
const canonicalDecisions = new Set((decisionVocabulary?.canonicalDecisions ?? []).map((item) => item.id));
const closedDecision = decisionVocabulary?.closureRules?.closedDecision;
if (!closedDecision || !canonicalDecisions.has(closedDecision)) violations.push('DECISION_VOCABULARY_CLOSED_DECISION_INVALID');

function meta(text) {
  const out = {};
  const header = text.split(/\r?\n##\s+/)[0];
  for (const line of header.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

function requireHeading(file, heading) {
  if (texts[file] && !texts[file].includes(heading)) violations.push(`${file}: MISSING_SECTION ${heading}`);
}

function isSha(value) {
  return /^[0-9a-f]{40}$/i.test(value ?? '');
}

function isUnsetOrSha(value) {
  return value === 'UNSET' || isSha(value);
}

for (const [file, text] of Object.entries(texts)) {
  const unresolved = [...text.matchAll(/__[A-Z0-9_]+__/g)].map((m) => m[0]);
  if (unresolved.length) violations.push(`${file}: UNRESOLVED_TEMPLATE_MARKERS ${[...new Set(unresolved)].join(',')}`);
  if (/-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(text)) violations.push(`${file}: PRIVATE_KEY_MATERIAL_FORBIDDEN`);
}

requireHeading('01-DIAGNOSIS.md', '## 1. Truth Baseline');
requireHeading('01-DIAGNOSIS.md', '## 4. Macro Operational Blueprint');
requireHeading('01-DIAGNOSIS.md', '## 7. Findings Ledger');
requireHeading('01-DIAGNOSIS.md', '## 8. Coverage Ledger');
requireHeading('01-DIAGNOSIS.md', '## 9. Decision Ledger');
requireHeading('01-DIAGNOSIS.md', '## 12. Final Diagnosis Gate');
requireHeading('02-EXECUTION.md', '## 1. Execution Plan');
requireHeading('02-EXECUTION.md', '## 5. Actual Change Ledger');
requireHeading('02-EXECUTION.md', '## 8. Local Cleanup');
requireHeading('03-VERIFICATION-CLOSURE.md', '## 1. Verification Plan');
requireHeading('03-VERIFICATION-CLOSURE.md', '## 2. Evidence Matrix');
requireHeading('03-VERIFICATION-CLOSURE.md', '## 5. Approval / Independent Review');
requireHeading('03-VERIFICATION-CLOSURE.md', '## 6. Final Cleanup / Structural Hygiene');
requireHeading('03-VERIFICATION-CLOSURE.md', '## 7. Governance Reconciliation');
requireHeading('03-VERIFICATION-CLOSURE.md', '## 10. Final Closure Gate');

const diagnosis = meta(texts['01-DIAGNOSIS.md'] ?? '');
const execution = meta(texts['02-EXECUTION.md'] ?? '');
const verification = meta(texts['03-VERIFICATION-CLOSURE.md'] ?? '');

if (diagnosis.PACKAGE_SCHEMA !== 'BTHWANI_TASK_PACKAGE_V1') violations.push('01-DIAGNOSIS.md: PACKAGE_SCHEMA_INVALID');
if (!/^PKG-[A-Z0-9_]+$/.test(diagnosis.TASK_ID ?? '')) violations.push('01-DIAGNOSIS.md: TASK_ID_INVALID');
if (!diagnosis.TASK_NAME) violations.push('01-DIAGNOSIS.md: TASK_NAME_REQUIRED');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(diagnosis.REPOSITORY ?? '')) violations.push('01-DIAGNOSIS.md: REPOSITORY_INVALID');
if (!['PREPARE_ONLY', 'EXECUTE_END_TO_END'].includes(diagnosis.MODE)) violations.push('01-DIAGNOSIS.md: MODE_INVALID');
if (diagnosis.ORCHESTRATOR_PATH !== 'tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md') violations.push('01-DIAGNOSIS.md: ORCHESTRATOR_PATH_INVALID');
for (const field of ['START_SHA', 'CURRENT_SHA']) {
  if (!isSha(diagnosis[field])) violations.push(`01-DIAGNOSIS.md: ${field}_INVALID`);
}
for (const [file, metadata] of [['02-EXECUTION.md', execution], ['03-VERIFICATION-CLOSURE.md', verification]]) {
  for (const field of ['TASK_ID', 'REPOSITORY', 'BRANCH', 'MODE']) {
    if ((metadata[field] ?? '') !== (diagnosis[field] ?? '')) violations.push(`${file}: ${field}_MISMATCH`);
  }
}

if (!isUnsetOrSha(execution.PACKAGE_READY_BASE_SHA)) violations.push('02-EXECUTION.md: PACKAGE_READY_BASE_SHA_INVALID');
if (!isSha(execution.CURRENT_WORK_BASE_SHA)) violations.push('02-EXECUTION.md: CURRENT_WORK_BASE_SHA_INVALID');
if (!isUnsetOrSha(execution.CURRENT_WAVE_BASE_SHA)) violations.push('02-EXECUTION.md: CURRENT_WAVE_BASE_SHA_INVALID');
if (!allowedWaveStates.has(execution.CURRENT_WAVE_STATUS)) violations.push(`02-EXECUTION.md: CURRENT_WAVE_STATUS_INVALID ${execution.CURRENT_WAVE_STATUS ?? '<missing>'}`);
if (!allowedLifecycleStates.has(verification.LIFECYCLE_STATE)) violations.push(`03-VERIFICATION-CLOSURE.md: LIFECYCLE_STATE_INVALID ${verification.LIFECYCLE_STATE ?? '<missing>'}`);
if (verification.FINAL_DECISION && !canonicalDecisions.has(verification.FINAL_DECISION)) violations.push(`03-VERIFICATION-CLOSURE.md: FINAL_DECISION_NOT_CANONICAL ${verification.FINAL_DECISION}`);

const yes = (value) => value === 'YES';
const yesNo = (value) => value === 'YES' || value === 'NO';
for (const field of [
  'CURRENT_WAVE_ROOT_CAUSE_PROVEN',
  'CURRENT_WAVE_DECISIONS_RESOLVED',
  'CURRENT_WAVE_REDIAGNOSIS_COMPLETE',
  'CURRENT_WAVE_IMPACT_MAPPED',
  'CURRENT_WAVE_VERIFICATION_DEFINED',
  'CURRENT_WAVE_READY_TO_EXECUTE',
  'CURRENT_WAVE_IMPLEMENTATION_COMPLETE',
  'CURRENT_WAVE_CONSUMERS_RECONCILED',
  'CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE',
  'CURRENT_WAVE_VERIFICATION_PASS',
  'CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED',
]) {
  if (!yesNo(execution[field])) violations.push(`02-EXECUTION.md: ${field}_MUST_BE_YES_OR_NO`);
}
if (!['YES', 'NO', 'NOT_APPLICABLE'].includes(execution.CURRENT_WAVE_GOVERNANCE_SYNC)) {
  violations.push('02-EXECUTION.md: CURRENT_WAVE_GOVERNANCE_SYNC_INVALID');
}

function requireGlobalDiagnosisGates(label) {
  for (const field of ['DISCOVERY_COMPLETE', 'DIAGNOSIS_COMPLETE', 'DECISION_COMPLETE', 'COVERAGE_COMPLETE', 'PACKAGE_READY']) {
    if (!yes(diagnosis[field])) violations.push(`01-DIAGNOSIS.md: ${label}_GATE_NOT_PASS ${field}=${diagnosis[field] ?? '<missing>'}`);
  }
}

function requireWaveReady(label) {
  if (!execution.CURRENT_WAVE_ID || execution.CURRENT_WAVE_ID === 'UNSET') violations.push(`02-EXECUTION.md: ${label}_CURRENT_WAVE_ID_REQUIRED`);
  if (!isSha(execution.CURRENT_WAVE_BASE_SHA)) violations.push(`02-EXECUTION.md: ${label}_CURRENT_WAVE_BASE_SHA_REQUIRED`);
  for (const field of [
    'CURRENT_WAVE_ROOT_CAUSE_PROVEN',
    'CURRENT_WAVE_DECISIONS_RESOLVED',
    'CURRENT_WAVE_REDIAGNOSIS_COMPLETE',
    'CURRENT_WAVE_IMPACT_MAPPED',
    'CURRENT_WAVE_VERIFICATION_DEFINED',
    'CURRENT_WAVE_READY_TO_EXECUTE',
  ]) {
    if (!yes(execution[field])) violations.push(`02-EXECUTION.md: ${label}_WAVE_READY_GATE_NOT_PASS ${field}=${execution[field] ?? '<missing>'}`);
  }
}

function requireWaveComplete(label) {
  requireWaveReady(label);
  if (execution.CURRENT_WAVE_STATUS !== 'COMPLETE') violations.push(`02-EXECUTION.md: ${label}_REQUIRES_CURRENT_WAVE_STATUS=COMPLETE`);
  for (const field of [
    'CURRENT_WAVE_IMPLEMENTATION_COMPLETE',
    'CURRENT_WAVE_CONSUMERS_RECONCILED',
    'CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE',
    'CURRENT_WAVE_VERIFICATION_PASS',
    'CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED',
  ]) {
    if (!yes(execution[field])) violations.push(`02-EXECUTION.md: ${label}_WAVE_COMPLETE_GATE_NOT_PASS ${field}=${execution[field] ?? '<missing>'}`);
  }
  if (!['YES', 'NOT_APPLICABLE'].includes(execution.CURRENT_WAVE_GOVERNANCE_SYNC)) {
    violations.push(`02-EXECUTION.md: ${label}_WAVE_GOVERNANCE_SYNC_NOT_PASS ${execution.CURRENT_WAVE_GOVERNANCE_SYNC ?? '<missing>'}`);
  }
}

if (diagnosis.MODE === 'PREPARE_ONLY') {
  if (yes(execution.IMPLEMENTATION_COMPLETE)) violations.push('02-EXECUTION.md: PREPARE_ONLY_CANNOT_CLAIM_IMPLEMENTATION_COMPLETE');
  if (yes(execution.CURRENT_WAVE_IMPLEMENTATION_COMPLETE)) violations.push('02-EXECUTION.md: PREPARE_ONLY_CANNOT_CLAIM_CURRENT_WAVE_IMPLEMENTATION_COMPLETE');
  if (verification.LIFECYCLE_STATE === 'CLOSED') violations.push('03-VERIFICATION-CLOSURE.md: PREPARE_ONLY_CANNOT_BE_CLOSED');
  if (verification.FINAL_DECISION) violations.push('03-VERIFICATION-CLOSURE.md: PREPARE_ONLY_MUST_NOT_ISSUE_FINAL_PRODUCT_DECISION');
}

if (strict && !closure && !waveComplete) {
  if (diagnosis.MODE === 'PREPARE_ONLY') {
    requireGlobalDiagnosisGates('PREPARE_STRICT');
    if (!isSha(execution.PACKAGE_READY_BASE_SHA)) violations.push('02-EXECUTION.md: PREPARE_STRICT_PACKAGE_READY_BASE_SHA_REQUIRED');
    if (verification.LIFECYCLE_STATE !== 'PREPARED') {
      violations.push(`03-VERIFICATION-CLOSURE.md: PREPARE_ONLY_STRICT_REQUIRES_LIFECYCLE_STATE=PREPARED, got ${verification.LIFECYCLE_STATE ?? '<missing>'}`);
    }
  } else if (diagnosis.MODE === 'EXECUTE_END_TO_END') {
    requireWaveReady('EXECUTE_STRICT');
    if (execution.CURRENT_WAVE_STATUS !== 'READY_TO_EXECUTE') {
      violations.push(`02-EXECUTION.md: EXECUTE_STRICT_REQUIRES_CURRENT_WAVE_STATUS=READY_TO_EXECUTE, got ${execution.CURRENT_WAVE_STATUS ?? '<missing>'}`);
    }
    if (!['READY_TO_EXECUTE', 'EXECUTING'].includes(verification.LIFECYCLE_STATE)) {
      violations.push(`03-VERIFICATION-CLOSURE.md: EXECUTE_STRICT_REQUIRES_LIFECYCLE_STATE=READY_TO_EXECUTE|EXECUTING, got ${verification.LIFECYCLE_STATE ?? '<missing>'}`);
    }
  }
}

if (waveComplete) {
  if (diagnosis.MODE !== 'EXECUTE_END_TO_END') violations.push('WAVE_COMPLETE_REQUIRES_EXECUTE_END_TO_END');
  else requireWaveComplete('WAVE_COMPLETE');
  if (!['EXECUTING', 'VERIFYING', 'READY_TO_EXECUTE'].includes(verification.LIFECYCLE_STATE)) {
    violations.push(`03-VERIFICATION-CLOSURE.md: WAVE_COMPLETE_REQUIRES_ACTIVE_EXECUTION_LIFECYCLE, got ${verification.LIFECYCLE_STATE ?? '<missing>'}`);
  }
}

if (closure) {
  if (diagnosis.MODE !== 'EXECUTE_END_TO_END') violations.push('CLOSURE_REQUIRES_EXECUTE_END_TO_END');
  requireGlobalDiagnosisGates('CLOSURE');
  if (!isSha(execution.PACKAGE_READY_BASE_SHA)) violations.push('02-EXECUTION.md: CLOSURE_PACKAGE_READY_BASE_SHA_REQUIRED');
  if (!['COMPLETE', 'NOT_SELECTED'].includes(execution.CURRENT_WAVE_STATUS)) {
    violations.push(`02-EXECUTION.md: CLOSURE_REQUIRES_NO_OPEN_CURRENT_WAVE, got ${execution.CURRENT_WAVE_STATUS ?? '<missing>'}`);
  }
  if (execution.CURRENT_WAVE_STATUS === 'COMPLETE') requireWaveComplete('CLOSURE_LAST_WAVE');
  if (verification.LIFECYCLE_STATE !== 'CLOSED') violations.push('03-VERIFICATION-CLOSURE.md: LIFECYCLE_STATE_CLOSED_REQUIRED');
  if (!yes(execution.IMPLEMENTATION_COMPLETE)) violations.push('02-EXECUTION.md: IMPLEMENTATION_COMPLETE_REQUIRED');
  for (const field of ['EVIDENCE_COMPLETE', 'CLEANUP_COMPLETE', 'GOVERNANCE_SYNC_COMPLETE', 'FRESH_HEAD_VALID', 'FINAL_ADVERSARIAL_PASS']) {
    if (!yes(verification[field])) violations.push(`03-VERIFICATION-CLOSURE.md: CLOSURE_GATE_NOT_PASS ${field}=${verification[field] ?? '<missing>'}`);
  }
  for (const field of ['FINAL_CANDIDATE_SHA', 'HEAD_AT_REVIEW_START', 'HEAD_AT_DECISION']) {
    if (!isSha(verification[field])) violations.push(`03-VERIFICATION-CLOSURE.md: ${field}_INVALID`);
  }
  if (verification.FINAL_CANDIDATE_SHA && verification.HEAD_AT_DECISION && verification.FINAL_CANDIDATE_SHA !== verification.HEAD_AT_DECISION) {
    violations.push('03-VERIFICATION-CLOSURE.md: FINAL_CANDIDATE_SHA_MUST_EQUAL_HEAD_AT_DECISION_FOR_BRANCH_HEAD_CLOSURE');
  }
  if (verification.FINAL_DECISION !== closedDecision) violations.push(`03-VERIFICATION-CLOSURE.md: FINAL_DECISION_MUST_EQUAL_GOVERNED_CLOSED_DECISION ${closedDecision ?? '<missing>'}`);
}

if (await exists(packageRoot) && (await stat(packageRoot)).isDirectory()) {
  const entries = await readdir(packageRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) violations.push(`UNEXPECTED_DIRECTORY ${entry.name}: current package schema is exactly three lifecycle files`);
    else if (entry.isFile() && !requiredFiles.includes(entry.name)) violations.push(`UNEXPECTED_FILE ${entry.name}: current package schema is exactly three lifecycle files`);
  }
}

if (violations.length) {
  console.error(`PACKAGE VALIDATION: FAIL (${violations.length})`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

const suffix = closure ? ' --closure' : waveComplete ? ' --wave-complete' : strict ? ' --strict' : '';
console.log(`PACKAGE VALIDATION: PASS${suffix}`);
console.log('Proof limit: structural/package-gate validation only; not Product/Runtime correctness.');
