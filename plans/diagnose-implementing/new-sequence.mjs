#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContext, readMachineJson } from '../../tools/guards/orchestrator/_machine-lib.mjs';

const frameworkRoot=dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath,[resolve('tools/guards/orchestrator/orchestrator-integrity-gate.mjs')],{stdio:'inherit'});
const raw=process.argv.slice(2);
function value(name){const i=raw.indexOf(`--${name}`);return i>=0?raw[i+1]:null;}
function run(script,args){execFileSync(process.execPath,[resolve(script),...args],{stdio:'inherit'});}
const packageName=value('package'),baseSha=value('base-sha'),clusterId=value('cluster'),suppliedClass=value('priority-class'),suppliedBasis=value('priority-basis');
if(!packageName||!baseSha||!clusterId)throw new Error('Governed sequence creation requires --package, --base-sha and --cluster.');
const packageRoot=resolve(frameworkRoot,packageName);
run('tools/orchestrator/sync-machine-summary.mjs',[packageRoot,'--latest-sha',baseSha]);
const {machineRoot,overview}=await loadContext(packageRoot);
const landscape=await readMachineJson(machineRoot,'root-cause-landscape.json');
const cluster=(landscape.clusters??[]).find((item)=>item.id===clusterId);
if(!cluster)throw new Error(`${clusterId} does not exist in machine root-cause landscape.`);
if(!cluster.priorityClass||!cluster.comparisonBasis)throw new Error(`${clusterId} machine priority class/basis incomplete.`);
if(suppliedClass!==cluster.priorityClass)throw new Error(`--priority-class must equal machine value ${cluster.priorityClass}.`);
if(suppliedBasis!==cluster.comparisonBasis)throw new Error('--priority-basis must exactly equal machine comparisonBasis; manual priority drift is forbidden.');
const isolationArgs=[packageRoot,'--latest-target-sha',baseSha,'--phase','write'];
if(overview.WORKSPACE_ISOLATION_MODE==='LOCAL_WORKTREE')isolationArgs.push('--runtime','local');
else if(overview.WORKSPACE_ISOLATION_MODE==='REMOTE_TASK_BRANCH')isolationArgs.push('--runtime','remote-api','--current-branch',overview.TASK_BRANCH);
else throw new Error('Workspace isolation mode is not ready.');
run('tools/guards/orchestrator/task-isolation-gate.mjs',isolationArgs);
run('tools/guards/orchestrator/root-anchor-gate.mjs',[packageRoot,'--latest-sha',baseSha,'--phase','derive']);
run('tools/guards/orchestrator/frontier-derivation-gate.mjs',[packageRoot,'--latest-sha',baseSha,'--phase','derive','--cluster',clusterId]);
run(join(frameworkRoot,'new-sequence-core.mjs'),raw);
console.log('Governed Sequence creation: PASS (integrity + summary sync + Isolation/Root + transitive Operational/Priority/Frontier gates).');
