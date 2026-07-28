import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repoRoot = new URL("../../", import.meta.url);
const retirementPath = new URL("services/wlt/contracts/retired-runtime-operations.json", repoRoot);
const rootContractPath = new URL("services/wlt/contracts/wlt.openapi.yaml", repoRoot);
const payoutContractPath = new URL("services/wlt/contracts/jrn-037-payouts-destinations.openapi.yaml", repoRoot);
const routerPath = new URL("services/wlt/backend/internal/http/server.go", repoRoot);

const [retirementRaw, rootContract, payoutContract, router] = await Promise.all([
  readFile(retirementPath, "utf8"),
  readFile(rootContractPath, "utf8"),
  readFile(payoutContractPath, "utf8"),
  readFile(routerPath, "utf8"),
]);
const retirement = JSON.parse(retirementRaw);

function routeRegistration(operation) {
  const separator = operation.indexOf(" ");
  const method = operation.slice(0, separator);
  const path = operation.slice(separator + 1);
  return `mux.HandleFunc("${method} ${path}"`;
}

function contractedPath(operation) {
  const path = operation.slice(operation.indexOf(" ") + 1);
  return `  ${path}:`;
}

test("WLT retired operation registry records full contract and runtime removal", () => {
  assert.equal(retirement.schemaVersion, 1);
  assert.equal(retirement.service, "WLT");
  assert.equal(retirement.sourceContract, "services/wlt/contracts/wlt.openapi.yaml");
  assert.equal(retirement.state, "CONTRACT_COMPATIBILITY_ONLY_RUNTIME_REMOVED");
  assert.equal(retirement.contractRemovalState, "REMOVED");
  assert.ok(Array.isArray(retirement.operations));
  assert.ok(retirement.operations.length > 0);

  const keys = retirement.operations.map((item) => item.operation);
  assert.equal(new Set(keys).size, keys.length, "retired operation keys must be unique");
});

test("retired WLT operations are absent while canonical replacements stay bound", () => {
  for (const item of retirement.operations) {
    assert.match(item.operation, /^(GET|POST|PUT|PATCH|DELETE) \/wlt\//);
    assert.ok(typeof item.reason === "string" && item.reason.trim().length >= 24);
    assert.ok(!rootContract.includes(contractedPath(item.operation)), `${item.operation} must stay absent from the active WLT contract`);
    assert.ok(!router.includes(routeRegistration(item.operation)), `${item.operation} must stay absent from WLT runtime`);

    if (item.canonicalRoute) {
      assert.ok(router.includes(routeRegistration(item.canonicalRoute)), `${item.canonicalRoute} must stay registered`);
      assert.ok(payoutContract.includes(contractedPath(item.canonicalRoute)), `${item.canonicalRoute} must stay contracted`);
    }
  }
});
