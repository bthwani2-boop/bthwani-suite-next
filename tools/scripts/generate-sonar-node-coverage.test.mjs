import assert from "node:assert/strict";
import test from "node:test";
import {
  assertChangedExecutableCoverageOwnership,
  filterLcov,
  loadCoverageOwnershipModel,
  mergeLcovRecords,
  planCoverageSuites,
} from "./generate-sonar-node-coverage.mjs";

const EXECUTABLE_SUITES = [
  "app-captain",
  "app-client",
  "app-field",
  "app-partner",
  "control-panel",
  "control-panel-config",
  "data-runtime",
  "dsh",
  "identity",
  "ui-kit",
  "wlt",
];

test("coverage ownership is manifest-derived and exposes executable source authorities", () => {
  const model = loadCoverageOwnershipModel();
  assert.deepEqual(model.allSuites, EXECUTABLE_SUITES);
  assert.equal(model.projects["app-captain"].strategy, "node-lcov");
  assert.equal(model.projects["app-client"].strategy, "node-lcov");
  assert.equal(model.projects["app-field"].strategy, "node-lcov");
  assert.equal(model.projects["app-partner"].strategy, "node-lcov");
  assert.equal(model.projects["control-panel"].strategy, "node-lcov");
  assert.equal(model.projects["control-panel-config"].strategy, "node-lcov");
  assert.equal(model.projects["data-runtime"].strategy, "node-lcov");
  assert.equal(model.projects.dsh.strategy, "node-lcov");
  assert.equal(model.projects.identity.strategy, "node-lcov");
  assert.equal(model.projects["ui-kit"].strategy, "node-lcov");
  assert.equal(model.projects.wlt.strategy, "node-lcov");
});

test("coverage preparation is an ordered shell-free command contract", () => {
  const model = loadCoverageOwnershipModel();
  assert.deepEqual(model.suites.dsh.prepare, [
    "pnpm",
    "--dir",
    "services/dsh",
    "run",
    "build:ts",
  ]);
  assert.equal(model.suites.identity.prepare, null);
  assert.equal(model.suites["control-panel-config"].prepare, null);
});

test("coverage planning is source-authority based rather than app-name based", () => {
  assert.deepEqual(planCoverageSuites(["services/dsh/frontend/shared/catalog/a.ts"]), ["dsh"]);
  assert.deepEqual(planCoverageSuites(["shared/data-runtime/src/a.ts"]), ["data-runtime"]);
  assert.deepEqual(planCoverageSuites(["core/identity/clients/identity-session-store.ts"]), ["identity"]);
  assert.deepEqual(planCoverageSuites(["apps/control-panel/runtime/next.config.mjs"]), ["control-panel-config"]);
  assert.deepEqual(planCoverageSuites(["services/wlt/frontend/shared/dsh/finance/a.ts"]), ["wlt"]);
  assert.deepEqual(planCoverageSuites(["apps/app-field/runtime/src/navigation/field-deep-link.ts"]), ["app-field"]);
  assert.deepEqual(planCoverageSuites(["apps/app-captain/runtime/src/App.tsx"]), ["app-captain"]);
  assert.deepEqual(
    planCoverageSuites(["apps/app-partner/runtime/tests/partner-order-runtime.execution.test.mjs"]),
    ["app-partner", "dsh"],
  );
  assert.deepEqual(
    planCoverageSuites(["apps/app-field/runtime/tests/field-deep-link.execution.test.mjs"]),
    ["app-field", "dsh"],
  );
  assert.deepEqual(
    planCoverageSuites(["apps/app-captain/runtime/tests/captain-readiness-policy.execution.test.mjs"]),
    ["app-captain", "dsh"],
  );
});

test("changed executable product source is covered or rejected before Sonar", () => {
  assert.deepEqual(planCoverageSuites(["apps/app-client/runtime/src/index.ts"]), ["app-client"]);
  assert.throws(
    () => assertChangedExecutableCoverageOwnership(["apps/unknown-surface/src/a.ts"]),
    /no project owns this executable JS\/TS source/,
  );
});

test("verification tooling is not misclassified as uncovered product source", () => {
  assert.doesNotThrow(() => assertChangedExecutableCoverageOwnership([
    "apps/mobile/test-mobile-runtime-contract.mjs",
    "apps/mobile/tests/mobile-runtime-transport.contract.test.mjs",
  ]));
  assert.deepEqual(planCoverageSuites(["apps/mobile/test-mobile-runtime-contract.mjs"]), []);
});

test("coverage self-verification and full mode derive suites from the manifest", () => {
  assert.deepEqual(planCoverageSuites(["tools/verification/ownership.manifest.json"]), EXECUTABLE_SUITES);
  assert.deepEqual(planCoverageSuites([], { mode: "full" }), EXECUTABLE_SUITES);
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

test("canonical LCOV merge sums resolvable evidence and omits unmappable source-map metadata", () => {
  const source = "shared/data-runtime/src/create-query-client.ts";
  const first = [
    "TN:",
    `SF:${source}`,
    "FN:undefined,get",
    "FNDA:1,get",
    "FNF:1",
    "FNH:1",
    "BRDA:undefined,2,0,1",
    "BRDA:1,0,0,1",
    "BRDA:1,0,1,-",
    "BRF:3",
    "BRH:2",
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
  assert.doesNotMatch(merged[0], /^(?:FN|FNDA|FNF|FNH):/m);
  assert.doesNotMatch(merged[0], /^BRDA:undefined,/m);
  assert.match(merged[0], /^BRDA:1,0,0,3$/m);
  assert.match(merged[0], /^BRDA:1,0,1,1$/m);
  assert.match(merged[0], /^BRF:2$/m);
  assert.match(merged[0], /^BRH:2$/m);
  assert.match(merged[0], /^DA:1,3$/m);
  assert.match(merged[0], /^DA:2,1$/m);
  assert.match(merged[0], /^LF:2$/m);
  assert.match(merged[0], /^LH:2$/m);
});

test("canonical LCOV merge fails closed on unsupported fields", () => {
  const source = "shared/data-runtime/src/create-query-client.ts";
  const raw = `TN:\nSF:${source}\nUNKNOWN:1\nDA:1,1\nLF:1\nLH:1\nend_of_record\n`;
  assert.throws(() => mergeLcovRecords([raw]), /Unsupported LCOV field: UNKNOWN:1/);
});