#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot=dirname(fileURLToPath(import.meta.url));
const corePath=join(frameworkRoot,'new-package-core.mjs');
async function exists(path){try{await access(path,constants.F_OK);return true;}catch{return false;}}
function meta(text){const out={};for(const line of text.split(/\r?\n##\s+/)[0].split(/\r?\n/)){const m=/^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());if(m)out[m[1]]=m[2].trim();}return out;}
function altitude(target){const value=(target??'').trim();if(!value)return'HIGHEST_AUTHORIZED_OPERATIONAL_ROOT';if(['*','all','everything','كل شيء'].includes(value.toLowerCase()))return'SYSTEM_OPERATIONAL_ROOT';return'HIGHEST_OPERATIONAL_MEANING_WITHIN_TARGET';}
let stdout;
try{stdout=execFileSync(process.execPath,[corePath,...process.argv.slice(2)],{encoding:'utf8',stdio:['inherit','pipe','inherit']});}catch(error){if(error.stdout)process.stdout.write(error.stdout);throw error;}
const createdLine=stdout.split(/\r?\n/).find((line)=>line.startsWith('Created NEW BTHWANI_TASK_PACKAGE_V2: '));
if(!createdLine)throw new Error('Core package engine did not report created package path.');
const packageRoot=resolve(createdLine.slice('Created NEW BTHWANI_TASK_PACKAGE_V2: '.length));
const overviewPath=join(packageRoot,'00-OVERVIEW.md');
let overviewText=await readFile(overviewPath,'utf8');
const overview=meta(overviewText),taskName=overview.TASK_NAME??basename(packageRoot),machineBase=resolve(frameworkRoot,'_machine'),machineRoot=resolve(machineBase,taskName),diagnosticAltitude=altitude(overview.TARGET);
if(await exists(machineRoot)){await rm(packageRoot,{recursive:true,force:true});throw new Error(`Machine registry already exists for ${taskName}; package bootstrap rolled back.`);}
let machineCreated=false;
try{
  await mkdir(machineBase,{recursive:true});
  await mkdir(machineRoot);
  machineCreated=true;
  overviewText=overviewText.replace(/^MINIMUM_DIAGNOSTIC_ALTITUDE:\s*.*$/m,`MINIMUM_DIAGNOSTIC_ALTITUDE: ${diagnosticAltitude}`).replace(/^MACHINE_REGISTRY_PATH:\s*.*$/m,`MACHINE_REGISTRY_PATH: plans/diagnose-implementing/_machine/${taskName}`);
  await writeFile(overviewPath,overviewText,'utf8');
  const categories=['productOutcomes','actors','authorities','responsibilities','journeys','states','transitions','invariants','handoffs','truthOwners','writersReadersConsumers','flows','implementationRuntimeBoundaries'];
  const coverage=Object.fromEntries(categories.map((name)=>[name,{applicability:'UNASSESSED',items:[],exclusionEvidence:[]}])) ;
  await writeFile(join(machineRoot,'operational-root.json'),JSON.stringify({schema:'BTHWANI_OPERATIONAL_ROOT_V1',taskId:overview.TASK_ID,target:overview.TARGET,diagnosticAltitude,reconciledSha:overview.CURRENT_SHA,status:'OPEN',coverage,challenges:{negativeSpace:{status:'NOT_RUN',evidence:[]},adversarial:{status:'NOT_RUN',evidence:[]}}},null,2)+'\n','utf8');
  await writeFile(join(machineRoot,'lower-layer-observations.json'),JSON.stringify({schema:'BTHWANI_LOWER_LAYER_OBSERVATIONS_V1',taskId:overview.TASK_ID,reconciledSha:overview.CURRENT_SHA,observations:[]},null,2)+'\n','utf8');
  await writeFile(join(machineRoot,'root-cause-landscape.json'),JSON.stringify({schema:'BTHWANI_ROOT_CAUSE_LANDSCAPE_V1',taskId:overview.TASK_ID,reconciledSha:overview.CURRENT_SHA,status:'OPEN',priorityPolicy:'HIGHEST_PROVEN_SYSTEMIC_LEVERAGE',findings:[],unclusteredFindings:[],clusters:[],selectedFrontier:{primaryClusterId:null,parallelClusterIds:[],justification:''},adversarial:{status:'NOT_RUN',evidence:[]}},null,2)+'\n','utf8');
}catch(error){await rm(packageRoot,{recursive:true,force:true});if(machineCreated)await rm(machineRoot,{recursive:true,force:true});throw new Error(`Governed package bootstrap rolled back: ${error.message}`);}
process.stdout.write(stdout);console.log(`MINIMUM_DIAGNOSTIC_ALTITUDE=${diagnosticAltitude}`);console.log(`MACHINE_REGISTRY_PATH=plans/diagnose-implementing/_machine/${taskName}`);console.log('Operational machine registries initialized OPEN; no Sequence may be derived before canonical gates pass.');
