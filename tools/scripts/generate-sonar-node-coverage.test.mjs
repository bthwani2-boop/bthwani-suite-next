import assert from "node:assert/strict";
import test from "node:test";
import { filterLcov, planCoverageSuites } from "./generate-sonar-node-coverage.mjs";

test("coverage planning stays contextual and forces self-verification", () => {
  assert.deepEqual(planCoverageSuites(["services/dsh/frontend/shared/catalog/a.ts"]), ["dsh"]);
  assert.deepEqual(planCoverageSuites(["shared/data-runtime/src/a.ts"]), ["data-runtime"]);
  assert.deepEqual(planCoverageSuites(["core/identity/clients/identity-session-store.ts"]), ["identity"]);
  assert.deepEqual(planCoverageSuites(["apps/app-client/runtime/src/App.tsx"]), []);
  assert.deepEqual(planCoverageSuites(["services/wlt/frontend/shared/dsh/finance/a.ts"]), []);
  assert.deepEqual(
    planCoverageSuites([".github/workflows/sonarqube.yml"]),
    ["identity", "data-runtime", "dsh"],
  );
  assert.deepEqual(
    planCoverageSuites([], { mode: "full" }),
    ["identity", "data-runtime", "dsh"],
  );
});

test("LCOV filtering retains only real source records owned by the selected suite", () => {
  const raw = [
    "TN:",
    "SF:core/identity/clients/identity-session-store.ts",
    "DA:1,1",
    "LF:1",
    "LH:1",
    "end_of_record",
    "TN:",
    "SF:core/identity/tests/identity-session-outage.test.mjs",
    "DA:1,1",
    "LF:1",
    "LH:1",
    "end_of_record",
    "TN:",
    "SF:data:text/javascript;base64,ZmFrZQ==",
    "DA:1,1",
    "LF:1",
    "LH:1",
    "end_of_record",
  ].join("\n");

  const retained = filterLcov(raw, "identity");
  assert.equal(retained.length, 1);
  assert.match(retained[0], /^TN:\nSF:core\/identity\/clients\/identity-session-store\.ts/m);
  assert.doesNotMatch(retained[0], /core\/identity\/tests/);
  assert.doesNotMatch(retained[0], /data:text/);
});

test("LCOV filtering rejects records outside the suite authority", () => {
  const raw = [
    "TN:",
    "SF:core/identity/clients/identity-session-store.ts",
    "DA:1,1",
    "LF:1",
    "LH:1",
    "end_of_record",
  ].join("\n");

  assert.deepEqual(filterLcov(raw, "data-runtime"), []);
  assert.throws(() => filterLcov(raw, "unknown-suite"), /Unknown Sonar coverage suite/);
});

test("LCOV filtering fails before Sonar when a mapped line is outside the source file", () => {
  const raw = [
    "TN:",
    "SF:shared/data-runtime/src/create-query-client.ts",
    "DA:999999,1",
    "LF:1",
    "LH:1",
    "end_of_record",
  ].join("\n");

  assert.throws(
    () => filterLcov(raw, "data-runtime"),
    /LCOV DA line 999999 is outside shared\/data-runtime\/src\/create-query-client\.ts/,
  );
});
