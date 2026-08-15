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
function cell(value) { return String(value).replaceAll('|', '\\|').replace(/\r?\n/g, ' '); }

const args = parseArgs(process.argv.slice(2));
const packageName = args.package;
const name = args.name;
const title = args.title ?? name;
const baseSha = args['base-sha'];
const basis = args.basis;
const clusterId = args.cluster;
const priorityClass = (args['priority-class'] ?? '').toUpperCase();
const priorityBasis = args['priority-basis'];
const dependsOn = args['depends-on'] ?? 'NONE';
const suspendCurrent = (args['suspend-current'] ?? 'NO').toUpperCase();
const parallel = (args.parallel ?? 'NO').toUpperCase();
const allowedPriorityClasses = new Set(['PRIMARY_SYSTEMIC','UPSTREAM_FOUNDATION','INDEPENDENT_PARALLEL','DEPENDENT_SECONDARY','LEAF_LOCAL']);

if (!packageName || !name || !baseSha || !basis || !clusterId || !priorityClass || !priorityBasis) {
  throw new Error('Usage: new-sequence.mjs --package <task-name> --name <slug> [--title <title>] --base-sha <40-sha> --cluster <RC-NNN> --priority-class <PRIMARY_SYSTEMIC|UPSTREAM_FOUNDATION|INDEPENDENT_PARALLEL|DEPENDENT_SECONDARY|LEAF_LOCAL> --priority-basis <comparative-proof> --basis <root-graph-proven-boundary> [--depends-on <SEQ-NNN|NONE>] [--suspend-current YES|NO] [--parallel YES|NO]');
}
if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(packageName) || packageName === '_template' || packageName.includes('..')) throw new Error('Unsafe package name.');
if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(name) || name.includes('..')) throw new Error('Unsafe sequence name.');
if (!/^[0-9a-f]{40}$/i.test(baseSha)) throw new Error('base-sha must be exactly 40 hexadecimal characters.');
if (!/^RC-\d{3}$/.test(clusterId)) throw new Error('cluster must be RC-NNN.');
if (!allowedPriorityClasses.has(priorityClass)) throw new Error('priority-class is invalid.');
if (!priorityBasis.trim()) throw new Error('priority-basis must explain comparative systemic leverage against other material clusters.');
if (!basis.trim()) throw new Error('basis must explain the proven root-graph closure boundary.');
if (!(dependsOn === 'NONE' || /^(SEQ-\d{3})(,\s*SEQ-\d{3})*$/.test(dependsOn))) throw new Error('depends-on must be NONE or comma-separated SEQ-NNN IDs.');
if (!['YES','NO'].includes(suspendCurrent) || !['YES','NO'].includes(parallel)) throw new Error('suspend-current/parallel must be YES or NO.');
if (suspendCurrent === 'YES' && parallel === 'YES') throw new Error('suspend-current and parallel cannot both be YES.');
if (parallel === 'YES' && priorityClass !== 'INDEPENDENT_PARALLEL') throw new Error('--parallel YES requires priority-class=INDEPENDENT_PARALLEL.');
if (parallel === 'NO' && priorityClass === 'INDEPENDENT_PARALLEL') throw new Error('priority-class=INDEPENDENT_PARALLEL requires --parallel YES.');

const packageRoot = resolve(frameworkRoot, packageName);
if (!packageRoot.startsWith(`${resolve(frameworkRoot)}${sep}`)) throw new Error('Package path escapes framework root.');
const overviewPath = join(packageRoot, '00-OVERVIEW.md');
if (!(await exists(overviewPath))) throw new Error('V2 package must contain 00-OVERVIEW.md.');

let overview = await readFile(overviewPath, 'utf8');
const om = meta(overview);
if (om.PACKAGE_SCHEMA !== 'BTHWANI_TASK_PACKAGE_V2') throw new Error('Package is not BTHWANI_TASK_PACKAGE_V2.');
if (om.RESUME_POLICY !== 'EXPLICIT_USER_REQUEST_ONLY') throw new Error('RESUME_POLICY drift.');
if (om.TASK_CONTEXT_POLICY !== 'ISOLATED_CURRENT_TASK_ONLY') throw new Error('TASK_CONTEXT_POLICY drift.');
if (om.FOREIGN_DELTA_POLICY !== 'INPUT_NOT_INSTRUCTION') throw new Error('FOREIGN_DELTA_POLICY drift.');
if (!om.INTEGRATION_TARGET || om.INTEGRATION_TARGET !== om.BRANCH) throw new Error('INTEGRATION_TARGET must equal BRANCH.');
if (!om.TASK_BRANCH || om.TASK_BRANCH === 'UNSET' || om.TASK_BRANCH === om.INTEGRATION_TARGET) throw new Error('Dedicated TASK_BRANCH is required and must differ from Integration Target.');
if (om.TASK_BRANCH_READY !== 'YES') throw new Error('TASK_BRANCH_READY must be YES before Sequence creation.');
if (om.WORKSPACE_ISOLATION_READY !== 'YES') throw new Error('WORKSPACE_ISOLATION_READY must be YES before Sequence creation.');
if (!['LOCAL_WORKTREE','REMOTE_TASK_BRANCH'].includes(om.WORKSPACE_ISOLATION_MODE)) throw new Error('WORKSPACE_ISOLATION_MODE must be LOCAL_WORKTREE or REMOTE_TASK_BRANCH.');
if (om.DIRECT_INTEGRATION_TARGET_WRITES !== 'FORBIDDEN_EXCEPT_INTEGRATION_OWNER') throw new Error('Direct Integration Target write policy drift.');
if (!om.ORCHESTRATION_ROOT) throw new Error('ORCHESTRATION_ROOT is required.');
if (om.NAVIGATION_POLICY !== 'ROOT_ANCHORED_GRAPH_ONLY') throw new Error('NAVIGATION_POLICY must be ROOT_ANCHORED_GRAPH_ONLY.');
if (om.LATEST_HEAD_ROLE !== 'TRUTH_INTEGRATION_BASELINE_ONLY') throw new Error('LATEST_HEAD_ROLE must be TRUTH_INTEGRATION_BASELINE_ONLY.');
if (om.ROOT_RECONCILIATION_REQUIRED !== 'NO') throw new Error('Root reconciliation is still required; do not derive a Sequence from persisted/latest-commit context.');
if ((om.ROOT_RECONCILED_SHA ?? '').toLowerCase() !== baseSha.toLowerCase()) throw new Error('ROOT_RECONCILED_SHA must equal base-sha.');
if ((om.LATEST_RECONCILED_SHA ?? '').toLowerCase() !== baseSha.toLowerCase()) throw new Error('base-sha must equal LATEST_RECONCILED_SHA.');

