import assert from "node:assert/strict";
import test from "node:test";
import {
  filterLcov,
  mergeLcovRecords,
  planCoverageSuites,
} from "./generate-sonar-node-coverage.mjs";

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

test("canonical LCOV merge sums duplicate source evidence without losing counters", () => {
  const source = "shared/data-runtime/src/create-query-client.ts";
  const first = [
    "TN:",
    `SF:${source}`,
    "FN:1,retryPolicy",
    "FNDA:1,retryPolicy",
    "FNF:1",
    "FNH:1",
    "BRDA:1,0,0,1",
    "BRDA:1,0,1,-",
    "BRF:2",
    "BRH:1",
    "DA:1,1",
    "DA:2,0",
    "LF:2",
    "LH:1",
    "end_of_record",
  ].join("\n");
  const second = [
    "TN:",
    `SF:${source}`,
    "FN:1,retryPolicy",
    "FNDA:2,retryPolicy",
    "FNF:1",
    "FNH:1",
    "BRDA:1,0,0,2",
    "BRDA:1,0,1,1",
    "BRF:2",
    "BRH:2",
    "DA:1,2",
    "DA:2,1",
    "LF:2",
    "LH:2",
    "end_of_record",
  ].join("\n");

  const merged = mergeLcovRecords([first, second]);
  assert.equal(merged.length, 1);
  assert.equal((merged[0].match(/^SF:/gm) ?? []).length, 1);
  assert.match(merged[0], /^FNDA:3,retryPolicy$/m);
  assert.match(merged[0], /^FNF:1$/m);
  assert.match(merged[0], /^FNH:1$/m);
  assert.match(merged[0], /^BRDA:1,0,0,3$/m);
  assert.match(merged[0], /^BRDA:1,0,1,1$/m);
  assert.match(merged[0], /^BRF:2$/m);
  assert.match(merged[0], /^BRH:2$/m);
  assert.match(merged[0], /^DA:1,3$/m);
  assert.match(merged[0], /^DA:2,1$/m);
  assert.match(merged[0], /^LF:2$/m);
  assert.match(merged[0], /^LH:2$/m);
});

test("canonical LCOV merge fails closed on conflicting function locations", () => {
  const source = "shared/data-runtime/src/create-query-client.ts";
  const first = `TN:\nSF:${source}\nFN:1,retryPolicy\nFNDA:1,retryPolicy\nFNF:1\nFNH:1\nLF:0\nLH:0\nend_of_record\n`;
  const second = `TN:\nSF:${source}\nFN:2,retryPolicy\nFNDA:1,retryPolicy\nFNF:1\nFNH:1\nLF:0\nLH:0\nend_of_record\n`;
  assert.throws(
    () => mergeLcovRecords([first, second]),
    /function 'retryPolicy' maps to conflicting lines 1 and 2/,
  );
});
