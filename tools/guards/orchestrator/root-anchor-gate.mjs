#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const args=process.argv.slice(2); const pkg=args.find(v=>!v.startsWith('--')); const li=args.indexOf('--latest-sha'); const pi=args.indexOf('--phase'); const live=li>=0?args[li+1]:null; const phase=pi>=0?args[pi+1]:'frontier';
if(!pkg||!/^[0-9a-f]{40}$/i.test(live??'')) throw new Error('Usage: root-anchor-gate.mjs <package> --latest-sha <40-sha> --phase <derive|frontier|closure>');
function meta(t){const o={}; for(const l of t.split(/\r?\n##\s+/)[0].split(/\r?\n/)){const m=/^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(l.trim()); if(m)o[m[1]]=m[2].trim();} return o;}
function fail(m){console.error(`ROOT ANCHOR GATE: FAIL - ${m}`);process.exit(1);}
const o=meta(await readFile(resolve(pkg,'00-OVERVIEW.md'),'utf8')); const sha=live.toLowerCase();
if(!o.ORCHESTRATION_ROOT)fail('ORCHESTRATION_ROOT missing'); if(o.NAVIGATION_POLICY!=='ROOT_ANCHORED_GRAPH_ONLY')fail('NAVIGATION_POLICY drift'); if(o.LATEST_HEAD_ROLE!=='TRUTH_INTEGRATION_BASELINE_ONLY')fail('LATEST_HEAD_ROLE drift'); if((o.LATEST_RECONCILED_SHA??'').toLowerCase()!==sha)fail('LATEST_RECONCILED_SHA stale'); if(o.ROOT_RECONCILIATION_REQUIRED!=='NO')fail('root reconciliation required'); if((o.ROOT_RECONCILED_SHA??'').toLowerCase()!==sha)fail('ROOT_RECONCILED_SHA stale'); if(phase!=='derive'&&o.FRONTIER_VALID!=='YES')fail('FRONTIER_VALID must be YES'); if(phase==='closure'&&o.ACTIVE_EXECUTION_FRONTIER!=='NONE')fail('closure requires empty frontier');
console.log(`ROOT ANCHOR GATE: PASS --phase=${phase}`); console.log(`LIVE_SHA=${sha}`);
