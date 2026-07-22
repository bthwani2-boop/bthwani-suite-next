import assert from "node:assert/strict";
import fs from "node:fs";
import Ajv from "ajv";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const truthPath = "governance/product/contracts/jrn-001-partner-onboarding-store-publication.product-truth.json";
const schemaPath = "governance/product/product-truth.schema.json";
const truth = readJson(truthPath);
const schema = readJson(schemaPath);
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);

assert.equal(validate(truth), true, JSON.stringify(validate.errors ?? []));
assert.equal(truth.capabilityId, "JRN_001_PARTNER_ONBOARDING_STORE_PUBLICATION");
assert.ok(["READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "PRODUCT_ACCEPTED"].includes(truth.state));
assert.equal(truth.owners.productManagerApproval, "APPROVED");
assert.equal(truth.owners.productOwnerApproval, "APPROVED");
assert.equal(truth.execution.appetite, "Close JRN-001 sequentially across all mandatory FS-01 through FS-18 slices, then stop before JRN-002.");
assert.equal(truth.acceptance.runtimeEvidenceRequired, true);
assert.equal(truth.acceptance.visualEvidenceRequired, true);

const requiredSurfaces = truth.surfaces.filter((surface) => surface.required).map((surface) => surface.id).sort();
assert.deepEqual(requiredSurfaces, [
  "app-client",
  "app-field",
  "app-partner",
  "backend",
  "control-panel",
  "database",
  "shared",
]);

const captain = truth.surfaces.find((surface) => surface.id === "app-captain");
assert.ok(captain);
assert.equal(captain.required, false);
assert.match(captain.exclusionReason, /later order and dispatch journeys/i);

for (const actorId of ["field-agent", "partner-owner", "control-operator", "client"]) {
  assert.ok(truth.actors.some((actor) => actor.id === actorId), `missing actor ${actorId}`);
}
for (const criterion of truth.acceptance.criteria) assert.equal(typeof criterion, "string");
for (const invariant of [...truth.invariants.business, ...truth.invariants.negative]) assert.equal(typeof invariant, "string");

console.log("JRN-001 FS-01 Product Truth verified");
