#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(frameworkRoot, '_template');

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

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

function replaceAll(text, replacements) {
  let output = text;
  for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value);
  return output;
}

const args = parseArgs(process.argv.slice(2));
const name = args.name;
const branch = args.branch;
const sha = args.sha;
const mode = args.mode;
const target = args.target ?? args.surface ?? '';
const repository = args.repository ?? 'bthwani2-boop/bthwani-suite-next';
const objective = args.objective ?? `Diagnose ${target || 'the authorized target'} completely and prepare the smallest complete root-cause execution scope.`;

if (!name || !branch || !sha || !mode) {
  throw new Error('Usage: new-package.mjs --name <task-name> --branch <branch> --sha <40-sha> --mode <PREPARE_ONLY|EXECUTE_END_TO_END> [--target <target>] [--objective <text>] [--repository owner/repo]');
}
if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(name) || name === '_template' || name.includes('..')) throw new Error('Unsafe task name.');
if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error('SHA must be exactly 40 hexadecimal characters.');
if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..')) throw new Error('Unsafe branch.');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Repository must use owner/name.');
if (!['PREPARE_ONLY', 'EXECUTE_END_TO_END'].includes(mode)) throw new Error('MODE must be PREPARE_ONLY or EXECUTE_END_TO_END.');

const destination = resolve(frameworkRoot, name);
if (!destination.startsWith(`${resolve(frameworkRoot)}${sep}`)) throw new Error('Destination escapes framework root.');
if (await exists(destination)) throw new Error(`Destination already exists: ${destination}`);

const taskId = `PKG-${name.toUpperCase().replace(/-/g, '_')}`;
const now = new Date().toISOString();
const replacements = {
  '__TASK_NAME__': name,
  '__TASK_ID__': taskId,
  '__TASK_OBJECTIVE__': objective,
  '__TARGET__': target,
  '__MODE__': mode,
  '__CREATED_AT_ISO__': now,
  '__REPOSITORY__': repository,
  '__BRANCH__': branch,
  '__START_SHA__': sha.toLowerCase(),
};

const templates = [
  ['01-DIAGNOSIS.template.md', '01-DIAGNOSIS.md'],
  ['02-EXECUTION.template.md', '02-EXECUTION.md'],
  ['03-VERIFICATION-CLOSURE.template.md', '03-VERIFICATION-CLOSURE.md'],
];

await mkdir(destination);
for (const [source, targetFile] of templates) {
  const content = replaceAll(await readFile(join(templateRoot, source), 'utf8'), replacements);
  await writeFile(join(destination, targetFile), content, 'utf8');
}

console.log(`Created orchestrated package: ${destination}`);
console.log(`Mode: ${mode}`);
console.log(`Pinned baseline: ${repository}@${branch} ${sha.toLowerCase()}`);
console.log('Next: follow tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md; do not bypass diagnosis gates.');
