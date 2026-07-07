import { readFileSync } from 'fs';
const ledger = JSON.parse(readFileSync('.diagnostics/operational-journey-factory/gap-ledger.json', 'utf8'));
// Group by file path and collect unused exports
const byFile = {};
for (const g of ledger.gaps) {
  if (!byFile[g.path]) byFile[g.path] = [];
  byFile[g.path].push(g.reason || g.gap_id);
}
console.log('FILES WITH UNUSED EXPORTS:');
for (const [file, reasons] of Object.entries(byFile)) {
  console.log(`\n${file}:`);
  for (const r of reasons) {
    // Extract just the export names
    const match = r.match(/Unused exports?: (.+)/);
    if (match) console.log('  EXPORTS:', match[1]);
    else console.log(' ', r.slice(0,100));
  }
}
