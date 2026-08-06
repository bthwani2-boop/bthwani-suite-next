#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(frameworkRoot, '..', '..');
const rawArgs = process.argv.slice(2);
const strict = rawArgs.includes('--strict');
const disposal = rawArgs.includes('--disposal');
const packageArg = rawArgs.find((arg) => !arg.startsWith('--'));

if (!packageArg) {
  throw new Error(
    'Usage: node tools/diagnose-implementing/validate-package.mjs <package-path> [--strict] [--disposal]',
  );
}

const packagePath = resolve(process.cwd(), packageArg);
const frameworkPrefix = `${resolve(frameworkRoot)}${sep}`;
if (!packagePath.startsWith(frameworkPrefix) || packagePath === resolve(frameworkRoot, '_template')) {
  throw new Error('Package path must be a concrete task directory under tools/diagnose-implementing.');
}

const errors = [];
const warnings = [];
const requiredFiles = [
  '00-MANIFEST.json',
  '01-DIAGNOSIS-REPORT.md',
  '02-FINDINGS-REGISTER.json',
  '03-EXECUTION-PLAN.md',
  '04-WORK-ITEMS.json',
  '05-VERIFICATION-MATRIX.json',
  '06-CLOSURE-AND-DISPOSAL.md',
  'evidence/README.md',
  'phases/PHASE-00.md',
  'tasks/TASK-0001.json',
];

const textExtensions = new Set([
  '.md', '.txt', '.json', '.jsonl', '.yaml', '.yml', '.csv', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.go', '.sql', '.ps1', '.sh', '.toml', '.ini', '.env', '.graphql', '.gql', '.xml', '.html', '.css', '.scss',
]);

const unresolvedPatterns = [
  /\bREPLACE(?:_[A-Z0-9_]+)?\b/g,
  /\bTASK_NAME\b/g,
  /\bTASK_SLUG\b/g,
  /\bTARGET_BRANCH\b/g,
  /\bPINNED_START_SHA\b/g,
  /\b40_CHARACTER_SHA\b/g,
  /\bREPOSITORY_PATH\b/g,
  /\bEXACT_SYMBOL_OR_RANGE\b/g,
  /\bUNRECORDED\b/g,
  /\bTODO\b/g,
  /\bTBD\b/g,
];

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\b(?:password|passwd|secret|token)\s*[:=]\s*["'][^"']{8,}["']/i,
];

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

async function readText(path) {
  return readFile(path, 'utf8');
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readText(path));
  } catch (error) {
    addError(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function ensureNonEmpty(value, label) {
  if (!isNonEmptyString(value)) {
    addError(`${label} must be a non-empty string.`);
  }
}

function ensureArray(value, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    addError(`${label} must be an array.`);
    return [];
  }
  if (nonEmpty && value.length === 0) {
    addError(`${label} must not be empty.`);
  }
  return value;
}

function collectStrings(value, path = '$', output = []) {
  if (typeof value === 'string') {
    output.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, output));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      collectStrings(item, `${path}.${key}`, output);
    }
  }
  return output;
}

let unresolvedMarkerCount = 0;

function findUnresolvedMarkers(text, label) {
  for (const pattern of unresolvedPatterns) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches?.length) {
      unresolvedMarkerCount += matches.length;
      const message = `${label} contains unresolved marker ${matches[0]} (${matches.length} occurrence(s)).`;
      strict ? addError(message) : addWarning(message);
    }
  }
}

function checkSecrets(text, label) {
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) {
      addError(`${label} appears to contain a secret or private key pattern. Store only sanitized evidence references.`);
    }
  }
}

async function walk(root, { skip = new Set() } = {}) {
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = resolve(current, entry.name);
      const rel = relative(root, absolute);
      if (skip.has(entry.name) || [...skip].some((item) => rel === item || rel.startsWith(`${item}${sep}`))) {
        continue;
      }
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }
  await visit(root);
  return files;
}

for (const file of requiredFiles) {
  try {
    const fileStat = await stat(resolve(packagePath, file));
    if (!fileStat.isFile()) {
      addError(`Required path is not a file: ${file}`);
    }
  } catch {
    addError(`Missing required file: ${file}`);
  }
}

