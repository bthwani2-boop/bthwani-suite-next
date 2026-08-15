#!/usr/bin/env node
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(frameworkRoot, '_template');

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
async function exists(path) { try { await access(path, constants.F_OK); return true; } catch { return false; } }
function meta(text) {
  const out = {};
  const header = text.split(/\r?\n##\s+/)[0];
  for (const line of header.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
function replaceAll(text, replacements) {
  let output = text;
  for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value);
  return output;
}
function parseFrontier(value) { return !value || value === 'NONE' ? [] : value.split(',').map((x) => x.trim()).filter(Boolean); }
function serializeFrontier(values) { return values.length ? values.join(',') : 'NONE'; }

const args = parseArgs(process.argv.slice(2));
const packageName = args.package;
const name = args.name;
const title = args.title ?? name;
const baseSha = args['base-sha'];
const basis = args.basis;
const dependsOn = args['depends-on'] ?? 'NONE';
const suspendCurrent = (args['suspend-current'] ?? 'NO').toUpperCase();
const parallel = (args.parallel ?? 'NO').toUpperCase();

if (!packageName || !name || !baseSha || !basis) throw new Error('Usage: new-sequence.mjs --package <task-name> --name <slug> [--title <title>] --base-sha <40-sha> --basis <root-graph-proven-boundary> [--depends-on <SEQ-NNN|NONE>] [--suspend-current YES|NO] [--parallel YES|NO]');
if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(packageName) || packageName === '_template' || packageName.includes('..')) throw new Error('Unsafe package name.');
if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(name) || name.includes('..')) throw new Error('Unsafe sequence name.');
if (!/^[0-9a-f]{40}$/i.test(baseSha)) throw new Error('base-sha must be exactly 40 hexadecimal characters.');
if (!basis.trim()) throw new Error('basis must explain the proven root-graph closure boundary.');
if (!(dependsOn === 'NONE' || /^(SEQ-\d{3})(,\s*SEQ-\d{3})*$/.test(dependsOn))) throw new Error('depends-on must be NONE or comma-separated SEQ-NNN IDs.');
if (!['YES','NO'].includes(suspendCurrent) || !['YES','NO'].includes(parallel)) throw new Error('suspend-current/parallel must be YES or NO.');
if (suspendCurrent === 'YES' && parallel === 'YES') throw new Error('suspend-current and parallel cannot both be YES.');

const packageRoot = resolve(frameworkRoot, packageName);
if (!packageRoot.startsWith(`${resolve(frameworkRoot)}${sep}`)) throw new Error('Package path escapes framework root.');
const overviewPath = join(packageRoot, '00-OVERVIEW.md');
if (!(await exists(overviewPath))) throw new Error('V2 package must contain 00-OVERVIEW.md.');

let overview = await readFile(overviewPath, 'utf8');
const om = meta(overview);
if (om.PACKAGE_SCHEMA !== 'BTHWANI_TASK_PACKAGE_V2') throw new Error('Package is not BTHWANI_TASK_PACKAGE_V2.');
if (!om.ORCHESTRATION_ROOT) throw new Error('ORCHESTRATION_ROOT is required.');
if (om.NAVIGATION_POLICY !== 'ROOT_ANCHORED_GRAPH_ONLY') throw new Error('NAVIGATION_POLICY must be ROOT_ANCHORED_GRAPH_ONLY.');
if (om.LATEST_HEAD_ROLE !== 'TRUTH_INTEGRATION_BASELINE_ONLY') throw new Error('LATEST_HEAD_ROLE must be TRUTH_INTEGRATION_BASELINE_ONLY.');
if (om.ROOT_RECONCILIATION_REQUIRED !== 'NO') throw new Error('Root reconciliation is still required; do not derive a Sequence from persisted/latest-commit context.');
if ((om.ROOT_RECONCILED_SHA ?? '').toLowerCase() !== baseSha.toLowerCase()) throw new Error('ROOT_RECONCILED_SHA must equal base-sha.');
if ((om.LATEST_RECONCILED_SHA ?? '').toLowerCase() !== baseSha.toLowerCase()) throw new Error('base-sha must equal LATEST_RECONCILED_SHA.');
if (om.FRONTIER_DERIVATION_SOURCE !== 'ROOT_GRAPH') throw new Error('FRONTIER_DERIVATION_SOURCE must be ROOT_GRAPH before Sequence creation.');

