import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const currentFile = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFile), "../../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repositoryRoot, relativePath));
}

function assertIncludesAll(content, values, label) {
  for (const value of values) {
    assert.ok(content.includes(value), `${label} is missing ${value}`);
  }
}

test("JRN-021 contracts are registered to their shared adapters", () => {
  const registry = read("services/dsh/contracts/contract-registry.ts");
  assertIncludesAll(registry, [
    'id: "dsh-support-governance"',
    'path: "contracts/dsh.support-governance.openapi.yaml"',
    'id: "dsh-incident-governance"',
    'path: "contracts/dsh.incident-governance.openapi.yaml"',
    'adapterOwner: "frontend/shared/support/incident-governance.api.ts"',
    'id: "dsh-order-rescue"',
    'path: "contracts/dsh.order-rescue.openapi.yaml"',
    'adapterOwner: "frontend/shared/support/order-rescue.api.ts"',
  ], "DSH contract registry");
});

test("JRN-021 incident contract requires retry-safe governed transitions", () => {
  const contract = read("services/dsh/contracts/dsh.incident-governance.openapi.yaml");
  assertIncludesAll(contract, [
    "operationId: createDshGovernedIncident",
    "operationId: updateDshGovernedIncident",
    "operationId: listDshGovernedIncidentEvents",
    "name: Idempotency-Key",
    "required: [expectedStatus, status]",
    "enum: [open, monitoring, resolved]",
  ], "incident contract");
});

test("JRN-021 order rescue contract preserves operational and WLT boundaries", () => {
  const contract = read("services/dsh/contracts/dsh.order-rescue.openapi.yaml");
  assertIncludesAll(contract, [
    "operationId: createDshOrderRescueCase",
    "operationId: updateDshOrderRescueCase",
    "operationId: listDshOrderRescueEvents",
    "name: Idempotency-Key",
    "wlt_reference_only",
    "open_wlt_visibility",
    "required: [expectedStatus, status, reason, owner, nextAction, operatorNote, affectedEntity, resolutionNote]",
  ], "order rescue contract");
});

test("JRN-021 runtime registers message delivery, rescue, and governed incidents", () => {
  const main = read("services/dsh/backend/cmd/dsh-api/main.go");
  assertIncludesAll(main, [
    "RegisterSupportMessageDeliveryRoutes",
    "RegisterOrderRescueRoutes",
    "GovernedIncidentMiddleware",
    "DSH_WLT_BASE_URL and WLT_DSH_SERVICE_TOKEN are required",
  ], "DSH API runtime");
  assert.ok(!main.includes("DSH_WLT_API_BASE_URL"), "runtime must use the governed DSH_WLT_BASE_URL name");
});

test("JRN-021 persistence owns incident and rescue audit truth", () => {
  const incidentMigration = read("services/dsh/database/migrations/dsh-098_jrn_021_incident_governance.sql");
  const rescueMigration = read("services/dsh/database/migrations/dsh-099_jrn_021_order_rescue.sql");
  assertIncludesAll(incidentMigration, [
    "CREATE TABLE IF NOT EXISTS dsh_incident_events",
    "uq_dsh_incidents_creator_idempotency",
    "UNIQUE (incident_id, event_type, correlation_id)",
  ], "incident migration");
  assertIncludesAll(rescueMigration, [
    "CREATE TABLE IF NOT EXISTS dsh_order_rescue_cases",
    "CREATE TABLE IF NOT EXISTS dsh_order_rescue_events",
    "uq_dsh_order_rescue_active_order",
    "wlt_reference_only",
    "UNIQUE (rescue_case_id, event_type, correlation_id)",
  ], "order rescue migration");
});

test("JRN-021 shared brain owns frontend coordination", () => {
  const exports = read("services/dsh/frontend/shared/support/index.ts");
  const incidentController = read("services/dsh/frontend/shared/support/use-governed-incident-controller.tsx");
  const rescueController = read("services/dsh/frontend/shared/support/use-order-rescue-controller.tsx");
  assertIncludesAll(exports, [
    "useGovernedSupportIncidentController as useSupportIncidentController",
    "useOrderRescueController",
    'export * from "./incident-governance.api"',
    'export * from "./order-rescue.api"',
  ], "shared support exports");
  assertIncludesAll(incidentController, [
    "getOrCreateSupportMutationAttempt",
    "expectedStatus: current.status",
    "fetchGovernedIncidentEvents",
  ], "incident controller");
  assertIncludesAll(rescueController, [
    "getOrCreateSupportMutationAttempt",
    "expectedStatus: rescueCase.status",
    "fetchOrderRescueEvents",
  ], "rescue controller");
});

test("JRN-021 order rescue screen is live and obsolete local truth is removed", () => {
  const screen = read("services/dsh/frontend/control-panel/operations/OrderRescueScreen.tsx");
  assertIncludesAll(screen, [
    "useOrderRescueController('authenticated')",
    "فتح حالة إنقاذ",
    "حل الحالة",
    "إغلاق الحالة",
    "reloadEvents",
  ], "order rescue screen");
  assert.ok(!screen.includes("RescueCase = never"), "quarantine type must be removed");
  assert.ok(!screen.includes("غير مفعّل"), "quarantine copy must be removed");
  assert.equal(
    exists("services/dsh/frontend/control-panel/operations/components/RescueCaseRow.tsx"),
    false,
    "obsolete local rescue row must be deleted",
  );
});

test("JRN-021 product truth remains independently approvable", () => {
  const schema = JSON.parse(read("governance/product/product-truth.schema.json"));
  const productTruth = JSON.parse(read("governance/product/contracts/jrn-021-support-incidents-order-rescue.product-truth.json"));
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  assert.equal(validate(productTruth), true, JSON.stringify(validate.errors));
  assert.equal(productTruth.capabilityId, "JRN_021_SUPPORT_INCIDENTS_ORDER_RESCUE");
  assert.equal(productTruth.state, "DISCOVERY");
  assert.equal(productTruth.owners.productManagerApproval, "PENDING");
  assert.equal(productTruth.owners.productOwnerApproval, "PENDING");
  assert.equal(productTruth.owners.productAcceptanceDecision, "PENDING");
});
