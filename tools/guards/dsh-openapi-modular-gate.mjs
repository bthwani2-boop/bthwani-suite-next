import assert from "node:assert/strict";
import {
  composeContext,
} from "../scripts/openapi-context-composer.mjs";

const first = await composeContext("dsh", { write: false });
const second = await composeContext("dsh", { write: false });

assert.equal(
  first.bundle,
  second.bundle,
  "DSH OpenAPI composition must be deterministic without materializing generated artifacts",
);
assert.equal(
  first.sourceDigest,
  second.sourceDigest,
  "DSH OpenAPI source digest must be deterministic",
);
assert.ok(first.pathCount > 0, "DSH composed bundle must expose paths");
assert.ok(first.operationIds.length > 0, "DSH composed bundle must expose operations");
assert.equal(
  new Set(first.operationIds).size,
  first.operationIds.length,
  "DSH composed bundle contains duplicate operationIds",
);
assert.doesNotMatch(
  first.bundle,
  /\.\/paths\/[^\s"']+\.paths\.yaml/,
  "DSH composed bundle must not retain modular path references",
);
assert.doesNotMatch(
  first.bundle,
  /\.\/components\/[^\s"']+\.yaml/,
  "DSH composed bundle must not retain modular component references",
);
assert.match(
  first.bundle,
  /x-bthwani-contract-layout:\s*COMPOSED_BUNDLE/,
  "DSH composed bundle must declare its generated layout",
);

console.log(
  `DSH OpenAPI modular gate passed: ${JSON.stringify({
    bundlePath: first.bundlePath,
    pathCount: first.pathCount,
    operationCount: first.operationIds.length,
    sourceDigest: first.sourceDigest,
    repositoryWrites: 0,
  })}`,
);
