import { composeWltOpenApi, generatedBundlePath, repositoryRoot } from './wlt-openapi-bundle-lib.mjs';
import path from 'node:path';

try {
  const result = composeWltOpenApi({ write: true });
  const output = path.relative(repositoryRoot, generatedBundlePath).split(path.sep).join('/');
  console.log(`wlt-openapi-compose: OK (${result.pathCount} paths, ${result.operationIds.length} operations) -> ${output}`);
} catch (error) {
  console.error(`wlt-openapi-compose: FAILED\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
