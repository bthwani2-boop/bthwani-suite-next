#!/usr/bin/env node
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repo = resolve(root, '..', '..');
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const disposal = args.includes('--disposal');
const input = args.find((x) => !x.startsWith('--'));
if (!input) throw new Error('Usage: validate-package.mjs <package-path> [--strict] [--disposal]');
const pkg = resolve(process.cwd(), input);
if (!pkg.startsWith(`${resolve(root)}${sep}`) || pkg === resolve(root, '_template')) throw new Error('Invalid package path.');

const errors = [], warnings = [];
const err = (x) => errors.push(x), warn = (x) => warnings.push(x);
const required = ['STATE.json', 'PACKAGE.md', 'LEDGER.jsonl'];
const surfaces = ['control-panel', 'app-client', 'app-partner', 'app-captain', 'app-field'];
const classes = new Set(['AFFECTED','NOT_AFFECTED_WITH_EVIDENCE','OBSOLETE_CANDIDATE','DUPLICATE_CANDIDATE','MIGRATION_REQUIRED','EXTERNAL','UNPROVEN']);
const markers = [/\bTASK_(?:NAME|SLUG|PACKAGE_ID|OBJECTIVE)\b/g,/\bTARGET_BRANCH\b/g,/\bPINNED_START_SHA\b/g,/\bREPOSITORY_NAME\b/g,/\bREQUESTED_MODE\b/g,/\bREPLACE(?:_[A-Z0-9_]+)?\b/g,/\bTODO\b/g,/\bTBD\b/g];
const secrets = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bAKIA[0-9A-Z]{16}\b/,/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,/\bgithub_pat_[A-Za-z0-9_]{20,}\b/,/\bsk-[A-Za-z0-9]{20,}\b/];
const exists = async (p) => { try { await access(p, constants.F_OK); return true; } catch { return false; } };
const text = async (p) => readFile(p, 'utf8');
const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const arr = (v) => Array.isArray(v) ? v : [];
const norm = (p) => relative(repo, p).split(sep).join('/');
const need = (v, label) => { if (!nonempty(v)) err(`${label} is required.`); };
const needArr = (v, label, requiredNow = false) => { if (!Array.isArray(v)) { err(`${label} must be an array.`); return []; } if (requiredNow && v.length === 0) err(`${label} must not be empty.`); return v; };

async function walk(base, predicate = () => true, skip = new Set()) {
  if (!(await exists(base))) return [];
  const out = [];
  async function visit(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (skip.has(e.name) || ['.git','node_modules','.next','dist'].includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) await visit(p); else if (e.isFile() && predicate(p)) out.push(p);
    }
  }
  await visit(base); return out.sort();
}
function scan(value, label) {
  for (const p of markers) { p.lastIndex = 0; if (p.test(value)) (strict ? err : warn)(`${label} contains unresolved marker ${p}.`); }
  for (const p of secrets) if (p.test(value)) err(`${label} appears to contain a secret.`);
}

for (const f of required) if (!(await exists(join(pkg, f)))) err(`Missing ${f}.`);
let state;
try { state = JSON.parse(await text(join(pkg, 'STATE.json'))); } catch (e) { err(`Invalid STATE.json: ${e.message}`); }
try { scan(await text(join(pkg, 'PACKAGE.md')), 'PACKAGE.md'); } catch (e) { err(`Cannot read PACKAGE.md: ${e.message}`); }
const records = [];
try {
  const raw = await text(join(pkg, 'LEDGER.jsonl')); scan(raw, 'LEDGER.jsonl');
  for (const [i, line] of raw.split(/\r?\n/).entries()) if (line.trim()) {
    try { const r = JSON.parse(line); if (!r || Array.isArray(r) || typeof r !== 'object') err(`Ledger line ${i+1} is not an object.`); else records.push({ ...r, __line: i+1 }); }
    catch (e) { err(`Invalid ledger line ${i+1}: ${e.message}`); }
  }
} catch (e) { err(`Cannot read LEDGER.jsonl: ${e.message}`); }

