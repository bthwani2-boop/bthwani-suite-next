import { readFileSync } from 'fs';

// Check toolchain for ACTIVE_FAIL tools that emit gaps
const toolchain = JSON.parse(readFileSync('.diagnostics/operational-journey-factory/toolchain-inventory.json', 'utf8'));
const tools = toolchain.tools || [];
const failingTools = tools.filter(t => {
  const cls = t.classification || [];
  return cls.includes('ACTIVE_FAIL') || cls.includes('BLOCKED_NEEDS_TOOL') || cls.includes('MISSING_SCRIPT');
});
console.log('FAILING TOOLS THAT EMIT GAPS:', failingTools.length);
for (const t of failingTools) {
  console.log(`  [${t.tool_id}] cls=${JSON.stringify(t.classification)} activation=${t.activation} failure_policy=${t.failure_policy}`);
}

const warnTools = tools.filter(t => {
  const cls = t.classification || [];
  return !cls.includes('ACTIVE_FAIL') && !cls.includes('BLOCKED_NEEDS_TOOL') && !cls.includes('MISSING_SCRIPT') &&
    (cls.includes('ACTIVE_WARN') || cls.includes('FIX_REQUIRED')) && t.activation === 'active' && t.failure_policy === 'fail';
});
console.log('\nACTIVE WARN FAIL-POLICY TOOLS:', warnTools.length);
for (const t of warnTools.slice(0, 10)) {
  console.log(`  [${t.tool_id}] cls=${JSON.stringify(t.classification)}`);
}

// Check surface for DIRECT_API or BUSINESS_LOGIC candidates
const surfaces = JSON.parse(readFileSync('.diagnostics/operational-journey-factory/surface-inventory.json', 'utf8'));
const directApi = (surfaces.direct_api_signs || []).length;
const localLogic = (surfaces.local_business_logic_candidates || []).length;
const missingSurfaces = (surfaces.missing_required_surfaces || []).length;
console.log('\nSURFACE GAPS:');
console.log('  direct_api_signs:', directApi);
console.log('  local_business_logic_candidates:', localLogic);
console.log('  missing_required_surfaces:', missingSurfaces);

// Check journey inventory
const journeys = JSON.parse(readFileSync('.diagnostics/operational-journey-factory/journey-inventory.json', 'utf8'));
const missingSourceFiles = Object.entries(journeys.source_files || {}).filter(([,v]) => !v.exists);
console.log('\nJOURNEY GAPS:');
console.log('  missing source files:', missingSourceFiles.length);
for (const [name, v] of missingSourceFiles) {
  console.log(`  ${name}: ${v.path}`);
}
const hasOpenApi = (journeys.openapi_files || []).length > 0;
const hasGenerated = (journeys.generated_clients || []).length > 0;
console.log('  has openapi:', hasOpenApi, 'has generated clients:', hasGenerated);
