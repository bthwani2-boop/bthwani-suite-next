import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const runtimeFiles = [
  "apps/app-captain/runtime/src/index.ts",
  "apps/app-client/runtime/src/index.ts",
  "apps/app-field/runtime/src/index.ts",
  "apps/app-partner/runtime/src/index.ts",
];

test("all mobile runtimes use the v3 query persistence namespace", () => {
  for (const relativePath of runtimeFiles) {
    const source = readFileSync(resolve(repositoryRoot, relativePath), "utf8");
    assert.match(source, /bthwani-query-cache:v3:\$\{APP_KEY\}/, relativePath);
    assert.doesNotMatch(source, /bthwani-query-cache:v2/, relativePath);
  }

  const persistence = readFileSync(
    resolve(repositoryRoot, "shared/data-runtime/src/persistence.ts"),
    "utf8",
  );
  assert.match(persistence, /const CACHE_SCHEMA_VERSION = 3/);
});
