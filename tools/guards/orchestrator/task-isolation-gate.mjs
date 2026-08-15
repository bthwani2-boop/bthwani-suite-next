#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const packageArg = args.find((v) => !v.startsWith('--'));
const latestIndex = args.indexOf('--latest-target-sha');
const phaseIndex = args.indexOf('--phase');
const runtimeIndex = args.indexOf('--runtime');
const currentBranchIndex = args.indexOf('--current-branch');
const explicitResumeIndex = args.indexOf('--explicit-resume');

const latestTargetSha = latestIndex >= 0 ? args[latestIndex + 1] : null;
const phase = phaseIndex >= 0 ? args[phaseIndex + 1] : null;
const runtime = runtimeIndex >= 0 ? args[runtimeIndex + 1] : null;
const suppliedBranch = currentBranchIndex >= 0 ? args[currentBranchIndex + 1] : null;
const explicitResume = explicitResumeIndex >= 0 ? (args[explicitResumeIndex + 1] ?? '').toUpperCase() : 'NO';

if (!packageArg || !latestTargetSha || !/^[0-9a-f]{40}$/i.test(latestTargetSha)) {
  throw new Error('Usage: task-isolation-gate.mjs <package-path> --latest-target-sha <40-sha> --phase <write|resume|integrate> --runtime <local|remote-api> [--current-branch <branch>] [--explicit-resume YES]');
}
if (!['write','resume','integrate'].includes(phase)) throw new Error('phase must be write, resume, or integrate.');
if (!['local','remote-api'].includes(runtime)) throw new Error('runtime must be local or remote-api.');
if (!['YES','NO'].includes(explicitResume)) throw new Error('explicit-resume must be YES or NO.');

function meta(text) {
  const out = {};
  const header = text.split(/\r?\n##\s+/)[0];
  for (const line of header.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
function fail(message) {
  console.error(`TASK ISOLATION GATE: FAIL - ${message}`);
  process.exit(1);
}
function git(argv) {
  return execFileSync('git', argv, { encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim();
}
function norm(value) {
  return resolve(value).replace(/[\\/]+$/,'').toLowerCase();
}

const overview = meta(await readFile(resolve(packageArg, '00-OVERVIEW.md'), 'utf8'));

if (!['NEW_INVOCATION','LEGACY_PRE_ISOLATION'].includes(overview.PACKAGE_ORIGIN)) fail('PACKAGE_ORIGIN invalid/missing.');
if (overview.RESUME_POLICY !== 'EXPLICIT_USER_REQUEST_ONLY') fail('RESUME_POLICY drift.');
if (overview.TASK_CONTEXT_POLICY !== 'ISOLATED_CURRENT_TASK_ONLY') fail('TASK_CONTEXT_POLICY drift.');
if (overview.FOREIGN_DELTA_POLICY !== 'INPUT_NOT_INSTRUCTION') fail('FOREIGN_DELTA_POLICY drift.');
if (!overview.INTEGRATION_TARGET || overview.INTEGRATION_TARGET !== overview.BRANCH) fail('INTEGRATION_TARGET must equal BRANCH.');
if (!overview.TASK_BRANCH || overview.TASK_BRANCH === 'UNSET') fail('TASK_BRANCH not established.');
if (overview.TASK_BRANCH === overview.INTEGRATION_TARGET) fail('TASK_BRANCH must differ from INTEGRATION_TARGET.');
if (overview.TASK_BRANCH_READY !== 'YES') fail('TASK_BRANCH_READY must be YES.');
if (overview.WORKSPACE_ISOLATION_POLICY !== 'LOCAL_WORKTREE_OR_REMOTE_TASK_BRANCH') fail('WORKSPACE_ISOLATION_POLICY drift.');
if (!['LOCAL_WORKTREE','REMOTE_TASK_BRANCH'].includes(overview.WORKSPACE_ISOLATION_MODE)) fail('WORKSPACE_ISOLATION_MODE not ready.');
if (overview.WORKSPACE_ISOLATION_READY !== 'YES') fail('WORKSPACE_ISOLATION_READY must be YES.');
if (overview.DIRECT_INTEGRATION_TARGET_WRITES !== 'FORBIDDEN_EXCEPT_INTEGRATION_OWNER') fail('direct-target write policy drift.');
if ((overview.LATEST_RECONCILED_SHA ?? '').toLowerCase() !== latestTargetSha.toLowerCase()) fail('LATEST_RECONCILED_SHA is not supplied live Integration Target SHA.');

if (phase === 'resume' && explicitResume !== 'YES') fail('explicit user resume authorization is required for existing package resume.');

if (runtime === 'local') {
  if (overview.WORKSPACE_ISOLATION_MODE !== 'LOCAL_WORKTREE') fail('local runtime requires WORKSPACE_ISOLATION_MODE=LOCAL_WORKTREE.');
  if (!overview.WORKTREE_PATH || ['UNSET','NOT_APPLICABLE_REMOTE_API'].includes(overview.WORKTREE_PATH)) fail('local runtime requires concrete WORKTREE_PATH.');
  let actualBranch;
  let actualRoot;
  try {
    actualBranch = git(['branch','--show-current']);
    actualRoot = git(['rev-parse','--show-toplevel']);
  } catch (error) {
    fail(`git worktree verification unavailable: ${error.message}`);
  }
  if (phase !== 'integrate' && actualBranch !== overview.TASK_BRANCH) fail(`current local branch ${actualBranch || '<detached>'} is not TASK_BRANCH ${overview.TASK_BRANCH}.`);
  if (phase !== 'integrate' && norm(actualRoot) !== norm(overview.WORKTREE_PATH)) fail(`current git root ${actualRoot} is not registered WORKTREE_PATH ${overview.WORKTREE_PATH}.`);
} else {
  if (overview.WORKSPACE_ISOLATION_MODE !== 'REMOTE_TASK_BRANCH') fail('remote-api runtime requires WORKSPACE_ISOLATION_MODE=REMOTE_TASK_BRANCH.');
  if (overview.WORKTREE_PATH !== 'NOT_APPLICABLE_REMOTE_API') fail('remote-api runtime requires WORKTREE_PATH=NOT_APPLICABLE_REMOTE_API.');
  if (phase !== 'integrate') {
    if (!suppliedBranch) fail('remote-api write/resume requires --current-branch to prove intended API write branch.');
    if (suppliedBranch !== overview.TASK_BRANCH) fail(`remote-api current branch must be TASK_BRANCH ${overview.TASK_BRANCH}; got ${suppliedBranch}.`);
  }
}

if (phase === 'integrate') {
  if (!overview.INTEGRATION_OWNER || overview.INTEGRATION_OWNER === 'UNASSIGNED') fail('INTEGRATION_OWNER must be assigned before target integration.');
}

console.log(`TASK ISOLATION GATE: PASS --phase=${phase} --runtime=${runtime}`);
console.log(`INTEGRATION_TARGET=${overview.INTEGRATION_TARGET}`);
console.log(`TASK_BRANCH=${overview.TASK_BRANCH}`);
console.log(`LATEST_TARGET_SHA=${latestTargetSha.toLowerCase()}`);
console.log('Proof limit: task context/branch/workspace intent only; semantic merge safety and Product/Runtime correctness require their own evidence.');
