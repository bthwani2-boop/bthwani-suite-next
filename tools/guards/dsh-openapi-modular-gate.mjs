import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  composeContext,
  repositoryRoot,
} from "../scripts/openapi-context-composer.mjs";

const result = await composeContext("dsh", { write: false });
const committedBundle = fs.readFileSync(
  path.join(repositoryRoot, result.bundlePath),
  "utf8",
);

assert.equal(
  result.bundle,
  committedBundle,
  "DSH generated bundle is stale; run pnpm run openapi:generate:dsh",
);
assert.ok(result.pathCount > 0, "DSH composed bundle must expose paths");
assert.ok(result.operationIds.length > 0, "DSH composed bundle must expose operations");
assert.equal(
  new Set(result.operationIds).size,
  result.operationIds.length,
  "DSH composed bundle contains duplicate operationIds",
);

console.log(
  `DSH OpenAPI modular gate passed: ${JSON.stringify({
    bundlePath: result.bundlePath,
    pathCount: result.pathCount,
    operationCount: result.operationIds.length,
    sourceDigest: result.sourceDigest,
  })}`,
);
