import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Run knip with json reporter and parse results
let knipOutput = '';
try {
  knipOutput = execSync('pnpm knip --reporter json', { encoding: 'utf8', cwd: process.cwd() });
} catch (err) {
  knipOutput = err.stdout || '';
}

const result = JSON.parse(knipOutput);
const unusedExportCount = result.issues?.reduce((acc, issue) => acc + (issue.exports?.length || 0), 0) || 0;
const unusedFileCount = result.issues?.reduce((acc, issue) => acc + (issue.files?.length || 0), 0) || 0;
const unlistedCount = result.issues?.reduce((acc, issue) => acc + (issue.unlisted?.length || 0), 0) || 0;
const unresolvedCount = result.issues?.reduce((acc, issue) => acc + (issue.unresolved?.length || 0), 0) || 0;

console.log('KNIP SUMMARY:');
console.log('  unusedExports:', unusedExportCount);
console.log('  unusedFiles:', unusedFileCount);
console.log('  unlisted:', unlistedCount);
console.log('  unresolved:', unresolvedCount);

// List all files with unused exports
const filesWithExports = result.issues?.filter(i => i.exports?.length > 0) || [];
console.log('\nFILES WITH UNUSED EXPORTS:', filesWithExports.length);
for (const f of filesWithExports.slice(0, 30)) {
  console.log(`  ${f.file}: ${f.exports.map(e => e.name).join(', ')}`);
}
