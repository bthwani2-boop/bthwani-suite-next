#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContext, readMachineJson, isSha, parseMeta, fail, requireEvidence } from './_machine-lib.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2),pkg=args.find(v=>!v.startsWith('--')),li=args.indexOf('--latest-sha'),pi=args.indexOf('--phase'),ci=args.indexOf('--cluster');
const latest=li>=0?args[li+1]:null,phase=pi>=0?args[pi+1]:'execute',requested=ci>=0?args[ci+1]:null,LABEL='FRONTIER DERIVATION GATE';
if(!pkg||!isSha(latest)||!['derive','execute','handoff','closure'].includes(phase))throw new Error('Usage: frontier-derivation-gate.mjs <package> --latest-sha <40-sha> --phase <derive|execute|handoff|closure> [--cluster RC-NNN]');
const priorityPhase=phase==='closure'?'closure':phase==='handoff'?'handoff':phase==='derive'?'derive':'frontier';
execFileSync(process.execPath,[resolve(here,'root-cause-priority-gate.mjs'),pkg,'--latest-sha',latest,'--phase',priorityPhase],{stdio:'inherit'});
const stop=m=>fail(LABEL,m),{packageRoot,machineRoot,overview}=await loadContext(pkg),land=await readMachineJson(machineRoot,'root-cause-landscape.json'),live=latest.toLowerCase();
if((overview.LATEST_RECONCILED_SHA??'').toLowerCase()!==live||(land.reconciledSha??'').toLowerCase()!==live)stop('frontier provenance stale');
if(phase==='closure'||phase==='handoff'){if(overview.ACTIVE_EXECUTION_FRONTIER!=='NONE')stop(`${phase} requires empty active frontier`);console.log(`${LABEL}: PASS --phase=${phase}`);process.exit(0);}
const selected=new Set([land.selectedFrontier?.primaryClusterId,...(land.selectedFrontier?.parallelClusterIds??[])].filter(Boolean));
function prove(id){const c=(land.clusters??[]).find(x=>x.id===id);if(!c||!selected.has(id))stop(`${id} not machine-selected`);if(c.operationalGraphPositionProven!==true)stop(`${id} operational graph position unproven`);if(c.blastRadiusComplete!==true)stop(`${id} blast radius incomplete`);if(c.dependenciesComplete!==true)stop(`${id} dependencies incomplete`);if(c.consumersComplete!==true)stop(`${id} consumers incomplete`);if((c.unresolvedUpstream??[]).length)stop(`${id} unresolved upstream exists`);if(c.competitiveDeepening!=='DEEPENED_ENOUGH_TO_RANK')stop(`${id} competitive deepening insufficient`);if(c.priorityClass==='INDEPENDENT_PARALLEL')requireEvidence(`${id}/independence`,c.independenceEvidence,stop);return c;}
if(phase==='derive'){if(!/^RC-\d{3}$/.test(requested??''))stop('derive requires --cluster RC-NNN');prove(requested);console.log(`${LABEL}: PASS --phase=derive --cluster=${requested}`);process.exit(0);}
if(overview.FRONTIER_VALID!=='YES'||overview.FRONTIER_DERIVATION_SOURCE!=='ROOT_GRAPH')stop('overview frontier invalid');const active=!overview.ACTIVE_EXECUTION_FRONTIER||overview.ACTIVE_EXECUTION_FRONTIER==='NONE'?[]:overview.ACTIVE_EXECUTION_FRONTIER.split(',').map(x=>x.trim()).filter(Boolean);if(!active.length)stop('execute requires active frontier');const byId=new Map();for(const f of (await readdir(packageRoot)).filter(x=>/^\d{3}-[a-z0-9-]+\.md$/.test(x))){const m=parseMeta(await readFile(resolve(packageRoot,f),'utf8'));byId.set(m.SEQUENCE_ID,m);}for(const id of active){const m=byId.get(id);if(!m)stop(`${id} sequence file missing`);prove(m.ROOT_CAUSE_CLUSTER_ID);for(const field of ['OPERATIONAL_GRAPH_POSITION_PROVEN','JOURNEY_IMPACT_MAPPED','STATE_IMPACT_MAPPED','AUTHORITY_IMPACT_MAPPED','HANDOFF_IMPACT_MAPPED','CANONICAL_TRUTH_IMPACT_MAPPED'])if(m[field]!=='YES')stop(`${id} ${field} must be YES`);}console.log(`${LABEL}: PASS --phase=execute`);console.log(`ACTIVE_SEQUENCES=${active.join(',')}`);
