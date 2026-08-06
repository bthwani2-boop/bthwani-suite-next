#!/usr/bin/env node

import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(frameworkRoot, '_template');
const repositoryRoot = resolve(frameworkRoot, '..', '..');

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected positional argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    result[key] = value;
    index += 1;
  }
  return result;
}

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function replaceAll(text, replacements) {
  let output = text;
  for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value);
  return output;
}

async function walk(root, predicate = () => true) {
  if (!(await exists(root))) return [];
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && predicate(absolute)) files.push(absolute);
    }
  }
  await visit(root);
  return files;
}

function normalizePath(path) {
  return relative(repositoryRoot, path).split(sep).join('/');
}

const args = parseArgs(process.argv.slice(2));
const name = args.name;
const branch = args.branch;
const sha = args.sha;
const repository = args.repository ?? 'bthwani2-boop/bthwani-suite-next';
const mode = args.mode ?? 'DIAGNOSIS_AND_EXECUTION_PLAN';
const objective = args.objective ?? `Diagnose and produce an executable evidence-backed plan for ${name ?? 'the requested task'}`;

if (!name || !branch || !sha) {
  throw new Error('Usage: node tools/diagnose-implementing/new-package.mjs --name <task-name> --branch <branch> --sha <40-character-sha> [--objective <measurable objective>] [--repository owner/repo] [--mode <mode>]');
}
if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(name) || name === '_template' || name.includes('..')) {
  throw new Error('Task name must be 3-80 lowercase letters, digits, or hyphens and may not be reserved.');
}
if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error('The pinned SHA must contain exactly 40 hexadecimal characters.');
if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..') || branch.startsWith('/') || branch.endsWith('/')) {
  throw new Error(`Unsafe branch value: ${branch}`);
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error(`Repository must use owner/name form: ${repository}`);

const destination = resolve(frameworkRoot, name);
if (!destination.startsWith(`${resolve(frameworkRoot)}${sep}`)) throw new Error('Destination escapes tools/diagnose-implementing.');
if (await exists(destination)) throw new Error(`Destination already exists: ${destination}`);

const now = new Date().toISOString();
const taskId = `PKG-${name.toUpperCase().replace(/-/g, '_')}`;
const replacements = {
  TASK_NAME: name,
  TASK_SLUG: name,
  TASK_PACKAGE_ID: taskId,
  TASK_OBJECTIVE: objective,
  TARGET_BRANCH: branch,
  PINNED_START_SHA: sha.toLowerCase(),
  CREATED_AT_ISO: now,
  AGENT_OR_OPERATOR: args.actor ?? 'UNRECORDED',
  REPOSITORY_NAME: repository,
  REQUESTED_MODE: mode,
};

const requiredSurfaceCandidates = [
  ['control-panel', ['apps/control-panel/runtime', 'services/dsh/frontend/control-panel']],
  ['app-client', ['apps/app-client/runtime', 'services/dsh/frontend/app-client']],
  ['app-partner', ['apps/app-partner/runtime', 'services/dsh/frontend/app-partner']],
  ['app-captain', ['apps/app-captain/runtime', 'services/dsh/frontend/app-captain']],
  ['app-field', ['apps/app-field/runtime', 'services/dsh/frontend/app-field']],
];

const scopeRecords = [];
let sequence = 1;
const nextId = () => `SCP-${String(sequence++).padStart(5, '0')}`;

for (const [surface, candidates] of requiredSurfaceCandidates) {
  const paths = [];
  for (const candidate of candidates) if (await exists(resolve(repositoryRoot, candidate))) paths.push(candidate);
  scopeRecords.push({
    type: 'scope',
    id: nextId(),
    entity: surface,
    entityType: 'SURFACE',
    path: paths[0] ?? null,
    paths,
    parentId: null,
    classification: 'UNPROVEN',
    reason: 'Generated from the mandatory surface coverage rule; classify with evidence.',
    evidenceIds: [],
    consumerIds: [],
    flowIds: [],
  });
}

const controlPanelRoots = [
  ['DSH', resolve(repositoryRoot, 'apps/control-panel/runtime/src/app/(shell)/dsh')],
  ['WLT', resolve(repositoryRoot, 'apps/control-panel/runtime/src/app/(shell)/wlt')],
];

const sectionPaths = [];
for (const [domain, root] of controlPanelRoots) {
  if (!(await exists(root))) continue;
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = normalizePath(join(root, entry.name));
    sectionPaths.push(path);
    scopeRecords.push({
      type: 'scope', id: nextId(), entity: entry.name, entityType: 'CONTROL_PANEL_SECTION', domain,
      path, parentId: null, classification: 'UNPROVEN',
      reason: 'Discovered from the current control-panel route tree; inspect the section and everything beneath it.',
      evidenceIds: [], consumerIds: [], flowIds: [],
    });
  }
}

