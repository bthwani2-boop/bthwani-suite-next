#!/usr/bin/env node
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
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
async function exists(path) { try { await access(path, constants.F_OK); return true; } catch { return false; } }
function meta(text) {
  const out = {};
  const header = text.split(/\r?\n##\s+/)[0];
  for (const line of header.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}
function replaceAll(text, replacements) {
  let output = text;
  for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value);
  return output;
}

const args = parseArgs(process.argv.slice(2));
const packageName = args.package;
const name = args.name;
const title = args.title ?? name;
const baseSha = args['base-sha'];
const basis = args.basis;
const dependsOn = args['depends-on'] ?? 'NONE';

if (!packageName || !name || !baseSha || !basis) {
  throw new Error('Usage: new-sequence.mjs --package <task-name> --name <sequence-slug> [--title <title>] --base-sha <40-sha> --basis <proven-boundary-reason> [--depends-on <SEQ-001|NONE>]');
}
if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(packageName) || packageName === '_template' || packageName.includes('..')) throw new Error('Unsafe package name.');
if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(name) || name.includes('..')) throw new Error('Unsafe sequence name.');
if (!/^[0-9a-f]{40}$/i.test(baseSha)) throw new Error('base-sha must be exactly 40 hexadecimal characters.');
if (!basis.trim()) throw new Error('basis must explain the proven dependency/root-cause/ownership/verification boundary.');
if (!(dependsOn === 'NONE' || /^(SEQ-\d{3})(,\s*SEQ-\d{3})*$/.test(dependsOn))) throw new Error('depends-on must be NONE or comma-separated SEQ-NNN IDs.');

const packageRoot = resolve(frameworkRoot, packageName);
if (!packageRoot.startsWith(`${resolve(frameworkRoot)}${sep}`)) throw new Error('Package path escapes framework root.');
const overviewPath = join(packageRoot, '00-OVERVIEW.md');
if (!(await exists(overviewPath))) throw new Error('V2 package must contain 00-OVERVIEW.md.');

let overview = await readFile(overviewPath, 'utf8');
const overviewMeta = meta(overview);
if (overviewMeta.PACKAGE_SCHEMA !== 'BTHWANI_TASK_PACKAGE_V2') throw new Error('Package is not BTHWANI_TASK_PACKAGE_V2.');
if (overviewMeta.CURRENT_SEQUENCE_ID !== 'UNSET') throw new Error(`Current sequence is still active: ${overviewMeta.CURRENT_SEQUENCE_ID}. Complete/prepare and clear it before creating the next sequence.`);
if ((overviewMeta.CURRENT_SHA ?? '').toLowerCase() !== baseSha.toLowerCase()) throw new Error(`base-sha must equal overview CURRENT_SHA (${overviewMeta.CURRENT_SHA ?? '<missing>'}) after fresh-head reconciliation.`);

const entries = await readdir(packageRoot, { withFileTypes: true });
if (entries.some((entry) => entry.isDirectory())) throw new Error('V2 packages must not contain subdirectories.');
const ordinals = entries
  .filter((entry) => entry.isFile() && /^\d{3}-[a-z0-9-]+\.md$/.test(entry.name))
  .map((entry) => Number(entry.name.slice(0, 3)));
const nextOrder = ordinals.length ? Math.max(...ordinals) + 1 : 1;
if (nextOrder > 999) throw new Error('Sequence ordinal limit exceeded.');
const order = String(nextOrder).padStart(3, '0');
const sequenceId = `SEQ-${order}`;
const filename = `${order}-${name}.md`;
const destination = join(packageRoot, filename);
if (await exists(destination)) throw new Error(`Sequence file already exists: ${filename}`);

const template = await readFile(join(templateRoot, 'SEQUENCE.template.md'), 'utf8');
const content = replaceAll(template, {
  '__TASK_ID__': overviewMeta.TASK_ID,
  '__REPOSITORY__': overviewMeta.REPOSITORY,
  '__BRANCH__': overviewMeta.BRANCH,
  '__MODE__': overviewMeta.MODE,
  '__SEQUENCE_ID__': sequenceId,
  '__SEQUENCE_NAME__': name,
  '__SEQUENCE_TITLE__': title,
  '__SEQUENCE_ORDER__': order,
  '__BASE_SHA__': baseSha.toLowerCase(),
  '__DERIVATION_BASIS__': basis,
  '__DEPENDS_ON__': dependsOn,
});

const marker = '<!-- SEQUENCE_REGISTRY_ROWS -->';
if (!overview.includes(marker)) throw new Error('Overview sequence registry marker is missing.');
const row = `| ${sequenceId} | \`${filename}\` | ${title.replaceAll('|', '\\|')} | ${basis.replaceAll('|', '\\|')} | ${dependsOn} | TBD | DIAGNOSING | material finding/decision/head drift |`;
overview = overview.replace(/^CURRENT_SEQUENCE_ID:\s*UNSET$/m, `CURRENT_SEQUENCE_ID: ${sequenceId}`);
overview = overview.replace(marker, `${row}\n${marker}`);

await writeFile(destination, content, { encoding: 'utf8', flag: 'wx' });
await writeFile(overviewPath, overview, 'utf8');

console.log(`Created ${sequenceId}: ${filename}`);
console.log('Overview CURRENT_SEQUENCE_ID and registry were updated.');
console.log('Do not create another sequence until this one reaches the mode-specific exit gate and CURRENT_SEQUENCE_ID is cleared.');
