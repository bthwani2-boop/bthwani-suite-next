#!/usr/bin/env node
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(frameworkRoot, '_template');
const repositoryRoot = resolve(frameworkRoot, '..', '..');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Unexpected positional argument: ${token}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${token}`);
    out[token.slice(2)] = value;
    i += 1;
  }
  return out;
}

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

function replaceAll(text, replacements) {
  let output = text;
  for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value);
  return output;
}

function normalize(path) {
  return relative(repositoryRoot, path).split(sep).join('/');
}

const args = parseArgs(process.argv.slice(2));
const name = args.name;
const branch = args.branch;
const sha = args.sha;
const primarySurface = args.surface;
const repository = args.repository ?? 'bthwani2-boop/bthwani-suite-next';
const objective = args.objective ?? `Diagnose the repository deeply and prepare complete execution for ${primarySurface ?? name ?? 'the requested scope'} and every related journey.`;

if (!name || !branch || !sha || !primarySurface) {
  throw new Error('Usage: new-package.mjs --name <task-name> --branch <branch> --sha <40-sha> --surface <surface> [--objective <text>] [--repository owner/repo]');
}
if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(name) || name === '_template' || name.includes('..')) throw new Error('Unsafe task name.');
if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error('SHA must be exactly 40 hexadecimal characters.');
if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..')) throw new Error('Unsafe branch.');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Repository must use owner/name.');
if (!primarySurface.trim()) throw new Error('Primary surface is required.');

const destination = resolve(frameworkRoot, name);
if (!destination.startsWith(`${resolve(frameworkRoot)}${sep}`)) throw new Error('Destination escapes framework root.');
if (await exists(destination)) throw new Error(`Destination already exists: ${destination}`);

const taskId = `PKG-${name.toUpperCase().replace(/-/g, '_')}`;
const replacements = {
  TASK_NAME: name,
  TASK_PACKAGE_ID: taskId,
  TASK_OBJECTIVE: objective,
  PRIMARY_SURFACE: primarySurface,
  CREATED_AT_ISO: new Date().toISOString(),
  REPOSITORY_NAME: repository,
  TARGET_BRANCH: branch,
  PINNED_START_SHA: sha.toLowerCase(),
};

const templates = [
  ['START-HERE.template.md', 'START-HERE.md'],
  ['MANIFEST.template.json', 'MANIFEST.json'],
  ['GLOBAL-DIAGNOSIS.template.md', 'GLOBAL-DIAGNOSIS.md'],
  ['COVERAGE.template.json', 'COVERAGE.json'],
  ['EXECUTION-ORDER.template.json', 'EXECUTION-ORDER.json'],
  ['CLOSURE.template.md', 'CLOSURE.md'],
];

await mkdir(destination);
await mkdir(join(destination, 'units'));
for (const [source, target] of templates) {
  const content = replaceAll(await readFile(join(templateRoot, source), 'utf8'), replacements);
  await writeFile(join(destination, target), content, 'utf8');
}

const coveragePath = join(destination, 'COVERAGE.json');
const coverage = JSON.parse(await readFile(coveragePath, 'utf8'));
const entries = [];
let sequence = 1;
const nextId = () => `COV-${String(sequence++).padStart(3, '0')}`;
const add = (entityType, entryName, path, domain) => entries.push({
  coverageId: nextId(),
  entityType,
  name: entryName,
  path,
  domain,
  assessment: 'UNASSESSED',
  evidenceRefs: [],
  executionDisposition: 'UNDECIDED',
  unitIds: [],
  summary: '',
  exclusionReason: null,
  reopenTrigger: null,
});

add('REPOSITORY', repository, '.', 'GLOBAL');
const surfaces = [
  ['control-panel', 'apps/control-panel/runtime'],
  ['app-client', 'apps/app-client/runtime'],
  ['app-partner', 'apps/app-partner/runtime'],
  ['app-captain', 'apps/app-captain/runtime'],
  ['app-field', 'apps/app-field/runtime'],
];
for (const [surface, candidate] of surfaces) add('SURFACE', surface, (await exists(resolve(repositoryRoot, candidate))) ? candidate : null, 'PRODUCT');

for (const [domain, rootPath] of [
  ['DSH', 'apps/control-panel/runtime/src/app/(shell)/dsh'],
  ['WLT', 'apps/control-panel/runtime/src/app/(shell)/wlt'],
]) {
  const root = resolve(repositoryRoot, rootPath);
  if (!(await exists(root))) continue;
  const dirs = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of dirs) add('CONTROL_PANEL_SECTION', entry.name, normalize(join(root, entry.name)), domain);
}

const domains = [
  ['DSH_SHARED_FRONTEND', 'services/dsh/frontend/shared', 'DSH'],
  ['DSH_BACKEND', 'services/dsh/backend', 'DSH'],
  ['DSH_DATABASE', 'services/dsh/database', 'DSH'],
  ['WLT_RELATED', 'services/wlt', 'WLT'],
  ['CONTRACTS_AND_CLIENTS', null, 'CONTRACT'],
  ['EVENTS_JOBS_INTEGRATIONS', null, 'RUNTIME'],
  ['IDENTITY_AUTHORIZATION_SECURITY', null, 'SECURITY'],
  ['TESTS_AND_QUALITY', null, 'QUALITY'],
  ['RUNTIME_AND_OBSERVABILITY', null, 'RUNTIME'],
  ['CI_TOOLING_AUTOMATION', null, 'TOOLING'],
  ['GOVERNANCE_AND_OWNERSHIP', 'governance', 'GOVERNANCE'],
];
for (const [domainName, candidate, domain] of domains) {
  const path = candidate && await exists(resolve(repositoryRoot, candidate)) ? candidate : candidate;
  add('DOMAIN', domainName, path, domain);
}

coverage.entries = entries;
coverage.taskId = taskId;
await writeFile(coveragePath, `${JSON.stringify(coverage, null, 2)}\n`, 'utf8');

console.log(`Created package: ${destination}`);
console.log(`Pinned baseline: ${repository}@${branch} ${sha.toLowerCase()}`);
console.log(`Seeded compact coverage entries: ${entries.length}`);
console.log('Next: complete repository-wide diagnosis, classify every coverage entry, create only proven execution units, then run --strict.');