const packageFiles = await walk(packagePath);
for (const file of packageFiles) {
  const extension = extname(file).toLowerCase();
  if (!textExtensions.has(extension) && extension !== '') {
    continue;
  }
  const fileStat = await stat(file);
  if (fileStat.size > 2_000_000) {
    addWarning(`Skipped marker/secret scan for file larger than 2 MB: ${relative(packagePath, file)}`);
    continue;
  }
  const text = await readText(file);
  findUnresolvedMarkers(text, relative(packagePath, file));
  checkSecrets(text, relative(packagePath, file));
}

const manifest = await readJson(resolve(packagePath, '00-MANIFEST.json'), '00-MANIFEST.json');
const findingsRegister = await readJson(resolve(packagePath, '02-FINDINGS-REGISTER.json'), '02-FINDINGS-REGISTER.json');
const workItemsRegister = await readJson(resolve(packagePath, '04-WORK-ITEMS.json'), '04-WORK-ITEMS.json');
const verificationRegister = await readJson(resolve(packagePath, '05-VERIFICATION-MATRIX.json'), '05-VERIFICATION-MATRIX.json');

if (manifest) {
  if (manifest.packageClass !== 'DERIVED_SUPPORT_ARTIFACT') {
    addError('Manifest packageClass must be DERIVED_SUPPORT_ARTIFACT.');
  }
  if (manifest.authority?.classification !== 'DERIVED_SUPPORT_ARTIFACT') {
    addError('Manifest authority.classification must be DERIVED_SUPPORT_ARTIFACT.');
  }
  if (manifest.authority?.canCreatePolicy !== false || manifest.authority?.canOverrideCanonicalSource !== false) {
    addError('A task package must not create policy or override canonical sources.');
  }
  if (!/^[0-9a-f]{40}$/i.test(manifest.task?.pinnedStartSha ?? '')) {
    addError('Manifest task.pinnedStartSha must be an exact 40-character SHA.');
  }
  if (manifest.disposability?.mustBeSafeToDelete !== true) {
    addError('Manifest disposability.mustBeSafeToDelete must be true.');
  }
  for (const key of [
    'runtimeDependsOnPackage',
    'buildDependsOnPackage',
    'ciDependsOnPackage',
    'migrationDependsOnPackage',
    'governanceDependsOnPackage',
    'operationsDependOnPackage',
    'containsOnlyCopyOfDurableDecision',
    'containsSecretsOrProductionData',
  ]) {
    if (manifest.disposability?.[key] !== false) {
      addError(`Manifest disposability.${key} must be false.`);
    }
  }
}

const findings = ensureArray(findingsRegister?.findings, 'findingsRegister.findings', { nonEmpty: strict });
const workItems = ensureArray(workItemsRegister?.workItems, 'workItemsRegister.workItems', { nonEmpty: strict });
const verifications = ensureArray(verificationRegister?.verifications, 'verificationRegister.verifications', { nonEmpty: strict });

function uniqueIdMap(items, field, label, pattern) {
  const map = new Map();
  for (const [index, item] of items.entries()) {
    const id = item?.[field];
    if (!isNonEmptyString(id) || !pattern.test(id)) {
      addError(`${label}[${index}].${field} is missing or invalid.`);
      continue;
    }
    if (map.has(id)) {
      addError(`Duplicate ${label} identifier: ${id}`);
    }
    map.set(id, item);
  }
  return map;
}

const findingMap = uniqueIdMap(findings, 'findingId', 'findings', /^FND-\d{4,}$/);
const workItemMap = uniqueIdMap(workItems, 'workItemId', 'workItems', /^TASK-\d{4,}$/);
const verificationMap = uniqueIdMap(verifications, 'verificationId', 'verifications', /^VER-\d{4,}$/);

