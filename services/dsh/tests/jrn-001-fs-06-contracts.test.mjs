import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const registry = JSON.parse(read("services/dsh/contracts/jrn-001-operation-registry.json"));
const dshContract = read("services/dsh/contracts/dsh.partner-onboarding.openapi.yaml");
const wltContract = read("services/wlt/contracts/wlt.payout-destination.openapi.yaml");
const sharedAdapter = read("services/dsh/frontend/shared/partner/partner.api.ts");
const dshWltAdapter = read("services/dsh/backend/internal/wlt/payout_destination.go");
const wltServer = read("services/wlt/backend/internal/http/server.go");
const swaggerBuild = read("tools/scripts/build-swagger-static.mjs");

assert.equal(registry.schemaVersion, 1);
assert.equal(registry.journeyId, "JRN-001");
assert.deepEqual(registry.contracts, [
  "services/dsh/contracts/dsh.partner-onboarding.openapi.yaml",
  "services/wlt/contracts/wlt.payout-destination.openapi.yaml",
]);

const ids = registry.operations.map((operation) => operation.operationId);
assert.equal(new Set(ids).size, ids.length, "operation registry contains duplicate operationIds");

for (const operation of registry.operations) {
  const contract = operation.owner === "wlt" ? wltContract : dshContract;
  assert.ok(contract.includes(`operationId: ${operation.operationId}`), `missing operationId ${operation.operationId}`);
  assert.ok(contract.includes(operation.path.replaceAll("{", "{").replaceAll("}", "}")), `missing path ${operation.path}`);
  assert.match(operation.adapter, /#.+$/);
  const [file, symbol] = operation.adapter.split("#");
  const source = read(file);
  assert.ok(source.includes(symbol), `adapter symbol ${symbol} is missing from ${file}`);
}

for (const operationId of [
  "getDshPartner",
  "transitionDshPartner",
  "linkDshPartnerStore",
  "getFieldPartnerDraft",
  "updateFieldPartnerDraft",
  "createFieldPartnerVisit",
  "submitFieldPartnerDraft",
  "getDshPartnerActivationStatus",
  "getDshPartnerSelfReadiness",
]) {
  assert.ok(dshContract.includes(`operationId: ${operationId}`));
}
for (const operationId of [
  "upsertWltPayoutDestination",
  "getWltPayoutDestination",
  "deactivateWltPayoutDestination",
]) {
  assert.ok(wltContract.includes(`operationId: ${operationId}`));
}

assert.match(dshContract, /allowedActions:/);
assert.match(dshContract, /allowedTransitions:/);
assert.match(dshContract, /writeOnly: true/);
assert.match(wltContract, /Idempotency-Key/);
assert.match(wltContract, /X-Correlation-ID/);
assert.match(wltContract, /writeOnly: true/);
assert.match(sharedAdapter, /manual shared adapter/);
assert.match(sharedAdapter, /createDshHttpClient/);
assert.match(dshWltAdapter, /setRequiredMutationHeaders/);
assert.match(wltServer, /HandleUpsertPayoutDestinationGoverned/);
assert.match(swaggerBuild, /dsh\.partner-onboarding\.openapi\.yaml/);
assert.match(swaggerBuild, /wlt\.payout-destination\.openapi\.yaml/);

console.log("JRN-001 FS-06 contracts, registry, and adapters verified");
