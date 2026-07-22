import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const contractPath = resolve(
  root,
  "governance/product/contracts/JRN-026_COUPONS_DELIVERY_PRICING_LOYALTY.product-truth.json",
);
const schemaPath = resolve(root, "governance/product/product-truth.schema.json");

const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const failures = [];

const fail = (message) => failures.push(message);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;

if (contract.schemaVersion !== 1) fail("schemaVersion must equal 1");
if (contract.capabilityId !== "JRN_026_COUPONS_DELIVERY_PRICING_LOYALTY") {
  fail("capabilityId must identify JRN-026");
}
if (contract.state !== "PRODUCT_MODEL_APPROVED") fail("state must be PRODUCT_MODEL_APPROVED");
if (!schema || typeof schema !== "object") fail("product truth schema is unreadable");

if (!isNonEmptyString(contract.problem?.statement)) fail("problem.statement is required");
if (!isNonEmptyArray(contract.problem?.affectedActors)) fail("problem.affectedActors is required");
if (!isNonEmptyArray(contract.problem?.evidenceReferences)) fail("problem.evidenceReferences is required");

if (!isNonEmptyArray(contract.actors)) {
  fail("actors are required");
} else {
  const actorIds = new Set();
  for (const actor of contract.actors) {
    if (!isNonEmptyString(actor?.id)) fail("every actor requires an id");
    if (actorIds.has(actor?.id)) fail(`duplicate actor id: ${actor?.id}`);
    actorIds.add(actor?.id);
    if (!isNonEmptyString(actor?.role)) fail(`actor ${actor?.id} requires a role`);
    if (!isNonEmptyArray(actor?.permittedActions)) fail(`actor ${actor?.id} requires permittedActions`);
    if (!isNonEmptyArray(actor?.forbiddenActions)) fail(`actor ${actor?.id} requires forbiddenActions`);
  }
}

const requiredSurfaces = new Set([
  "control-panel",
  "app-partner",
  "app-client",
  "shared",
  "backend",
  "database",
]);
if (!isNonEmptyArray(contract.surfaces)) {
  fail("surfaces are required");
} else {
  const seen = new Set();
  for (const surface of contract.surfaces) {
    if (!isNonEmptyString(surface?.id)) fail("every surface requires an id");
    if (seen.has(surface?.id)) fail(`duplicate surface id: ${surface?.id}`);
    seen.add(surface?.id);
    if (surface?.required !== true) fail(`surface ${surface?.id} must be required`);
    if (!isNonEmptyArray(surface?.actors)) fail(`surface ${surface?.id} requires actors`);
    if (!isNonEmptyArray(surface?.routesOrScreens) && !isNonEmptyArray(surface?.operationIds)) {
      fail(`surface ${surface?.id} requires routesOrScreens or operationIds`);
    }
    if (!isNonEmptyArray(surface?.states)) fail(`surface ${surface?.id} requires states`);
    if (!isNonEmptyArray(surface?.actions)) fail(`surface ${surface?.id} requires actions`);
  }
  for (const surface of requiredSurfaces) {
    if (!seen.has(surface)) fail(`missing required surface: ${surface}`);
  }
}

if (!isNonEmptyString(contract.outcome?.statement)) fail("outcome.statement is required");
if (!isNonEmptyString(contract.outcome?.primaryMetric)) fail("outcome.primaryMetric is required");
if (!isNonEmptyArray(contract.outcome?.guardrailMetrics)) fail("outcome.guardrailMetrics is required");
if (!isNonEmptyString(contract.outcome?.targetState)) fail("outcome.targetState is required");

if (!isNonEmptyArray(contract.acceptance?.criteria)) fail("acceptance.criteria is required");
if (!isNonEmptyArray(contract.acceptance?.failureStates)) fail("acceptance.failureStates is required");
if (!isNonEmptyArray(contract.acceptance?.requiredChecks)) fail("acceptance.requiredChecks is required");
if (contract.acceptance?.runtimeEvidenceRequired !== true) fail("runtimeEvidenceRequired must be true");
if (contract.acceptance?.visualEvidenceRequired !== true) fail("visualEvidenceRequired must be true");

if (!isNonEmptyArray(contract.invariants?.business)) fail("invariants.business is required");
if (!isNonEmptyArray(contract.invariants?.negative)) fail("invariants.negative is required");

if (contract.owners?.productManagerApproval !== "APPROVED") {
  fail("productManagerApproval must be APPROVED");
}
if (contract.owners?.productOwnerApproval !== "PENDING") {
  fail("productOwnerApproval must remain PENDING until independent approval");
}
if (contract.owners?.productAcceptanceDecision !== "PENDING") {
  fail("productAcceptanceDecision must remain PENDING until independent acceptance");
}

if (!isNonEmptyArray(contract.execution?.fixedConstraints)) fail("execution.fixedConstraints is required");
if (!isNonEmptyArray(contract.execution?.forbiddenScope)) fail("execution.forbiddenScope is required");
if (!isNonEmptyArray(contract.execution?.unknowns)) fail("execution.unknowns is required");

const serialized = JSON.stringify(contract).toLowerCase();
for (const requiredPhrase of [
  "dsh owns coupon eligibility and delivery pricing policy",
  "wlt owns loyalty balances and promotion-funding financial state",
  "no loyalty balance in dsh",
  "no self approval",
  "no stale overwrite",
]) {
  if (!serialized.includes(requiredPhrase)) fail(`missing sovereignty invariant: ${requiredPhrase}`);
}

if (serialized.includes('"productownerapproval":"approved"')) {
  fail("independent product owner approval must not be self-granted");
}
if (serialized.includes('"productacceptancedecision":"accepted"')) {
  fail("independent product acceptance must not be self-granted");
}

if (failures.length > 0) {
  console.error("JRN-026 Product Truth gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  gate: "jrn-026-product-truth",
  capabilityId: contract.capabilityId,
  state: contract.state,
  requiredSurfaces: [...requiredSurfaces],
  productOwnerApproval: contract.owners.productOwnerApproval,
  productAcceptanceDecision: contract.owners.productAcceptanceDecision,
}, null, 2));
