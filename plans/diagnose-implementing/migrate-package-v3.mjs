#!/usr/bin/env node
import { access, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot=dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath,[resolve('tools/guards/orchestrator/orchestrator-integrity-gate.mjs')],{stdio:'inherit'});
const args=process.argv.slice(2),packageArg=args.find(v=>!v.startsWith('--')),ei=args.indexOf('--explicit-resume'),explicit=ei>=0?(args[ei+1]??'').toUpperCase():'NO';
if(!packageArg||explicit!=='YES')throw new Error('Usage: migrate-package-v3.mjs <package-path> --explicit-resume YES');
async function exists(path){try{await access(path,constants.F_OK);return true;}catch{return false;}}
function meta(text){const out={};for(const line of text.split(/\r?\n##\s+/)[0].split(/\r?\n/)){const m=/^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());if(m)out[m[1]]=m[2].trim();}return out;}
function altitude(target){const value=(target??'').trim();if(!value)return'HIGHEST_AUTHORIZED_OPERATIONAL_ROOT';if(['*','all','everything','كل شيء'].includes(value.toLowerCase()))return'SYSTEM_OPERATIONAL_ROOT';return'HIGHEST_OPERATIONAL_MEANING_WITHIN_TARGET';}
const packageRoot=resolve(packageArg);
if(!packageRoot.startsWith(`${resolve(frameworkRoot)}${sep}`)||basename(packageRoot).startsWith('_'))throw new Error('Package path must be a real package under plans/diagnose-implementing/.');
const overviewPath=join(packageRoot,'00-OVERVIEW.md');
let text=await readFile(overviewPath,'utf8');
const before=meta(text),taskName=before.TASK_NAME??basename(packageRoot),taskId=before.TASK_ID;
if(!taskId)throw new Error('Legacy package lacks TASK_ID; manual forensic migration required.');
const machineBase=resolve(frameworkRoot,'_machine'),machineRoot=resolve(machineBase,taskName);
if(await exists(machineRoot))throw new Error('Machine registry already exists; migration is not repeatable. Use explicit resume reconciliation instead.');
const diagnosticAltitude=altitude(before.TARGET);
const insertion=`MINIMUM_DIAGNOSTIC_ALTITUDE: ${diagnosticAltitude}\nMACHINE_REGISTRY_PATH: plans/diagnose-implementing/_machine/${taskName}\nOPERATIONAL_ROOT_REQUIRED: YES\nOPERATIONAL_ROOT_COMPLETE: NO\nOPERATIONAL_ROOT_RECONCILED_SHA: UNSET\nOPERATIONAL_NEGATIVE_SPACE_PASS: NO\nOPERATIONAL_ADVERSARIAL_PASS: NO\nLOWER_LAYER_HOLD_COUNT: UNSET\n`;
if(!/^MINIMUM_DIAGNOSTIC_ALTITUDE:/m.test(text)){
  const anchor=/^(ORCHESTRATION_ROOT:\s*.*\r?\n)/m;
  if(!anchor.test(text))throw new Error('Cannot locate ORCHESTRATION_ROOT for deterministic metadata insertion.');
  text=text.replace(anchor,`$1${insertion}`);
}else throw new Error('Package already contains V3 operational metadata but no machine registry; manual forensic recovery required.');
let created=false;
try{
  await mkdir(machineBase,{recursive:true});await mkdir(machineRoot);created=true;await writeFile(overviewPath,text,'utf8');
  const categories=['productOutcomes','actors','authorities','responsibilities','journeys','states','transitions','invariants','handoffs','truthOwners','writersReadersConsumers','flows','implementationRuntimeBoundaries'];
  const coverage=Object.fromEntries(categories.map(name=>[name,{applicability:'UNASSESSED',items:[],exclusionEvidence:[]}])) ;
  const sha=before.LATEST_RECONCILED_SHA??before.CURRENT_SHA??'UNSET';
  await writeFile(join(machineRoot,'operational-root.json'),JSON.stringify({schema:'BTHWANI_OPERATIONAL_ROOT_V1',taskId,target:before.TARGET??'',diagnosticAltitude,reconciledSha:sha,status:'OPEN',coverage,challenges:{negativeSpace:{status:'NOT_RUN',evidence:[]},adversarial:{status:'NOT_RUN',evidence:[]}}},null,2)+'\n');
  await writeFile(join(machineRoot,'lower-layer-observations.json'),JSON.stringify({schema:'BTHWANI_LOWER_LAYER_OBSERVATIONS_V1',taskId,reconciledSha:sha,observations:[]},null,2)+'\n');
  await writeFile(join(machineRoot,'root-cause-landscape.json'),JSON.stringify({schema:'BTHWANI_ROOT_CAUSE_LANDSCAPE_V1',taskId,reconciledSha:sha,status:'OPEN',priorityPolicy:'HIGHEST_PROVEN_SYSTEMIC_LEVERAGE',findings:[],unclusteredFindings:[],clusters:[],selectedFrontier:{primaryClusterId:null,parallelClusterIds:[],justification:''},adversarial:{status:'NOT_RUN',evidence:[]}},null,2)+'\n');
}catch(error){if(created)await rm(machineRoot,{recursive:true,force:true});throw error;}
console.log('LEGACY PACKAGE V3 MIGRATION: PASS');
console.log('State=OPEN');
console.log('No prior diagnosis/priority/frontier was trusted or promoted.');
console.log('Next: establish/verify Task Branch isolation, reconcile latest target/root, rebuild operational coverage, then pass canonical gates.');
