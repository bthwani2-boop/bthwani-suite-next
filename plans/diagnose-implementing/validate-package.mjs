#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContext } from '../../tools/guards/orchestrator/_machine-lib.mjs';

const frameworkRoot=dirname(fileURLToPath(import.meta.url));
const raw=process.argv.slice(2);
const packageArg=raw.find((value)=>!value.startsWith('--'));
if(!packageArg)throw new Error('Package path is required.');
function run(script,args){execFileSync(process.execPath,[resolve(script),...args],{stdio:'inherit'});}
run(join(frameworkRoot,'validate-package-core.mjs'),raw);
const sequencePhase=raw.includes('--sequence-ready')||raw.includes('--sequence-complete');
const handoff=raw.includes('--handoff');
const closure=raw.includes('--closure');
if(!sequencePhase&&!handoff&&!closure){console.log('Governed validation: structural V2 PASS; operational execution gates not requested.');process.exit(0);}
const packageRoot=resolve(packageArg);
const {overview}=await loadContext(packageRoot);
const live=overview.LATEST_RECONCILED_SHA;
if(!/^[0-9a-f]{40}$/i.test(live??''))throw new Error('LATEST_RECONCILED_SHA invalid for governed validation.');
const integration=handoff||closure;
const isolationArgs=[packageRoot,'--latest-target-sha',live,'--phase',integration?'integrate':'write'];
if(overview.WORKSPACE_ISOLATION_MODE==='LOCAL_WORKTREE')isolationArgs.push('--runtime','local');
else if(overview.WORKSPACE_ISOLATION_MODE==='REMOTE_TASK_BRANCH')isolationArgs.push('--runtime','remote-api',...(integration?[]:['--current-branch',overview.TASK_BRANCH]));
else throw new Error('Workspace isolation mode is not ready.');
run('tools/guards/orchestrator/task-isolation-gate.mjs',isolationArgs);
run('tools/guards/orchestrator/root-anchor-gate.mjs',[packageRoot,'--latest-sha',live,'--phase',integration?'closure':'frontier']);
run('tools/guards/orchestrator/frontier-derivation-gate.mjs',[packageRoot,'--latest-sha',live,'--phase',handoff?'handoff':closure?'closure':'execute']);
console.log('Governed validation: PASS (legacy V2 validation + Isolation + Root + transitive Operational/Priority/Frontier gates).');