const routeNames = new Set(['page.tsx', 'page.ts', 'route.ts', 'route.tsx', 'layout.tsx', 'loading.tsx', 'error.tsx', 'not-found.tsx', 'default.tsx']);
const controlPanelAppRoot = resolve(repositoryRoot, 'apps/control-panel/runtime/src/app');
const routeFiles = (await walk(controlPanelAppRoot, (path) => routeNames.has(path.split(sep).at(-1)))).sort();
for (const absolute of routeFiles) {
  const path = normalizePath(absolute);
  scopeRecords.push({
    type: 'scope', id: nextId(), entity: path.split('/').at(-1), entityType: 'CONTROL_PANEL_ROUTE_FILE',
    path, parentId: null, classification: 'UNPROVEN',
    reason: 'Discovered route-bearing file; classify its page, route, states, permissions, reads, writes, and cross-surface effects.',
    evidenceIds: [], consumerIds: [], flowIds: [],
  });
}

const interactivePatterns = [
  ['BUTTON_OR_CLICK', /<button\b|<Button\b|\bonClick\s*=|\bonPress\s*=/],
  ['FORM_OR_SUBMIT', /<form\b|<Form\b|\bonSubmit\s*=/],
  ['TAB', /<Tabs?\b|<TabList\b|<TabTrigger\b/],
  ['DIALOG_OR_DRAWER', /<Dialog\b|<Modal\b|<Drawer\b|<Sheet\b/],
  ['TABLE_OR_BULK_ACTION', /<Table\b|selectedRows|bulkAction|bulk-action/i],
  ['IMPORT_EXPORT_UPLOAD', /import|export|upload|download/i],
];
const candidateInteractiveRoots = [
  controlPanelAppRoot,
  resolve(repositoryRoot, 'services/dsh/frontend/control-panel'),
  resolve(repositoryRoot, 'services/wlt/frontend/shared/dsh'),
];
const interactiveByPath = new Map();
for (const root of candidateInteractiveRoots) {
  for (const absolute of await walk(root, (path) => ['.tsx', '.jsx'].includes(extname(path).toLowerCase()))) {
    const text = await readFile(absolute, 'utf8');
    const kinds = interactivePatterns.filter(([, pattern]) => pattern.test(text)).map(([kind]) => kind);
    if (kinds.length) interactiveByPath.set(normalizePath(absolute), [...new Set([...(interactiveByPath.get(normalizePath(absolute)) ?? []), ...kinds])]);
  }
}
for (const [path, interactiveKinds] of [...interactiveByPath.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  scopeRecords.push({
    type: 'scope', id: nextId(), entity: path.split('/').at(-1), entityType: 'INTERACTIVE_SOURCE', path,
    interactiveKinds, parentId: null, classification: 'UNPROVEN',
    reason: 'Static discovery found interactive UI signals; enumerate and trace all actual tabs, features, actions, states, permissions, reads, writes, and journeys.',
    evidenceIds: [], consumerIds: [], flowIds: [],
  });
}

await mkdir(destination, { recursive: false });
const stateText = replaceAll(await readFile(join(templateRoot, 'STATE.template.json'), 'utf8'), replacements);
const state = JSON.parse(stateText);
state.task.mode = mode;
state.task.objective = objective;
state.coverage.discoveredControlPanelSections = sectionPaths.length;
state.coverage.discoveredControlPanelRouteFiles = routeFiles.length;
state.coverage.discoveredInteractiveSources = interactiveByPath.size;
state.coverage.ledgerRecords = 1 + scopeRecords.length;
state.gates.unclassifiedSurfaces = requiredSurfaceCandidates.length;
state.gates.unclassifiedControlPanelSections = sectionPaths.length;
state.gates.unclassifiedControlPanelRoutes = routeFiles.length;
state.gates.unclassifiedPagesAndTabs = routeFiles.length;
state.gates.unmappedButtonsAndActions = interactiveByPath.size;
state.gates.unmappedFeatures = interactiveByPath.size;
state.gates.unmappedAdminWrites = 1;
state.gates.unmappedStateReaders = 1;
state.gates.unmappedCrossSurfaceConsumers = 1;
state.gates.unmappedInboundJourneys = 1;
state.gates.unmappedOutboundJourneys = 1;
state.gates.unverifiedCrossSurfaceEffects = 1;
state.gates.unverifiedPermissions = 1;
state.gates.unverifiedFailureStates = 1;
state.gates.claimsWithoutEvidence = scopeRecords.length;
state.gates.openInternalGaps = 1;
await writeFile(join(destination, 'STATE.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');

await writeFile(join(destination, 'PACKAGE.md'), replaceAll(await readFile(join(templateRoot, 'PACKAGE.template.md'), 'utf8'), replacements), 'utf8');
const ledgerHeader = replaceAll(await readFile(join(templateRoot, 'LEDGER.template.jsonl'), 'utf8'), replacements).trim();
const ledgerLines = [ledgerHeader, ...scopeRecords.map((record) => JSON.stringify(record))];
await writeFile(join(destination, 'LEDGER.jsonl'), `${ledgerLines.join('\n')}\n`, 'utf8');

console.log(`Created compact diagnosis/execution package: ${destination}`);
console.log(`Pinned remote baseline: ${repository}@${branch} ${sha.toLowerCase()}`);
console.log(`Seeded mandatory surfaces: ${requiredSurfaceCandidates.length}`);
console.log(`Discovered control-panel sections: ${sectionPaths.length}`);
console.log(`Discovered control-panel route files: ${routeFiles.length}`);
console.log(`Discovered interactive source files: ${interactiveByPath.size}`);
console.log(`Next: classify every seeded record, add evidence/flows/findings/work items/verifications, set all gates to zero, then run:`);
console.log(`node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/${name} --strict`);