const frontier = parseFrontier(om.ACTIVE_EXECUTION_FRONTIER);
let suspensionStacks = om.SUSPENSION_STACKS ?? 'NONE';

const entries = await readdir(packageRoot, { withFileTypes: true });
if (entries.some((e) => e.isDirectory())) throw new Error('V2 packages must not contain subdirectories.');

if (suspendCurrent === 'YES') {
  if (frontier.length !== 1) throw new Error('suspend-current requires exactly one current active focus.');
  const currentId = frontier[0];
  const currentEntry = entries.find((e) => e.isFile() && new RegExp(`^${currentId.slice(4)}-[a-z0-9-]+\\.md$`).test(e.name));
  if (!currentEntry) throw new Error(`Current focus file not found for ${currentId}.`);
  const cm = meta(await readFile(join(packageRoot, currentEntry.name), 'utf8'));
  if (cm.SEQUENCE_STATUS !== 'SUSPENDED_BY_DEPENDENCY') throw new Error(`${currentId} must already be SUSPENDED_BY_DEPENDENCY.`);
  suspensionStacks = suspensionStacks === 'NONE' ? currentId : `${suspensionStacks};${currentId}`;
} else if (frontier.length && parallel !== 'YES') {
  throw new Error(`Active frontier is not empty (${frontier.join(',')}). Use --parallel YES only for graph-proven independence or suspend current for upstream backtrack.`);
}

const ordinals = entries.filter((e) => e.isFile() && /^\d{3}-[a-z0-9-]+\.md$/.test(e.name)).map((e) => Number(e.name.slice(0, 3)));
const nextOrder = ordinals.length ? Math.max(...ordinals) + 1 : 1;
if (nextOrder > 999) throw new Error('Sequence ordinal limit exceeded.');
const order = String(nextOrder).padStart(3, '0');
const sequenceId = `SEQ-${order}`;
const filename = `${order}-${name}.md`;
const destination = join(packageRoot, filename);
if (await exists(destination)) throw new Error(`Sequence file already exists: ${filename}`);

const template = await readFile(join(templateRoot, 'SEQUENCE.template.md'), 'utf8');
const content = replaceAll(template, {
  '__TASK_ID__': om.TASK_ID, '__REPOSITORY__': om.REPOSITORY, '__BRANCH__': om.BRANCH, '__MODE__': om.MODE,
  '__SEQUENCE_ID__': sequenceId, '__SEQUENCE_NAME__': name, '__SEQUENCE_TITLE__': title, '__SEQUENCE_ORDER__': order,
  '__BASE_SHA__': baseSha.toLowerCase(), '__DERIVATION_BASIS__': basis, '__DEPENDS_ON__': dependsOn,
});

const marker = '<!-- SEQUENCE_REGISTRY_ROWS -->';
if (!overview.includes(marker)) throw new Error('Overview sequence registry marker is missing.');
const row = `| ${sequenceId} | \`${filename}\` | ${title.replaceAll('|', '\\|')} | ${basis.replaceAll('|', '\\|')} | ${dependsOn} | TBD | UNCLASSIFIED | UNASSIGNED | DIAGNOSING | material finding/decision/head drift |`;
const nextFrontier = parallel === 'YES' ? [...frontier, sequenceId] : [sequenceId];
overview = overview.replace(/^ACTIVE_EXECUTION_FRONTIER:\s*.*$/m, `ACTIVE_EXECUTION_FRONTIER: ${serializeFrontier(nextFrontier)}`);
overview = overview.replace(/^SUSPENSION_STACKS:\s*.*$/m, `SUSPENSION_STACKS: ${suspensionStacks}`);
overview = overview.replace(/^FRONTIER_VALID:\s*.*$/m, 'FRONTIER_VALID: YES');
overview = overview.replace(marker, `${row}\n${marker}`);

await writeFile(destination, content, { encoding: 'utf8', flag: 'wx' });
await writeFile(overviewPath, overview, 'utf8');

console.log(`Created ${sequenceId}: ${filename}`);
console.log('Frontier was derived from the root-reconciled graph, not commit recency.');
