#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const packageArg = args.find((v) => !v.startsWith('--'));
const latestIndex = args.indexOf('--latest-sha');
const phaseIndex = args.indexOf('--phase');
const latestSha = latestIndex >= 0 ? args[latestIndex + 1] : null;
const phase = phaseIndex >= 0 ? args[phaseIndex + 1] : 'frontier';

if (!packageArg || !latestSha || !/^[0-9a-f]{40}$/i.test(latestSha)) {
  throw new Error('Usage: root-cause-priority-gate.mjs <package-path> --latest-sha <40-sha> --phase <derive|frontier|closure>');
}
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
function fail(message) {
  console.error(`ROOT-CAUSE PRIORITY GATE: FAIL - ${message}`);
  process.exit(1);
}

const overview = meta(await readFile(resolve(packageArg, '00-OVERVIEW.md'), 'utf8'));
const live = latestSha.toLowerCase();

if ((overview.LATEST_RECONCILED_SHA ?? '').toLowerCase() !== live) fail('LATEST_RECONCILED_SHA is not the supplied live truth SHA.');
if (overview.TARGET_LANDSCAPE_COMPLETE !== 'YES') fail('TARGET_LANDSCAPE_COMPLETE must be YES before frontier derivation/execution.');
if ((overview.LANDSCAPE_RECONCILED_SHA ?? '').toLowerCase() !== live) fail('LANDSCAPE_RECONCILED_SHA must equal the supplied live truth SHA.');
if (overview.ROOT_CAUSE_CLUSTERING_COMPLETE !== 'YES') fail('ROOT_CAUSE_CLUSTERING_COMPLETE must be YES.');
if (overview.ROOT_CAUSE_CLUSTERS_ACCOUNTED !== 'YES') fail('ROOT_CAUSE_CLUSTERS_ACCOUNTED must be YES.');
if (overview.UNCLUSTERED_MATERIAL_FINDINGS !== '0') fail('UNCLUSTERED_MATERIAL_FINDINGS must be 0.');
if (overview.PRIORITY_MODEL_COMPLETE !== 'YES') fail('PRIORITY_MODEL_COMPLETE must be YES.');
if (overview.PRIORITY_DERIVATION_SOURCE !== 'ROOT_CAUSE_LANDSCAPE') fail('PRIORITY_DERIVATION_SOURCE must be ROOT_CAUSE_LANDSCAPE.');
if (overview.UNRANKED_MATERIAL_CLUSTERS !== '0') fail('UNRANKED_MATERIAL_CLUSTERS must be 0.');
if (overview.PRIMARY_FRONTIER_JUSTIFIED !== 'YES') fail('PRIMARY_FRONTIER_JUSTIFIED must be YES.');
if (overview.LANDSCAPE_ADVERSARIAL_PASS !== 'YES') fail('LANDSCAPE_ADVERSARIAL_PASS must be YES.');
if (overview.PRIORITY_POLICY !== 'HIGHEST_PROVEN_SYSTEMIC_LEVERAGE') fail('PRIORITY_POLICY drift.');

if (phase !== 'derive') {
  if (overview.FRONTIER_DERIVATION_SOURCE !== 'ROOT_GRAPH') fail('FRONTIER_DERIVATION_SOURCE must be ROOT_GRAPH.');
  if (overview.FRONTIER_VALID !== 'YES') fail('FRONTIER_VALID must be YES.');
}
if (phase === 'closure' && overview.ACTIVE_EXECUTION_FRONTIER !== 'NONE') fail('Closure requires empty ACTIVE_EXECUTION_FRONTIER.');

console.log(`ROOT-CAUSE PRIORITY GATE: PASS --phase=${phase}`);
console.log(`LATEST_SHA=${live}`);
console.log('PRIORITY_POLICY=HIGHEST_PROVEN_SYSTEMIC_LEVERAGE');
console.log('Proof limit: target-wide landscape/clustering/prioritization provenance only; it does not prove Product/Runtime correctness or that no undiscovered defect exists.');