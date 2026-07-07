import { readFileSync } from 'fs';

const surfaces = JSON.parse(readFileSync('.diagnostics/operational-journey-factory/surface-inventory.json', 'utf8'));
const allSurfaces = surfaces.surfaces || [];
console.log('Total surfaces:', allSurfaces.length);

let directApiCount = 0, localLogicCount = 0;
for (const s of allSurfaces) {
  const da = (s.direct_api_signs || []).length;
  const ll = (s.local_business_logic_candidates || []).length;
  directApiCount += da;
  localLogicCount += ll;
  if (da > 0 || ll > 0) {
    console.log(`\n[${s.kind}] ${s.surface}:`);
    if (da > 0) console.log(`  direct_api_signs (${da}):`, (s.direct_api_signs || []).slice(0,5).join(', '));
    if (ll > 0) console.log(`  local_business_logic (${ll}):`, (s.local_business_logic_candidates || []).slice(0,5).join(', '));
  }
}

console.log('\nTOTAL per-surface direct_api_signs:', directApiCount);
console.log('TOTAL per-surface local_business_logic:', localLogicCount);