if (state) {
  if (state.schemaVersion !== 2 || state.packageClass !== 'DERIVED_SUPPORT_ARTIFACT') err('STATE schemaVersion/packageClass is invalid.');
  if (!/^[0-9a-f]{40}$/i.test(state.task?.pinnedStartSha ?? '')) err('Pinned SHA must be 40 hexadecimal characters.');
  need(state.task?.repository, 'task.repository'); need(state.task?.targetBranch, 'task.targetBranch'); need(state.task?.objective, 'task.objective');
  if (state.execution?.oneWorkItemAtATime !== true) err('oneWorkItemAtATime must be true.');
  if (state.authority?.canCreatePolicy !== false || state.authority?.canOverrideCanonicalSource !== false) err('Package cannot create or override authority.');
  for (const k of ['runtimeDependsOnPackage','buildDependsOnPackage','ciDependsOnPackage','migrationDependsOnPackage','governanceDependsOnPackage','operationsDependOnPackage','containsOnlyCopyOfDurableDecision','containsSecretsOrProductionData']) if (state.disposability?.[k] !== false) err(`disposability.${k} must be false.`);
  if (!state.gates || typeof state.gates !== 'object') err('STATE.gates is required.'); else for (const [k,v] of Object.entries(state.gates)) {
    if (!Number.isInteger(v) || v < 0) err(`gate ${k} must be a non-negative integer.`); else if (strict && v !== 0) err(`gate ${k} must be zero; found ${v}.`);
  }
  if (strict && (state.status?.diagnosis === 'DIAGNOSIS_IN_PROGRESS' || state.status?.plan === 'NOT_READY')) err('Strict mode requires completed diagnosis and ready plan.');
}

const byType = new Map(), byId = new Map();
for (const r of records) {
  if (!nonempty(r.type) || !nonempty(r.id)) { err(`Ledger line ${r.__line} needs type and id.`); continue; }
  if (byId.has(r.id)) err(`Duplicate id ${r.id}.`); else byId.set(r.id, r);
  if (!byType.has(r.type)) byType.set(r.type, []); byType.get(r.type).push(r);
}
const of = (t) => byType.get(t) ?? [];
if (of('package').length !== 1) err('Ledger must contain exactly one package record.');
if (state && of('package')[0]) {
  const p = of('package')[0];
  if (p.sha !== state.task.pinnedStartSha || p.branch !== state.task.targetBranch || p.repository !== state.task.repository) err('Package record does not match STATE baseline.');
}
const maps = Object.fromEntries(['evidence','flow','finding','work_item','verification'].map((t) => [t, new Map(of(t).map((r) => [r.id, r]))]));
function refs(value, type, label, requiredNow = false) {
  const ids = needArr(value, label, strict && requiredNow);
  for (const id of ids) if (!maps[type]?.has(id)) err(`${label} references unknown ${id}.`);
  return ids;
}