if (om.TARGET_LANDSCAPE_COMPLETE !== 'YES') throw new Error('TARGET_LANDSCAPE_COMPLETE must be YES before Sequence creation.');
if ((om.LANDSCAPE_RECONCILED_SHA ?? '').toLowerCase() !== baseSha.toLowerCase()) throw new Error('LANDSCAPE_RECONCILED_SHA must equal base-sha.');
if (om.ROOT_CAUSE_CLUSTERING_COMPLETE !== 'YES') throw new Error('ROOT_CAUSE_CLUSTERING_COMPLETE must be YES.');
if (om.ROOT_CAUSE_CLUSTERS_ACCOUNTED !== 'YES') throw new Error('ROOT_CAUSE_CLUSTERS_ACCOUNTED must be YES.');
if (om.UNCLUSTERED_MATERIAL_FINDINGS !== '0') throw new Error('UNCLUSTERED_MATERIAL_FINDINGS must be 0.');
if (om.PRIORITY_MODEL_COMPLETE !== 'YES') throw new Error('PRIORITY_MODEL_COMPLETE must be YES.');
if (om.PRIORITY_DERIVATION_SOURCE !== 'ROOT_CAUSE_LANDSCAPE') throw new Error('PRIORITY_DERIVATION_SOURCE must be ROOT_CAUSE_LANDSCAPE.');
if (om.UNRANKED_MATERIAL_CLUSTERS !== '0') throw new Error('UNRANKED_MATERIAL_CLUSTERS must be 0.');
if (om.PRIMARY_FRONTIER_JUSTIFIED !== 'YES') throw new Error('PRIMARY_FRONTIER_JUSTIFIED must be YES.');
if (om.LANDSCAPE_ADVERSARIAL_PASS !== 'YES') throw new Error('LANDSCAPE_ADVERSARIAL_PASS must be YES.');
if (om.PRIORITY_POLICY !== 'HIGHEST_PROVEN_SYSTEMIC_LEVERAGE') throw new Error('PRIORITY_POLICY drift.');
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
  throw new Error(`Active frontier is not empty (${frontier.join(',')}). Use --parallel YES only for graph-proven independent priority frontier or suspend current for upstream backtrack.`);
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
  '__TASK_ID__': om.TASK_ID,
  '__REPOSITORY__': om.REPOSITORY,
  '__BRANCH__': om.BRANCH,
  '__TASK_BRANCH__': om.TASK_BRANCH,
  '__MODE__': om.MODE,
  '__SEQUENCE_ID__': sequenceId,
  '__SEQUENCE_NAME__': name,
  '__SEQUENCE_TITLE__': title,
  '__SEQUENCE_ORDER__': order,
  '__BASE_SHA__': baseSha.toLowerCase(),
  '__ROOT_CAUSE_CLUSTER_ID__': clusterId,
  '__PRIORITY_CLASS__': priorityClass,
  '__PRIORITY_BASIS__': priorityBasis,
  '__DERIVATION_BASIS__': basis,
  '__DEPENDS_ON__': dependsOn,
});

const marker = '<!-- SEQUENCE_REGISTRY_ROWS -->';
if (!overview.includes(marker)) throw new Error('Overview sequence registry marker is missing.');
const row = `| ${sequenceId} | \`${filename}\` | ${cell(title)} | ${clusterId} | ${priorityClass} | ${cell(priorityBasis)} | ${cell(basis)} | ${dependsOn} | TBD | UNCLASSIFIED | UNASSIGNED | DIAGNOSING | material finding/decision/head/landscape drift |`;
const nextFrontier = parallel === 'YES' ? [...frontier, sequenceId] : [sequenceId];
overview = overview.replace(/^ACTIVE_EXECUTION_FRONTIER:\s*.*$/m, `ACTIVE_EXECUTION_FRONTIER: ${serializeFrontier(nextFrontier)}`);
overview = overview.replace(/^SUSPENSION_STACKS:\s*.*$/m, `SUSPENSION_STACKS: ${suspensionStacks}`);
overview = overview.replace(/^FRONTIER_VALID:\s*.*$/m, 'FRONTIER_VALID: YES');
overview = overview.replace(marker, `${row}\n${marker}`);

await writeFile(destination, content, { encoding: 'utf8', flag: 'wx' });
await writeFile(overviewPath, overview, 'utf8');

console.log(`Created ${sequenceId}: ${filename}`);
console.log(`ROOT_CAUSE_CLUSTER_ID=${clusterId}`);
console.log(`PRIORITY_CLASS=${priorityClass}`);
console.log(`TASK_BRANCH=${om.TASK_BRANCH}`);
console.log('Frontier was derived from the root-reconciled, target-wide prioritized root-cause landscape in an isolated task context.');
