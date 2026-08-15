#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const packageArg = args.find((v) => !v.startsWith('--'));
const latestIndex = args.indexOf('--latest-sha');
const phaseIndex = args.indexOf('--phase');
const latestSha = latestIndex >= 0 ? args[latestIndex + 1] : null;
const phase = phaseIndex >= 0 ? args[phaseIndex + 1] : 'frontier';

if (!packageArg || !latestSha || !/^[0-9a-f]{40}$/i.test(latestSha)) throw new Error('Usage: root-anchor-gate.mjs <package-path> --latest-sha <40-sha> --phase <derive|frontier|closure>');
if (!['derive','frontier','closure'].includes(phase)) throw new Error('phase must be derive, frontier, or closure.');

function meta(text) {
  const out = {};
  const header = text.split(/\r?\n##\s+/)[0];
  for (const line of header.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
function fail(message) { console.error(`ROOT ANCHOR GATE: FAIL - ${message}`); process.exit(1); }

const overview = meta(await readFile(resolve(packageArg, '00-OVERVIEW.md'), 'utf8'));
if (!overview.ORCHESTRATION_ROOT) fail('ORCHESTRATION_ROOT missing.');
if (overview.NAVIGATION_POLICY !== 'ROOT_ANCHORED_GRAPH_ONLY') fail('NAVIGATION_POLICY drift.');
if (overview.LATEST_HEAD_ROLE !== 'TRUTH_INTEGRATION_BASELINE_ONLY') fail('LATEST_HEAD_ROLE drift.');
if ((overview.LATEST_RECONCILED_SHA ?? '').toLowerCase() !== latestSha.toLowerCase()) fail('LATEST_RECONCILED_SHA is not the supplied live HEAD.');
if (overview.ROOT_RECONCILIATION_REQUIRED !== 'NO') fail('Root/Macro reconciliation is required before deriving/resuming work.');
if ((overview.ROOT_RECONCILED_SHA ?? '').toLowerCase() !== latestSha.toLowerCase()) fail('ROOT_RECONCILED_SHA is stale.');
if (overview.FRONTIER_DERIVATION_SOURCE !== 'ROOT_GRAPH') fail('Frontier was not derived from ROOT_GRAPH.');
if (phase !== 'derive' && overview.FRONTIER_VALID !== 'YES') fail('FRONTIER_VALID must be YES.');
if (phase === 'closure' && overview.ACTIVE_EXECUTION_FRONTIER !== 'NONE') fail('Closure requires empty ACTIVE_EXECUTION_FRONTIER.');

console.log(`ROOT ANCHOR GATE: PASS --phase=${phase}`);
console.log(`ORCHESTRATION_ROOT=${overview.ORCHESTRATION_ROOT}`);
console.log(`LIVE_HEAD=${latestSha.toLowerCase()}`);
console.log('Proof limit: navigation/root/frontier provenance only; not Product/Runtime correctness.');
