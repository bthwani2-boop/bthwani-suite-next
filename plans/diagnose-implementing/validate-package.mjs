#!/usr/bin/env node
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const packageArg = args.find((value) => !value.startsWith('--'));
const strict = args.includes('--strict') || args.includes('--closure');
const closure = args.includes('--closure');
if (!packageArg) throw new Error('Usage: validate-package.mjs <package-path> [--strict] [--closure]');

const packageRoot = resolve(packageArg);
const frameworkRoot = resolve('plans/diagnose-implementing');
if (!packageRoot.startsWith(`${frameworkRoot}${sep}`)) throw new Error('Package path must be under plans/diagnose-implementing/.');
if (basename(packageRoot) === '_template') throw new Error('Validate a generated package, not _template.');

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

const requiredFiles = ['01-DIAGNOSIS.md', '02-EXECUTION.md', '03-VERIFICATION-CLOSURE.md'];
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

if (violations.length && await exists(resolve(packageRoot, 'MANIFEST.json'))) {
  violations.push('LEGACY_PACKAGE_SCHEMA_DETECTED: rebaseline/migrate the active task into the current three-file package model before claiming current readiness.');
}

function meta(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

function requireHeading(file, heading) {
  if (texts[file] && !texts[file].includes(heading)) violations.push(`${file}: MISSING_SECTION ${heading}`);
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
requireHeading('03-VERIFICATION-CLOSURE.md', '## 4. Final Cleanup / Structural Hygiene');
requireHeading('03-VERIFICATION-CLOSURE.md', '## 5. Governance Reconciliation');
requireHeading('03-VERIFICATION-CLOSURE.md', '## 8. Final Closure Gate');

const diagnosis = meta(texts['01-DIAGNOSIS.md'] ?? '');
const execution = meta(texts['02-EXECUTION.md'] ?? '');
const verification = meta(texts['03-VERIFICATION-CLOSURE.md'] ?? '');

if (diagnosis.PACKAGE_SCHEMA !== 'BTHWANI_TASK_PACKAGE_V1') violations.push('01-DIAGNOSIS.md: PACKAGE_SCHEMA_INVALID');
if (!/^PKG-[A-Z0-9_]+$/.test(diagnosis.TASK_ID ?? '')) violations.push('01-DIAGNOSIS.md: TASK_ID_INVALID');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(diagnosis.REPOSITORY ?? '')) violations.push('01-DIAGNOSIS.md: REPOSITORY_INVALID');
if (!['PREPARE_ONLY', 'EXECUTE_END_TO_END'].includes(diagnosis.MODE)) violations.push('01-DIAGNOSIS.md: MODE_INVALID');
for (const field of ['START_SHA', 'CURRENT_SHA']) {
  if (!/^[0-9a-f]{40}$/i.test(diagnosis[field] ?? '')) violations.push(`01-DIAGNOSIS.md: ${field}_INVALID`);
}

const yes = (value) => value === 'YES';
if (strict) {
  for (const field of ['DISCOVERY_COMPLETE', 'DIAGNOSIS_COMPLETE', 'DECISION_COMPLETE', 'COVERAGE_COMPLETE', 'PACKAGE_READY']) {
    if (!yes(diagnosis[field])) violations.push(`01-DIAGNOSIS.md: STRICT_GATE_NOT_PASS ${field}=${diagnosis[field] ?? '<missing>'}`);
  }
  if (/\bUNVISITED\b|\bUNCLASSIFIED\b|\bDECISION_REQUIRED\b/.test(texts['01-DIAGNOSIS.md'] ?? '')) {
    violations.push('01-DIAGNOSIS.md: STRICT_UNRESOLVED_STATUS_PRESENT');
  }
}

if (diagnosis.MODE === 'PREPARE_ONLY') {
  if (yes(execution.IMPLEMENTATION_COMPLETE)) violations.push('02-EXECUTION.md: PREPARE_ONLY_CANNOT_CLAIM_IMPLEMENTATION_COMPLETE');
  if ((verification.FINAL_DECISION ?? 'OPEN') !== 'OPEN') violations.push('03-VERIFICATION-CLOSURE.md: PREPARE_ONLY_FINAL_DECISION_MUST_REMAIN_OPEN');
}

if (closure) {
  if (diagnosis.MODE !== 'EXECUTE_END_TO_END') violations.push('CLOSURE_REQUIRES_EXECUTE_END_TO_END');
  if (!yes(execution.IMPLEMENTATION_COMPLETE)) violations.push('02-EXECUTION.md: IMPLEMENTATION_COMPLETE_REQUIRED');
  for (const field of ['EVIDENCE_COMPLETE', 'CLEANUP_COMPLETE', 'GOVERNANCE_SYNC_COMPLETE', 'FRESH_HEAD_VALID', 'FINAL_ADVERSARIAL_PASS']) {
    if (!yes(verification[field])) violations.push(`03-VERIFICATION-CLOSURE.md: CLOSURE_GATE_NOT_PASS ${field}=${verification[field] ?? '<missing>'}`);
  }
  if (!verification.FINAL_CANDIDATE_SHA || !/^[0-9a-f]{40}$/i.test(verification.FINAL_CANDIDATE_SHA)) violations.push('03-VERIFICATION-CLOSURE.md: FINAL_CANDIDATE_SHA_INVALID');
  if (!verification.HEAD_AT_DECISION || !/^[0-9a-f]{40}$/i.test(verification.HEAD_AT_DECISION)) violations.push('03-VERIFICATION-CLOSURE.md: HEAD_AT_DECISION_INVALID');
  if (!verification.FINAL_DECISION || ['OPEN', 'BLOCKED', 'UNSET'].includes(verification.FINAL_DECISION)) violations.push('03-VERIFICATION-CLOSURE.md: FINAL_DECISION_NOT_CLOSED');
}

if (await exists(packageRoot) && (await stat(packageRoot)).isDirectory()) {
  const entries = await readdir(packageRoot, { withFileTypes: true });
  const rootFiles = entries.filter((e) => e.isFile()).map((e) => e.name);
  for (const file of requiredFiles) if (!rootFiles.includes(file)) {/* already reported */}
}

if (violations.length) {
  console.error(`PACKAGE VALIDATION: FAIL (${violations.length})`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`PACKAGE VALIDATION: PASS${closure ? ' --closure' : strict ? ' --strict' : ''}`);
console.log('Proof limit: structural/package-gate validation only; not Product/Runtime correctness.');
