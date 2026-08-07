#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(frameworkRoot, '_template', 'unit');
const allowedKinds = new Set(['TOPIC', 'CONTEXT', 'JOURNEY', 'FOUNDATION', 'MIGRATION', 'CLEANUP', 'VERIFICATION']);

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) { positional.push(token); continue; }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${token}`);
    options[token.slice(2)] = value;
    i += 1;
  }
  return { positional, options };
}
async function exists(path) { try { await access(path, constants.F_OK); return true; } catch { return false; } }
function replaceAll(text, replacements) { let output = text; for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value); return output; }

const { positional, options } = parseArgs(process.argv.slice(2));
const packageArg = positional[0];
const id = options.id;
const name = options.name;
const kind = options.kind;
if (!packageArg || !id || !name || !kind) throw new Error('Usage: new-unit.mjs <package-path> --id U001 --name <unit-name> --kind <kind> [--depends-on U000,U002]');
if (!/^U\d{3,}$/.test(id)) throw new Error('Unit ID must match U001.');
if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(name)) throw new Error('Unsafe unit name.');
if (!allowedKinds.has(kind)) throw new Error(`Invalid unit kind: ${kind}`);

const packagePath = resolve(process.cwd(), packageArg);
if (!packagePath.startsWith(`${resolve(frameworkRoot)}${sep}`) || packagePath === resolve(frameworkRoot, '_template')) throw new Error('Invalid package path.');
for (const required of ['MANIFEST.json', 'EXECUTION-ORDER.json', 'units']) if (!(await exists(join(packagePath, required)))) throw new Error(`Package missing ${required}.`);

const orderPath = join(packagePath, 'EXECUTION-ORDER.json');
const order = JSON.parse(await readFile(orderPath, 'utf8'));
const dependsOn = (options['depends-on'] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
for (const dependency of dependsOn) if (!order.units.some((unit) => unit.unitId === dependency)) throw new Error(`Unknown dependency: ${dependency}`);
if (order.units.some((unit) => unit.unitId === id)) throw new Error(`Duplicate unit ID: ${id}`);

const directoryName = `${id}-${name}`;
const unitPath = join(packagePath, 'units', directoryName);
if (await exists(unitPath)) throw new Error(`Unit path already exists: ${unitPath}`);
await mkdir(unitPath);
const replacements = { UNIT_ID: id, UNIT_NAME: name, UNIT_KIND: kind };
for (const template of ['DIAGNOSIS.template.md', 'EXECUTION.template.json', 'VERIFICATION.template.json', 'RESULT.template.json']) {
  const target = template.replace('.template', '');
  const content = replaceAll(await readFile(join(templateRoot, template), 'utf8'), replacements);
  await writeFile(join(unitPath, target), content, 'utf8');
}
const executionPath = join(unitPath, 'EXECUTION.json');
const execution = JSON.parse(await readFile(executionPath, 'utf8'));
execution.dependsOn = dependsOn;
await writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`, 'utf8');

order.units.push({ unitId: id, path: `units/${directoryName}`, dependsOn, status: 'DRAFT' });
await writeFile(orderPath, `${JSON.stringify(order, null, 2)}\n`, 'utf8');
console.log(`Created unit ${id}: ${unitPath}`);
