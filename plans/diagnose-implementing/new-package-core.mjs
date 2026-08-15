#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(frameworkRoot, '_template');
const orchestratorPath = 'tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md';

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
function replaceAll(text, replacements) {
  let output = text;
  for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value);
  return output;
}
function slug(value) {
  return (value || 'task')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/^-+|-+$/g, '') || 'task';
}
function uniqueName(target, sha) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const base = `orch-${slug(target).slice(0, 30)}-${stamp}-${sha.slice(0, 8).toLowerCase()}`;
  return base.slice(0, 80).replace(/-+$/,'');
}
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
}
function normalizePath(value) {
  return resolve(value).replace(/[\\/]+$/,'').toLowerCase();
}

const args = parseArgs(process.argv.slice(2));
const branch = args.branch;
const startSha = args['start-sha'];
const currentSha = args['current-sha'] ?? startSha;
const mode = args.mode;
const target = args.target ?? '';
const repository = args.repository ?? 'bthwani2-boop/bthwani-suite-next';
const name = args.name ?? (startSha ? uniqueName(target, startSha) : null);
const taskBranch = args['task-branch'] ?? (name ? `task/orch/${name}` : null);
const workspaceMode = (args['workspace-mode'] ?? '').toUpperCase();
const worktreePath = args['worktree-path'] ?? (workspaceMode === 'REMOTE_TASK_BRANCH' ? 'NOT_APPLICABLE_REMOTE_API' : '');
const orchestrationRoot = target.trim() || 'AUTHORIZED_TASK_SCOPE';
const objective = args.objective ?? `Diagnose and close ${orchestrationRoot} from its logical root through the proven dependency/impact graph in an isolated task context without recency-driven navigation.`;

if (!branch || !startSha || !mode || !name || !taskBranch || !workspaceMode) {
  throw new Error('Usage: new-package.mjs [--name <unique-task-name>] --branch <integration-target> --task-branch <dedicated-task-branch> --workspace-mode <LOCAL_WORKTREE|REMOTE_TASK_BRANCH> --worktree-path <path|NOT_APPLICABLE_REMOTE_API> --start-sha <40-sha> [--current-sha <40-sha>] --mode <PREPARE_ONLY|EXECUTE_END_TO_END> [--target <target>] [--objective <text>] [--repository owner/repo]');
}
if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(name) || name === '_template' || name.includes('..')) throw new Error('Unsafe task name.');
for (const [label, sha] of [['start-sha', startSha], ['current-sha', currentSha]]) if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error(`${label} must be exactly 40 hexadecimal characters.`);
for (const [label, value] of [['branch', branch], ['task-branch', taskBranch]]) {
  if (!/^[A-Za-z0-9._/-]+$/.test(value) || value.includes('..')) throw new Error(`Unsafe ${label}.`);
}
if (taskBranch === branch) throw new Error('TASK_BRANCH must differ from Integration Target branch.');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Repository must use owner/name.');
if (!['PREPARE_ONLY', 'EXECUTE_END_TO_END'].includes(mode)) throw new Error('MODE must be PREPARE_ONLY or EXECUTE_END_TO_END.');
if (!['LOCAL_WORKTREE','REMOTE_TASK_BRANCH'].includes(workspaceMode)) throw new Error('workspace-mode must be LOCAL_WORKTREE or REMOTE_TASK_BRANCH.');

if (workspaceMode === 'LOCAL_WORKTREE') {
  if (!worktreePath) throw new Error('LOCAL_WORKTREE requires --worktree-path.');
  let currentBranch;
  let gitRoot;
  try {
    currentBranch = git(['branch','--show-current']);
    gitRoot = git(['rev-parse','--show-toplevel']);
  } catch (error) {
    throw new Error(`LOCAL_WORKTREE verification failed: ${error.message}`);
  }
  if (currentBranch !== taskBranch) throw new Error(`LOCAL_WORKTREE current branch must be TASK_BRANCH (${taskBranch}); got ${currentBranch || '<detached>'}.`);
  if (normalizePath(gitRoot) !== normalizePath(worktreePath)) throw new Error(`LOCAL_WORKTREE root mismatch: git=${gitRoot} expected=${worktreePath}.`);
} else if (worktreePath !== 'NOT_APPLICABLE_REMOTE_API') {
  throw new Error('REMOTE_TASK_BRANCH requires worktree-path=NOT_APPLICABLE_REMOTE_API.');
}

const destination = resolve(frameworkRoot, name);
if (!destination.startsWith(`${resolve(frameworkRoot)}${sep}`)) throw new Error('Destination escapes framework root.');
if (await exists(destination)) {
  throw new Error(`Destination already exists: ${destination}. New orchestrator invocation must create a new package; resume an old package only via explicit user-requested resume flow.`);
}

const taskId = `PKG-${name.toUpperCase().replace(/-/g, '_')}`;
const now = new Date().toISOString();
const replacements = {
  '__TASK_NAME__': name,
  '__TASK_ID__': taskId,
  '__TASK_OBJECTIVE__': objective,
  '__TARGET__': target,
  '__ORCHESTRATION_ROOT__': orchestrationRoot,
  '__MODE__': mode,
  '__CREATED_AT_ISO__': now,
  '__LAST_RECONCILED_AT_ISO__': now,
  '__REPOSITORY__': repository,
  '__BRANCH__': branch,
  '__TASK_BRANCH__': taskBranch,
  '__WORKSPACE_ISOLATION_MODE__': workspaceMode,
  '__WORKTREE_PATH__': worktreePath,
  '__START_SHA__': startSha.toLowerCase(),
  '__CURRENT_SHA__': currentSha.toLowerCase(),
  '__ORCHESTRATOR_PATH__': orchestratorPath,
};

await mkdir(destination);
const overview = replaceAll(await readFile(join(templateRoot, '00-OVERVIEW.template.md'), 'utf8'), replacements);
await writeFile(join(destination, '00-OVERVIEW.md'), overview, 'utf8');

console.log(`Created NEW BTHWANI_TASK_PACKAGE_V2: ${destination}`);
console.log(`TASK_ID=${taskId}`);
console.log(`INTEGRATION_TARGET=${branch}`);
console.log(`TASK_BRANCH=${taskBranch}`);
console.log(`WORKSPACE_ISOLATION_MODE=${workspaceMode}`);
console.log(`ORCHESTRATION_ROOT=${orchestrationRoot}`);
console.log('Existing package auto-resume is forbidden. Root reconciliation is REQUIRED before any Sequence is derived.');