for (const finding of findings) {
  if (!finding?.findingId) continue;
  const label = `Finding ${finding.findingId}`;
  ensureNonEmpty(finding.title, `${label}.title`);
  ensureNonEmpty(finding.observation?.actualBehavior, `${label}.observation.actualBehavior`);
  ensureNonEmpty(finding.observation?.expectedBehavior, `${label}.observation.expectedBehavior`);
  const evidence = ensureArray(finding.evidence, `${label}.evidence`, { nonEmpty: strict });
  for (const [index, item] of evidence.entries()) {
    ensureNonEmpty(item?.evidenceId, `${label}.evidence[${index}].evidenceId`);
    ensureNonEmpty(item?.pathOrSource, `${label}.evidence[${index}].pathOrSource`);
    ensureNonEmpty(item?.resultSummary, `${label}.evidence[${index}].resultSummary`);
    if (item?.type === 'SOURCE_CODE' && !isNonEmptyString(item?.lineOrSymbolRange)) {
      addError(`${label}.evidence[${index}] source-code evidence requires lineOrSymbolRange.`);
    }
    if (!/^[0-9a-f]{40}$/i.test(item?.sha ?? '') && item?.type !== 'EXTERNAL_STATE') {
      addError(`${label}.evidence[${index}] requires an exact repository SHA unless it is external state.`);
    }
  }
  ensureNonEmpty(finding.rootCause?.immediateCause, `${label}.rootCause.immediateCause`);
  ensureNonEmpty(finding.rootCause?.structuralCause, `${label}.rootCause.structuralCause`);
  ensureNonEmpty(finding.rootCause?.incorrectOrMissingTruthOwner, `${label}.rootCause.incorrectOrMissingTruthOwner`);
  ensureNonEmpty(finding.truthOwnership?.correctOwner, `${label}.truthOwnership.correctOwner`);
  ensureNonEmpty(finding.resolution?.strategy, `${label}.resolution.strategy`);
  const linkedTasks = ensureArray(finding.resolution?.workItemIds, `${label}.resolution.workItemIds`, {
    nonEmpty: strict && finding.disposition?.decision !== 'BLOCKED_EXTERNAL',
  });
  for (const taskId of linkedTasks) {
    if (!workItemMap.has(taskId)) {
      addError(`${label} references unknown work item ${taskId}.`);
    }
  }
  const criteria = ensureArray(finding.acceptance?.criteria, `${label}.acceptance.criteria`, { nonEmpty: strict });
  for (const criterion of criteria) {
    ensureNonEmpty(criterion?.criterionId, `${label}.acceptance criterion ID`);
    ensureNonEmpty(criterion?.statement, `${label}.acceptance criterion statement`);
    for (const verificationId of ensureArray(criterion?.verificationIds, `${label}.acceptance verificationIds`, { nonEmpty: strict })) {
      if (!verificationMap.has(verificationId)) {
        addError(`${label} acceptance criterion references unknown verification ${verificationId}.`);
      }
    }
  }
}

let inProgressCount = 0;
for (const workItem of workItems) {
  if (!workItem?.workItemId) continue;
  const label = `Work item ${workItem.workItemId}`;
  if (workItem.status === 'IN_PROGRESS') inProgressCount += 1;
  ensureNonEmpty(workItem.title, `${label}.title`);
  ensureNonEmpty(workItem.objective, `${label}.objective`);
  ensureNonEmpty(workItem.rationale, `${label}.rationale`);
  for (const findingId of ensureArray(workItem.findingIds, `${label}.findingIds`, { nonEmpty: strict })) {
    if (!findingMap.has(findingId)) {
      addError(`${label} references unknown finding ${findingId}.`);
    }
  }
  const exactChanges = ensureArray(workItem.changeSpecification?.exactChanges, `${label}.changeSpecification.exactChanges`, {
    nonEmpty: strict,
  });
  for (const [index, change] of exactChanges.entries()) {
    ensureNonEmpty(change?.path, `${label}.exactChanges[${index}].path`);
    ensureNonEmpty(change?.action, `${label}.exactChanges[${index}].action`);
    ensureNonEmpty(change?.after, `${label}.exactChanges[${index}].after`);
    ensureNonEmpty(change?.implementationNotes, `${label}.exactChanges[${index}].implementationNotes`);
  }
  const positiveCriteria = ensureArray(workItem.acceptance?.positiveCriteria, `${label}.acceptance.positiveCriteria`, {
    nonEmpty: strict,
  });
  for (const criterion of positiveCriteria) {
    ensureNonEmpty(criterion?.criterionId, `${label}.acceptance criterion ID`);
    ensureNonEmpty(criterion?.statement, `${label}.acceptance criterion statement`);
  }
  for (const verificationId of ensureArray(workItem.verification?.verificationIds, `${label}.verification.verificationIds`, {
    nonEmpty: strict,
  })) {
    if (!verificationMap.has(verificationId)) {
      addError(`${label} references unknown verification ${verificationId}.`);
    }
  }
  if (workItem.execution?.oneWorkItemOpenAtATime !== true) {
    addError(`${label} must set execution.oneWorkItemOpenAtATime to true.`);
  }
  if (workItem.verification?.checksAfterLastWrite !== true || workItem.verification?.sameCommitRequired !== true) {
    addError(`${label} must require checks after the last write on the same commit.`);
  }
}