for (const r of of('evidence')) {
  need(r.claim, `${r.id}.claim`); need(r.sourceType, `${r.id}.sourceType`); need(r.pathOrSource, `${r.id}.pathOrSource`); need(r.result, `${r.id}.result`); need(r.limitations, `${r.id}.limitations`);
  if (r.sourceType !== 'EXTERNAL_STATE' && !/^[0-9a-f]{40}$/i.test(r.sha ?? '')) err(`${r.id}.sha is invalid.`);
  if (['SOURCE_CODE','CONTRACT','CONFIGURATION','MIGRATION','TEST'].includes(r.sourceType) && !nonempty(r.symbolOrRange)) err(`${r.id}.symbolOrRange is required.`);
}
for (const r of of('scope')) {
  need(r.entity, `${r.id}.entity`); need(r.entityType, `${r.id}.entityType`); need(r.reason, `${r.id}.reason`);
  if (!classes.has(r.classification)) err(`${r.id}.classification is invalid.`);
  refs(r.evidenceIds, 'evidence', `${r.id}.evidenceIds`, r.classification !== 'UNPROVEN');
  refs(r.flowIds ?? [], 'flow', `${r.id}.flowIds`);
  if (strict && r.classification === 'UNPROVEN') err(`${r.id} remains UNPROVEN.`);
  if (r.classification === 'NOT_AFFECTED_WITH_EVIDENCE' && !nonempty(r.reopenTrigger)) err(`${r.id}.reopenTrigger is required.`);
}
for (const r of of('authority')) { need(r.source, `${r.id}.source`); need(r.effect, `${r.id}.effect`); refs(r.evidenceIds, 'evidence', `${r.id}.evidenceIds`, true); }
for (const r of of('flow')) {
  for (const k of ['title','actor','intent','entry','success','failure','recovery','truthOwner']) need(r[k], `${r.id}.${k}`);
  for (const k of ['steps','surfaces','stateWriters','stateReaders']) needArr(r[k], `${r.id}.${k}`, true);
  needArr(r.sections, `${r.id}.sections`); refs(r.evidenceIds, 'evidence', `${r.id}.evidenceIds`, true);
}
for (const r of of('finding')) {
  for (const k of ['title','symptom','immediateCause','structuralCause','truthOwner','durableCorrection']) need(r[k], `${r.id}.${k}`);
  needArr(r.affectedIds, `${r.id}.affectedIds`, true); refs(r.evidenceIds, 'evidence', `${r.id}.evidenceIds`, true);
  refs(r.workItemIds, 'work_item', `${r.id}.workItemIds`, !['BLOCKED_EXTERNAL','REJECTED_WITH_EVIDENCE'].includes(r.status));
}
let active = 0;
for (const r of of('work_item')) {
  need(r.title, `${r.id}.title`); need(r.objective, `${r.id}.objective`); refs(r.findingIds, 'finding', `${r.id}.findingIds`, true);
  const changes = needArr(r.changes, `${r.id}.changes`, true); for (const [i,c] of changes.entries()) for (const k of ['path','symbol','action','after','forbidden']) need(c?.[k], `${r.id}.changes[${i}].${k}`);
  needArr(r.affectedSurfaces, `${r.id}.affectedSurfaces`, true); needArr(r.affectedJourneys, `${r.id}.affectedJourneys`, true); needArr(r.acceptance, `${r.id}.acceptance`, true);
  refs(r.verificationIds, 'verification', `${r.id}.verificationIds`, true); need(r.rollback, `${r.id}.rollback`); need(r.commitBoundary, `${r.id}.commitBoundary`); if (r.status === 'IN_PROGRESS') active++;
}
if (active > 1) err('Only one work item may be IN_PROGRESS.');
for (const r of of('verification')) {
  for (const k of ['title','command','proves','doesNotProve']) need(r[k], `${r.id}.${k}`); needArr(r.scopeIds, `${r.id}.scopeIds`, true);
  if (strict && r.required === true && !['PASS','BLOCKED_EXTERNAL','NOT_RUN_WITH_REASON'].includes(r.result?.status)) err(`${r.id} lacks a required result.`);
}
for (const r of of('deletion_candidate')) {
  for (const k of ['path','reason','replacement','migrationPrerequisite','rollback']) need(r[k], `${r.id}.${k}`); refs(r.evidenceIds, 'evidence', `${r.id}.evidenceIds`, true);
  if (strict && r.decision === 'DELETE' && r.verified !== true) err(`${r.id} deletion is unverified.`);
}
for (const r of of('decision')) { need(r.status, `${r.id}.status`); need(r.rationale, `${r.id}.rationale`); refs(r.evidenceIds, 'evidence', `${r.id}.evidenceIds`, true); }

