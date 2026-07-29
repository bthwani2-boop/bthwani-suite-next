import { verifyWltGeneratedArtifacts } from '../scripts/wlt-openapi-bundle-lib.mjs';

try {
  const result = verifyWltGeneratedArtifacts();
  if (result.violations.length > 0) {
    console.error('wlt-openapi-bundle-gate: FAILED');
    for (const violation of result.violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  } else {
    console.log(`wlt-openapi-bundle-gate: OK (${result.pathCount} paths, ${result.operationIds.length} operations)`);
  }
} catch (error) {
  console.error(`wlt-openapi-bundle-gate: FAILED\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
