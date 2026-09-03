import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./migration-manifest-drift-gate.mjs", import.meta.url), "utf8");

test("migration drift gate consumes an explicit exact CI baseline", () => {
  assert.match(source, /process\.env\.CI_BASE_SHA/u);
  assert.match(source, /--immutable-baseline/u);
  assert.match(source, /merge-base", "--is-ancestor"/u);
});

test("migration drift gate cannot fall back to default or remote branch authority", () => {
  assert.doesNotMatch(source, /process\.env\.DEFAULT_BRANCH/u);
  assert.doesNotMatch(source, /process\.env\.GITHUB_BASE_REF/u);
  assert.doesNotMatch(source, /refs\/remotes\/origin\/HEAD/u);
  assert.match(source, /process\.env\.GITHUB_ACTIONS === "true"/u);
  assert.match(source, /implicit branch fallback is forbidden/u);
});
