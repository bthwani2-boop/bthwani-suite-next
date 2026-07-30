import {
  composeAllContexts,
  composeContext,
  contextManifests,
  repositoryRoot,
} from "./openapi-context-composer.mjs";
import { materializeVerifiedOpenApiBundle } from "./openapi-composition-integrity.mjs";

const requested = process.argv[2];
try {
  const results = requested === "all"
    ? await composeAllContexts({ write: false })
    : [await composeContext(requested, { write: false })];
  for (const result of results) {
    materializeVerifiedOpenApiBundle(result, repositoryRoot);
    console.log(
      `openapi-compose:${result.context}: PASS paths=${result.pathCount} operations=${result.operationIds.length} sha256=${result.sourceDigest} output=${result.bundlePath}`,
    );
  }
} catch (error) {
  const valid = [...Object.keys(contextManifests), "all"].join(", ");
  console.error(`openapi-compose: FAIL requested=${requested ?? "<missing>"} valid=${valid}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
