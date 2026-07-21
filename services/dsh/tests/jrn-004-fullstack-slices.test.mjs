import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const json = (path) => JSON.parse(read(path));

const registryPath = "contracts/jrn-004-slice-verification-registry.json";

test("JRN-004 registers all nine functional slices and FS-01 through FS-18", () => {
  const registry = json(registryPath);
  assert.equal(registry.journeyId, "JRN-004");
  assert.equal(registry.functionalSlices.length, 9);
  assert.equal(registry.fullStackSlices.length, 18);
  assert.deepEqual(
    registry.fullStackSlices.map((slice) => slice.id),
    Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`),
  );
  assert.equal(registry.functionalSlices.filter((slice) => slice.status !== "COMPLETE").length, 0);
  assert.equal(registry.zeroGate.unclosedFunctionalSlices, 0);
  assert.equal(registry.zeroGate.unclosedImplementationSlices, 0);
});

test("JRN-004 Product Truth owns one 13-condition publication gate", () => {
  const truth = read("../../governance/product-truth/JRN-004_STORE_DISCOVERY_CONTEXT_GOVERNANCE.md");
  const diagnostics = read("backend/internal/store/publication_diagnostics.go");
  const repository = read("backend/internal/store/repository.go");
  const model = read("backend/internal/store/model.go");

  assert.match(truth, /بوابة النشر الواحدة/);
  assert.match(truth, /13\./);
  assert.match(model, /return DiagnoseStorePublication\(row\)\.IsReady/);
  assert.match(repository, /const publicStorePredicate/);
  for (const blocker of [
    "STORE_NOT_ACTIVE",
    "STORE_HIDDEN",
    "STORE_NOT_SERVICEABLE",
    "PARTNER_NOT_READY",
    "CATALOG_NOT_APPROVED",
    "MARKETING_HIDDEN",
    "DELIVERY_MODES_MISSING",
    "ADDRESS_MISSING",
    "COVERAGE_MISSING",
    "OPERATING_HOURS_MISSING",
    "DELIVERY_NOT_READY",
    "STORE_LOGO_MISSING",
    "STORE_COVER_MISSING",
  ]) {
    assert.match(diagnostics, new RegExp(blocker));
  }
});

test("JRN-004 access, state, operation and surface registries are fail closed", () => {
  const access = json("contracts/jrn-004-access-matrix.json");
  const state = json("contracts/jrn-004-state-machine.json");
  const operations = json("contracts/jrn-004-operation-registry.json");
  const surfaces = json("contracts/jrn-004-surface-registry.json");

  assert.equal(access.defaultDecision, "DENY");
  assert.deepEqual(Object.keys(access.actors).sort(), ["captain", "client", "field", "operator", "partner"]);
  assert.equal(state.versionField, "version");
  assert.equal(state.publicationGate.requiredBlockersToBeAbsent.length, 13);
  assert.ok(operations.operations.some((operation) => operation.path === "/dsh/operator/stores/{storeId}/audit"));
  assert.ok(operations.operations.some((operation) => operation.path === "/dsh/operator/diagnostics/stores/{storeId}"));
  assert.deepEqual(Object.keys(surfaces.requiredSurfaces).sort(), ["app-captain", "app-client", "app-field", "app-partner", "control-panel"]);
  assert.equal(surfaces.excludedSurfaces.wlt.includes("outside"), true);
});

test("JRN-004 operator list applies validated pagination end to end", () => {
  const parser = read("backend/internal/store/handler.go");
  const protectedStore = read("backend/internal/http/protected_store.go");
  const api = read("frontend/shared/store/store-admin.api.ts");

  assert.match(parser, /func ParseListQuery\(q url\.Values\)/);
  assert.match(protectedStore, /store\.ParseListQuery\(r\.URL\.Query\(\)\)/);
  assert.doesNotMatch(protectedStore, /DshStoreListQuery\{Limit: 100, Offset: 0\}/);
  assert.match(api, /buildOperatorStoreListPath/);
  assert.match(api, /query\.set\("limit"/);
  assert.match(api, /query\.set\("offset"/);
});

test("JRN-004 operator sees diagnostics and immutable audit readback after governance", () => {
  const server = read("backend/internal/http/server.go");
  const protectedStore = read("backend/internal/http/protected_store.go");
  const api = read("frontend/shared/store/store-admin.api.ts");
  const controller = read("frontend/shared/store/use-store-admin-controller.tsx");
  const panel = read("frontend/control-panel/partners/stores/StoreDetailAdminPanel.tsx");
  const screen = read("frontend/control-panel/partners/stores/StoreManagementScreen.tsx");

  assert.match(server, /GET \/dsh\/operator\/stores\/\{storeId\}\/audit/);
  assert.match(protectedStore, /func \(s \*protectedStoreServer\) handleStoreAudit/);
  assert.match(api, /fetchAdminStoreAudit/);
  assert.match(api, /\/dsh\/operator\/stores\/\$\{encodeURIComponent\(storeId\)\}\/audit/);
  assert.match(controller, /loadAudit\(storeId\)/);
  assert.match(controller, /loadAudit\(selectedStoreId\)/);
  assert.match(panel, /StoreAuditRows/);
  assert.match(panel, /معرّف الارتباط/);
  assert.match(screen, /auditState=\{controller\.auditState\}/);
});

test("JRN-004 persistence adds constraints, indexes and idempotency expiry proof", () => {
  const migration = read("database/migrations/dsh-098_jrn_004_store_governance_closure.sql");
  const proof = read("database/tests/dsh-098_jrn_004_store_governance_closure.sql");

  assert.match(migration, /dsh_stores_version_positive_chk/);
  assert.match(migration, /dsh_store_action_audit_actor_role_chk/);
  assert.match(migration, /expires_at/);
  assert.match(migration, /idx_dsh_stores_public_discovery_gate/);
  assert.match(migration, /idx_dsh_stores_operator_page/);
  assert.match(proof, /version invariant accepted zero/);
  assert.match(proof, /audit actor-role invariant accepted client/);
  assert.match(proof, /idempotency expiry was not populated/);
});

test("JRN-004 security, observability, cleanup and runbook remain explicit", () => {
  const policy = json("contracts/jrn-004-governance-policy.json");
  const runbook = read("../../governance/runbooks/JRN-004_STORE_OPERATIONS.md");

  assert.equal(policy.observability.statusContext, "journeys/jrn-004/fullstack-slices");
  assert.ok(policy.security.mutationControls.includes("expectedVersion"));
  assert.ok(policy.cleanup.removed.includes("fixed operator list page of 100 records"));
  assert.match(runbook, /Publication incident diagnosis/);
  assert.match(runbook, /Emergency hide and reactivation/);
  assert.match(runbook, /Idempotency retention/);
  assert.equal(fs.existsSync(new URL("../../.github/workflows/tmp-jrn-004-apply-operator-pagination.yml", root)), false);
  assert.equal(fs.existsSync(new URL("../../tools/scripts/apply-jrn-004-operator-pagination.py", root)), false);
});