if (inProgressCount > 1) {
  addError(`Only one work item may be IN_PROGRESS; found ${inProgressCount}.`);
}

for (const verification of verifications) {
  if (!verification?.verificationId) continue;
  const label = `Verification ${verification.verificationId}`;
  ensureNonEmpty(verification.title, `${label}.title`);
  ensureNonEmpty(verification.claim?.proves, `${label}.claim.proves`);
  ensureNonEmpty(verification.procedure?.command, `${label}.procedure.command`);
  ensureNonEmpty(verification.procedure?.expectedResult, `${label}.procedure.expectedResult`);
  if (verification.claim?.sameCommitRequired !== true) {
    addError(`${label} must require same-commit evidence.`);
  }
  for (const findingId of ensureArray(verification.linked?.findingIds, `${label}.linked.findingIds`, { nonEmpty: strict })) {
    if (!findingMap.has(findingId)) addError(`${label} references unknown finding ${findingId}.`);
  }
  for (const taskId of ensureArray(verification.linked?.workItemIds, `${label}.linked.workItemIds`, { nonEmpty: strict })) {
    if (!workItemMap.has(taskId)) addError(`${label} references unknown work item ${taskId}.`);
  }
  if (verification.result?.decision === 'PASS') {
    if (!/^[0-9a-f]{40}$/i.test(verification.result?.sha ?? '')) {
      addError(`${label} marked PASS without an exact result SHA.`);
    }
    if (verification.result?.rerunAfterLastWrite !== true) {
      addError(`${label} marked PASS without rerunAfterLastWrite=true.`);
    }
    if (verification.result?.exitCode !== 0 && verification.verificationType !== 'MANUAL_REVIEW' && verification.verificationType !== 'EXTERNAL_EVIDENCE') {
      addError(`${label} marked PASS without exitCode=0.`);
    }
  }
}

if (manifest) {
  const counts = manifest.coverage ?? {};
  const expectedCounts = {
    findings: findings.length,
    workItems: workItems.length,
    verificationItems: verifications.length,
    openFindings: findings.filter((item) => !['CLOSED_WITH_EVIDENCE'].includes(item.status)).length,
    completedWorkItems: workItems.filter((item) => item.status === 'CLOSED_WITH_EVIDENCE').length,
    failedRequiredChecks: verifications.filter((item) => item.required && ['FIX_REQUIRED', 'PROTOCOL_VIOLATION'].includes(item.result?.decision)).length,
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (strict && counts[key] !== expected) {
      addError(`Manifest coverage.${key}=${counts[key]} does not match register count ${expected}.`);
    } else if (!strict && counts[key] !== expected) {
      addWarning(`Manifest coverage.${key}=${counts[key]} does not match register count ${expected}.`);
    }
  }
  if (manifest.status?.decision === 'CLOSED_WITH_EVIDENCE') {
    for (const key of [
      'openFindings',
      'unprovenItems',
      'failedRequiredChecks',
      'unverifiedRequiredBehaviors',
      'unverifiedDeletions',
      'externalBlockers',
    ]) {
      if (counts[key] !== 0) {
        addError(`CLOSED_WITH_EVIDENCE is invalid while coverage.${key}=${counts[key]}.`);
      }
    }
  }
}