const sectionPaths = [];
for (const p of ['apps/control-panel/runtime/src/app/(shell)/dsh','apps/control-panel/runtime/src/app/(shell)/wlt']) {
  const d = resolve(repo, p); if (!(await exists(d))) continue;
  for (const e of await readdir(d, { withFileTypes: true })) if (e.isDirectory()) sectionPaths.push(norm(join(d,e.name)));
}
const routeNames = new Set(['page.tsx','page.ts','route.ts','route.tsx','layout.tsx','loading.tsx','error.tsx','not-found.tsx','default.tsx']);
const cpRoot = resolve(repo, 'apps/control-panel/runtime/src/app');
const routePaths = (await walk(cpRoot, (p) => routeNames.has(p.split(sep).at(-1)))).map(norm);
const patterns = [/<button\b|<Button\b|\bonClick\s*=|\bonPress\s*=/,/<form\b|<Form\b|\bonSubmit\s*=/,/<Tabs?\b|<TabList\b|<TabTrigger\b/,/<Dialog\b|<Modal\b|<Drawer\b|<Sheet\b/,/<Table\b|selectedRows|bulkAction|bulk-action/i,/import|export|upload|download/i];
const interactive = new Set();
for (const d of [cpRoot,resolve(repo,'services/dsh/frontend/control-panel'),resolve(repo,'services/wlt/frontend/shared/dsh')]) for (const p of await walk(d,(x)=>['.tsx','.jsx'].includes(extname(x).toLowerCase()))) { const source = await text(p); if (patterns.some((x)=>x.test(source))) interactive.add(norm(p)); }
const scopes = of('scope');
const keys = new Set(scopes.map((r) => `${r.entityType}:${r.path ?? r.entity}`));
for (const s of surfaces) if (scopes.filter((r)=>r.entityType==='SURFACE'&&r.entity===s).length !== 1) err(`Required surface ${s} is missing or duplicated.`);
for (const p of sectionPaths) if (!keys.has(`CONTROL_PANEL_SECTION:${p}`)) err(`Missing section ${p}.`);
for (const p of routePaths) if (!keys.has(`CONTROL_PANEL_ROUTE_FILE:${p}`)) err(`Missing route ${p}.`);
for (const p of interactive) if (!keys.has(`INTERACTIVE_SOURCE:${p}`)) err(`Missing interactive source ${p}.`);
if (state) {
  const c = state.coverage ?? {};
  if (c.discoveredControlPanelSections !== sectionPaths.length) err('Control-panel section count drifted.');
  if (c.discoveredControlPanelRouteFiles !== routePaths.length) err('Control-panel route count drifted.');
  if (c.discoveredInteractiveSources !== interactive.size) err('Interactive-source count drifted.');
  if (c.ledgerRecords !== records.length) err('Ledger count drifted.');
}
if (strict) {
  if (!of('evidence').length || !of('authority').length || !of('decision').length) err('Strict mode requires evidence, authority, and decision records.');
  if (scopes.some((r)=>['AFFECTED','MIGRATION_REQUIRED','OBSOLETE_CANDIDATE','DUPLICATE_CANDIDATE'].includes(r.classification)) && !of('flow').length) err('Affected scope requires a flow record.');
  if (of('finding').length && !of('work_item').length) err('Findings require work items.');
  if (of('work_item').length && !of('verification').length) err('Work items require verifications.');
}
if (disposal) {
  if (!strict) err('--disposal requires --strict.');
  if (state?.disposability?.durableOutputsMigratedToCanonicalOwners !== true || state?.disposability?.referenceScanPassed !== true) err('Disposal proof is incomplete.');
  const rel = norm(pkg), refsFound = [];
  for (const p of await walk(repo,()=>true,new Set(['.git','node_modules','.next','dist']))) {
    if (p.startsWith(`${pkg}${sep}`) || (await stat(p)).size > 2_000_000) continue;
    if (!['.md','.txt','.json','.jsonl','.yaml','.yml','.ts','.tsx','.js','.mjs','.cjs','.go','.sql','.ps1','.sh'].includes(extname(p).toLowerCase())) continue;
    if ((await text(p)).includes(rel)) refsFound.push(norm(p));
  }
  if (refsFound.length) err(`Outside package references: ${refsFound.join(', ')}`);
}

for (const x of warnings) console.warn(`WARN: ${x}`); for (const x of errors) console.error(`ERROR: ${x}`);
console.log(JSON.stringify({ package:norm(pkg), strict, disposal, records:records.length, surfaces:scopes.filter((r)=>r.entityType==='SURFACE').length, controlPanelSections:sectionPaths.length, controlPanelRoutes:routePaths.length, interactiveSources:interactive.size, evidence:of('evidence').length, flows:of('flow').length, findings:of('finding').length, workItems:of('work_item').length, verifications:of('verification').length, errors:errors.length, warnings:warnings.length, decision:errors.length?'FIX_REQUIRED':'PASS' }, null, 2));
if (errors.length) process.exitCode = 1;
