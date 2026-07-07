import { readFileSync } from 'fs';
const ledger = JSON.parse(readFileSync('.diagnostics/operational-journey-factory/gap-ledger.json', 'utf8'));
const byType = {};
const byPath = {};
for (const g of ledger.gaps) {
  byType[g.type] = (byType[g.type] || 0) + 1;
  const pathGroup = g.path?.split('/').slice(0,5).join('/') || 'unknown';
  byPath[pathGroup] = (byPath[pathGroup] || 0) + 1;
}
console.log('GAP TYPES:', JSON.stringify(byType, null, 2));
console.log('TOTAL:', ledger.gap_count);
// Show top P0 gaps
const P0_TYPES = ['UNRESOLVED_IMPORT','CIRCULAR_DEPENDENCY','DIRECT_API_IN_SURFACE','BUSINESS_LOGIC_IN_SURFACE','UNBOUND_UI_ACTION','UNBOUND_ICON','UNBOUND_TAB','UNBOUND_STATE','MISSING_SHARED_CONTROLLER','MISSING_PERMISSION_GUARD','MISSING_API_BACKEND_BINDING','WLT_DSH_FINANCE_BOUNDARY_VIOLATION','SHARED_API_LOGIC_MIXED'];
const p0Gaps = ledger.gaps.filter(g => P0_TYPES.includes(g.type));
console.log('P0 GAPS:', p0Gaps.length);
for (const g of p0Gaps.slice(0, 20)) {
  console.log(` [${g.type}] ${g.path} — ${g.reason?.slice(0,80) || ''}`);
}