// Plan-ready gate.
//
// The manifest documents qualityGates.planReady thresholds, but nothing used
// to compare anything against them, so a package could satisfy the JSON schema
// while failing the planning contract it declared. A previous package passed
// --strict while reporting inventoryItems=0 with unclassifiedInventoryItems=1.
//
// Every metric below is measured from the registers rather than read from the
// manifest's own coverage block, and the self-reported coverage is then checked
// against those measurements, so an inaccurate self-report is itself an error.
const PLAN_READY_METRICS = [
  'unclassifiedInventoryItems',
  'findingsWithoutEvidence',
  'findingsWithoutRootCause',
  'internalFindingsWithoutWorkItems',
  'workItemsWithoutAcceptanceCriteria',
  'workItemsWithoutVerification',
  'unresolvedTemplateMarkers',
  'dependencyCycles',
];

function countWorkItemDependencyCycles() {
  const graph = new Map(
    workItems
      .filter((item) => item?.workItemId)
      .map((item) => [
        item.workItemId,
        (Array.isArray(item.dependencies?.workItems) ? item.dependencies.workItems : []).filter((id) =>
          workItemMap.has(id),
        ),
      ]),
  );
  const state = new Map();
  let cycles = 0;
  const visit = (node) => {
    state.set(node, 'visiting');
    for (const next of graph.get(node) ?? []) {
      const nextState = state.get(next);
      if (nextState === 'visiting') cycles += 1;
      else if (nextState !== 'done') visit(next);
    }
    state.set(node, 'done');
  };
  for (const node of graph.keys()) {
    if (!state.has(node)) visit(node);
  }
  return cycles;
}

const planReady = manifest?.qualityGates?.planReady;
if (!planReady || typeof planReady !== 'object') {
  addError('Manifest must declare qualityGates.planReady thresholds.');
} else {
  const isInternal = (finding) => finding?.disposition?.decision !== 'BLOCKED_EXTERNAL';
  const coverage = manifest?.coverage ?? {};
  const declaredInventory = Number(coverage.inventoryItems);
  const declaredClassified = Number(coverage.classifiedInventoryItems);
  const declaredUnclassified = Number(coverage.unclassifiedInventoryItems);

  if (!Number.isInteger(declaredInventory) || declaredInventory <= 0) {
    addError(`Manifest coverage.inventoryItems must be a positive integer; found ${coverage.inventoryItems}.`);
  }
  if (declaredClassified + declaredUnclassified !== declaredInventory) {
    addError(
      `Manifest coverage is inconsistent: classified (${declaredClassified}) + unclassified (${declaredUnclassified}) !== inventoryItems (${declaredInventory}).`,
    );
  }

  const measured = {
    unclassifiedInventoryItems: Number.isInteger(declaredUnclassified) ? declaredUnclassified : Number.NaN,
    findingsWithoutEvidence: findings.filter((f) => !Array.isArray(f?.evidence) || f.evidence.length === 0).length,
    findingsWithoutRootCause: findings.filter(
      (f) =>
        !isNonEmptyString(f?.rootCause?.immediateCause) ||
        !isNonEmptyString(f?.rootCause?.structuralCause) ||
        !isNonEmptyString(f?.rootCause?.incorrectOrMissingTruthOwner),
    ).length,
    internalFindingsWithoutWorkItems: findings.filter(
      (f) => isInternal(f) && (!Array.isArray(f?.resolution?.workItemIds) || f.resolution.workItemIds.length === 0),
    ).length,
    workItemsWithoutAcceptanceCriteria: workItems.filter(
      (w) =>
        !Array.isArray(w?.acceptance?.positiveCriteria) || w.acceptance.positiveCriteria.length === 0,
    ).length,
    workItemsWithoutVerification: workItems.filter(
      (w) => !Array.isArray(w?.verification?.verificationIds) || w.verification.verificationIds.length === 0,
    ).length,
    unresolvedTemplateMarkers: unresolvedMarkerCount,
    dependencyCycles: countWorkItemDependencyCycles(),
  };

  for (const metric of PLAN_READY_METRICS) {
    const threshold = planReady[metric];
    if (!Number.isInteger(threshold)) {
      addError(`qualityGates.planReady.${metric} must be declared as an integer threshold.`);
      continue;
    }
    const actual = measured[metric];
    if (!Number.isInteger(actual)) {
      addError(`Plan-ready metric ${metric} could not be measured.`);
      continue;
    }
    if (actual > threshold) {
      addError(`Plan-ready gate failed: ${metric} measured ${actual}, threshold ${threshold}.`);
    }
  }

  const reportedFindings = Number(coverage.findings);
  if (Number.isInteger(reportedFindings) && reportedFindings !== findings.length) {
    addError(`Manifest coverage.findings reports ${reportedFindings} but the register contains ${findings.length}.`);
  }
  const reportedWorkItems = Number(coverage.workItems);
  if (Number.isInteger(reportedWorkItems) && reportedWorkItems !== workItems.length) {
    addError(`Manifest coverage.workItems reports ${reportedWorkItems} but the register contains ${workItems.length}.`);
  }
  const reportedVerifications = Number(coverage.verificationItems);
  if (Number.isInteger(reportedVerifications) && reportedVerifications !== verifications.length) {
    addError(
      `Manifest coverage.verificationItems reports ${reportedVerifications} but the register contains ${verifications.length}.`,
    );
  }
}

