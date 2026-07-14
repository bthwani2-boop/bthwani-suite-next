import { readFileSync } from 'fs';
import { execSync } from 'child_process';

let knipOutput = '';
try {
  knipOutput = execSync('pnpm knip --reporter json', { encoding: 'utf8', cwd: process.cwd() });
} catch (err) {
  knipOutput = err.stdout || '';
}

const result = JSON.parse(knipOutput);
// Only look at unused exports in primary DSH/shared files
const filesWithExports = (result.issues || []).filter(i => i.exports?.length > 0);

// Count which are "false positive" (in entry paths) vs "real dead code"
const entryPatterns = [
  /services\/dsh\/frontend\/app-/,
  /services\/dsh\/frontend\/control-panel\//,
  /apps\/.*\/runtime\//,
];
const isEntryPath = (f) => entryPatterns.some(p => p.test(f));

const falsePositive = filesWithExports.filter(i => isEntryPath(i.file));
const realDeadCode = filesWithExports.filter(i => !isEntryPath(i.file));

console.log('Files with unused exports:', filesWithExports.length);
console.log('  False positives (entry/screen files):', falsePositive.length);
console.log('  Potential real dead code (shared modules):', realDeadCode.length);
console.log('\nREAL DEAD CODE FILES:');
for (const f of realDeadCode) {
  console.log(`  ${f.file}: ${f.exports.map(e => e.name).join(', ')}`);
}
