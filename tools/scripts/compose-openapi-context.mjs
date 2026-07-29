import { composeAllContexts, composeContext, contextManifests } from "./openapi-context-composer.mjs";

const requested = process.argv[2];
try {
  const results = requested === "all"
    ? await composeAllContexts({ write: true })
    : [await composeContext(requested, { write: true })];
  for (const result of results) {
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