if (disposal) {
  if (!strict) {
    addError('--disposal requires --strict.');
  }
  if (manifest?.disposability?.durableOutputsMigratedToCanonicalOwners !== true) {
    addError('Disposal requires durableOutputsMigratedToCanonicalOwners=true.');
  }
  if (manifest?.disposability?.referenceScanPassed !== true) {
    addError('Disposal requires referenceScanPassed=true after the actual repository scan.');
  }
  const packageRelative = relative(repositoryRoot, packagePath).split(sep).join('/');
  const packageRelativeWindows = packageRelative.split('/').join('\\');
  const repositoryFiles = await walk(repositoryRoot, {
    skip: new Set(['.git', 'node_modules', '.pnpm-store', '.next', 'dist', 'build', 'coverage']),
  });
  const outsideReferences = [];
  for (const file of repositoryFiles) {
    if (file === packagePath || file.startsWith(`${packagePath}${sep}`)) continue;
    const extension = extname(file).toLowerCase();
    if (!textExtensions.has(extension) && extension !== '') continue;
    const fileStat = await stat(file);
    if (fileStat.size > 2_000_000) continue;
    let text;
    try {
      text = await readText(file);
    } catch {
      continue;
    }
    if (text.includes(packageRelative) || text.includes(packageRelativeWindows)) {
      outsideReferences.push(relative(repositoryRoot, file));
    }
  }
  if (outsideReferences.length > 0) {
    addError(`Package is not disposable; outside references found in: ${outsideReferences.join(', ')}`);
  }
  if (Array.isArray(manifest?.disposability?.outsideReferences) && manifest.disposability.outsideReferences.length > 0) {
    addError('Manifest records outsideReferences; remove or migrate those dependencies before disposal.');
  }
  const closureText = await readText(resolve(packagePath, '06-CLOSURE-AND-DISPOSAL.md'));
  if (!/disposal_decision:\s*READY_TO_DELETE/.test(closureText)) {
    addError('Closure file must record disposal_decision: READY_TO_DELETE before deletion.');
  }
}

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}
for (const error of errors) {
  console.error(`ERROR: ${error}`);
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
  process.exitCode = 1;
} else {
  console.log(`Validation passed with ${warnings.length} warning(s).`);
  console.log(`Package: ${relative(repositoryRoot, packagePath)}`);
  console.log(`Mode: ${strict ? 'strict' : 'development'}${disposal ? ' + disposal' : ''}`);
}
