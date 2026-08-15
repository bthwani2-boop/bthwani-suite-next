import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

export function parseMeta(text) {
  const out = {};
  const header = text.split(/\r?\n##\s+/)[0];
  for (const line of header.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}
export function isSha(value) { return /^[0-9a-f]{40}$/i.test(value ?? ''); }
export function fail(label, message) { console.error(`${label}: FAIL - ${message}`); process.exit(1); }
export async function loadContext(packageArg) {
  const packageRoot = resolve(packageArg);
  const frameworkRoot = resolve('plans/diagnose-implementing');
  if (!packageRoot.startsWith(`${frameworkRoot}${sep}`)) throw new Error('Package must be under plans/diagnose-implementing/.');
  const overviewText = await readFile(resolve(packageRoot, '00-OVERVIEW.md'), 'utf8');
  const overview = parseMeta(overviewText);
  if (!overview.TASK_NAME || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(overview.TASK_NAME)) throw new Error('TASK_NAME missing/unsafe.');
  const machineRelative = `plans/diagnose-implementing/_machine/${overview.TASK_NAME}`;
  if (overview.MACHINE_REGISTRY_PATH !== machineRelative) throw new Error(`MACHINE_REGISTRY_PATH must equal ${machineRelative}.`);
  const machineRoot = resolve(frameworkRoot, '_machine', overview.TASK_NAME);
  if (!machineRoot.startsWith(`${resolve(frameworkRoot, '_machine')}${sep}`)) throw new Error('Machine path escaped framework root.');
  return { packageRoot, machineRoot, machineRelative, overview, overviewText };
}
export async function readMachineJson(machineRoot, filename) { return JSON.parse(await readFile(resolve(machineRoot, filename), 'utf8')); }
export function requireEvidence(label, value, stop) { if (!Array.isArray(value) || value.length === 0 || value.some((item) => !String(item).trim())) stop(`${label}: evidence missing.`); }
