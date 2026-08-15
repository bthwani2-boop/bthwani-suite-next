#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const fail=(message)=>{console.error(`ORCHESTRATOR INTEGRITY GATE: FAIL - ${message}`);process.exit(1);};
async function exists(path){try{await access(resolve(path),constants.F_OK);return true;}catch{return false;}}
async function text(path){return readFile(resolve(path),'utf8');}
function gitBlobSha(content){const body=Buffer.from(content,'utf8'),header=Buffer.from(`blob ${body.length}\0`,'utf8');return createHash('sha1').update(Buffer.concat([header,body])).digest('hex');}

const base='tools/prompting/bthwani-orchestrator';
const docs=['00-ORCHESTRATOR.md','01-CORE-CONTRACT.md','02-DISCOVERY-DIAGNOSIS.md','03-DECISIONS-COVERAGE-ANTI-DRIFT.md','04-PACKAGE-EXECUTION.md','05-VERIFICATION-CLEANUP-CLOSURE.md','06-CONCURRENCY-RESUME-RECOVERY.md'];
for(const file of docs)if(!(await exists(`${base}/${file}`)))fail(`missing governing module ${file}`);
for(const obsolete of ['07-OPERATIONAL-FIRST-PROGRESSIVE-NARROWING.md','08-PRESERVED-CONSTITUTION.md'])if(await exists(`${base}/${obsolete}`))fail(`parallel/legacy governing module forbidden: ${obsolete}`);

const all=(await Promise.all(docs.map((file)=>text(`${base}/${file}`)))).join('\n');
for(const required of ['OPERATIONAL MEANING GOVERNS INITIAL DIAGNOSIS','TOP-DOWN DIAGNOSIS; BOTTOM-UP EVIDENCE','ESCALATE BEFORE FIX','TECHNICAL FINDING = EVIDENCE FIRST, NOT EXECUTION AUTHORITY','MACHINE OPERATIONAL-ROOT GATE','COMPETITIVE DEEPENING'])if(!all.includes(required))fail(`required constitutional rule missing: ${required}`);
const discovery=await text(`${base}/02-DISCOVERY-DIAGNOSIS.md`);
if(/DERIVE HIGHEST-LEVERAGE PROVEN EXECUTION FRONTIER[\s\S]{0,180}DEEP GRAPH-DRIVEN JOURNEY DIAGNOSIS/i.test(discovery))fail('frontier-before-journey diagnostic ordering reintroduced');
if(/Domains\s*\/\s*Services\s*\/\s*Contracts\s*\/\s*Data[\s\S]{0,120}Journeys\s*\/\s*States\s*\/\s*Handoffs/i.test(all))fail('technical-domain-before-journey orientation reintroduced');

const expectedCore={
  'plans/diagnose-implementing/new-package-core.mjs':'054825a5343009205f462e3fc900d3351f5601aa',
  'plans/diagnose-implementing/new-sequence-core.mjs':'d18e93e7d77ac52d669d5eb51b7541578d73c5a1',
  'plans/diagnose-implementing/validate-package-core.mjs':'fcdc13a45756d675a7d713452c69fa6812a7dd1f'
};
for(const [path,sha] of Object.entries(expectedCore)){const content=await text(path);if(gitBlobSha(content)!==sha)fail(`preserved V2 core drift: ${path}`);}

const compatibility={
  'plans/diagnose-implementing/root-anchor-gate.mjs':'../../tools/guards/orchestrator/root-anchor-gate.mjs',
  'plans/diagnose-implementing/task-isolation-gate.mjs':'../../tools/guards/orchestrator/task-isolation-gate.mjs',
  'plans/diagnose-implementing/operational-root-gate.mjs':'../../tools/guards/orchestrator/operational-root-gate.mjs',
  'plans/diagnose-implementing/root-cause-priority-gate.mjs':'../../tools/guards/orchestrator/root-cause-priority-gate.mjs',
  'plans/diagnose-implementing/frontier-derivation-gate.mjs':'../../tools/guards/orchestrator/frontier-derivation-gate.mjs'
};
for(const [path,target] of Object.entries(compatibility)){const content=(await text(path)).trim();const expected=`#!/usr/bin/env node\nimport '${target}';`;if(content!==expected)fail(`compatibility gate contains duplicate/drifted logic: ${path}`);}

const requiredPublic=[
  'plans/diagnose-implementing/new-package.mjs',
  'plans/diagnose-implementing/new-sequence.mjs',
  'plans/diagnose-implementing/validate-package.mjs',
  'plans/diagnose-implementing/migrate-package-v3.mjs',
  'tools/orchestrator/sync-machine-summary.mjs',
  'tools/guards/orchestrator/_machine-lib.mjs',
  'tools/guards/orchestrator/operational-root-gate.mjs',
  'tools/guards/orchestrator/root-cause-priority-gate.mjs',
  'tools/guards/orchestrator/frontier-derivation-gate.mjs'
];
for(const path of requiredPublic)if(!(await exists(path)))fail(`required V3 tool missing: ${path}`);
for(const path of ['plans/diagnose-implementing/new-package.mjs','plans/diagnose-implementing/new-sequence.mjs','plans/diagnose-implementing/validate-package.mjs','plans/diagnose-implementing/migrate-package-v3.mjs']){
  const content=await text(path);
  if(!content.includes('tools/guards/orchestrator/orchestrator-integrity-gate.mjs'))fail(`public command does not invoke integrity gate: ${path}`);
}

const readme=await text('plans/diagnose-implementing/README.md');
if(!readme.includes('NAVIGATION_ONLY'))fail('README must remain navigation-only, not a competing rule owner');
const traceability=await text(`${base}/source-map/SOURCE-RULE-TRACEABILITY.md`);
if(!traceability.includes('There must be no second rule owner'))fail('single-owner traceability contract missing');

console.log('ORCHESTRATOR INTEGRITY GATE: PASS');
console.log('Ordering=OPERATIONAL_FIRST');
console.log('Parallel governing modules=0');
console.log('Preserved V2 core hashes=PASS');
console.log('Compatibility gate duplication=0');
console.log('Required V3 public tools=PASS');
console.log('Public entry integrity chaining=PASS');
