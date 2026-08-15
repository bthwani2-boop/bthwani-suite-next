#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(frameworkRoot, '_template');
const orchestratorPath = 'tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Unexpected positional argument: ${token}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${token}`);
    out[token.slice(2)] = value;
    i += 1;
  }
  return out;
}
async function exists(path) { try { await access(path, constants.F_OK); return true; } catch { return false; } }
function replaceAll(text, replacements) {
  let output = text;
  for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value);
  return output;
}

const args = parseArgs(process.argv.slice(2));
const name = args.name;
const branch = args.branch;
const startSha = args['start-sha'];
const currentSha = args['current-sha'] ?? startSha;
const mode = args.mode;
const target = args.target ?? '';
const repository = args.repository ?? 'bthwani2-boop/bthwani-suite-next';
const objective = args.objective ?? `Diagnose ${target || 'the authorized target'} sequentially and close/prepare each proven dependency sequence without guessing.`;

if (!name || !branch || !startSha || !mode) throw new Error('Usage: new-package.mjs --name <task-name> --branch <branch> --start-sha <40-sha> [--current-sha <40-sha>] --mode <PREPARE_ONLY|EXECUTE_END_TO_END> [--target <target>] [--objective <text>] [--repository owner/repo]');
if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(name) || name === '_template' || name.includes('..')) throw new Error('Unsafe task name.');
for (const [label, sha] of [['start-sha', startSha], ['current-sha', currentSha]]) if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error(`${label} must be exactly 40 hexadecimal characters.`);
if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..')) throw new Error('Unsafe branch.');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Repository must use owner/name.');
if (!['PREPARE_ONLY', 'EXECUTE_END_TO_END'].includes(mode)) throw new Error('MODE must be PREPARE_ONLY or EXECUTE_END_TO_END.');

const destination = resolve(frameworkRoot, name);
if (!destination.startsWith(`${resolve(frameworkRoot)}${sep}`)) throw new Error('Destination escapes framework root.');
if (await exists(destination)) throw new Error(`Destination already exists: ${destination}`);

const taskId = `PKG-${name.toUpperCase().replace(/-/g, '_')}`;
const now = new Date().toISOString();
const replacements = {
  '__TASK_NAME__': name, '__TASK_ID__': taskId, '__TASK_OBJECTIVE__': objective, '__TARGET__': target,
  '__MODE__': mode, '__CREATED_AT_ISO__': now, '__LAST_RECONCILED_AT_ISO__': now,
  '__REPOSITORY__': repository, '__BRANCH__': branch, '__START_SHA__': startSha.toLowerCase(),
  '__CURRENT_SHA__': currentSha.toLowerCase(), '__ORCHESTRATOR_PATH__': orchestratorPath,
};

await mkdir(destination);
const overview = replaceAll(await readFile(join(templateRoot, '00-OVERVIEW.template.md'), 'utf8'), replacements);
await writeFile(join(destination, '00-OVERVIEW.md'), overview, 'utf8');

console.log(`Created BTHWANI_TASK_PACKAGE_V2: ${destination}`);
console.log('Created: 00-OVERVIEW.md only.');
console.log('Do not pre-create sequence files.');
console.log('After the dependency graph proves the next coherent execution boundary, use new-sequence.mjs.');
