import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const paths = {
  handoffMigration: "services/dsh/database/migrations/dsh-095_store_captain_outbound_handoff.sql",
  reassignmentMigration: "services/dsh/database/migrations/dsh-096_store_captain_handoff_reassignment.sql",
  exceptionMigration: "services/dsh/database/migrations/dsh-097_store_captain_handoff_exceptions.sql",
  handoffDomain: "services/dsh/backend/internal/dispatch/store_captain_handoff.go",
  idempotencyDomain: "services/dsh/backend/internal/dispatch/store_captain_handoff_idempotency.go",
  exceptionDomain: "services/dsh/backend/internal/dispatch/store_captain_handoff_exceptions.go",
  exceptionTests: "services/dsh/backend/internal/dispatch/store_captain_handoff_exceptions_db_test.go",
  resolutionTests: "services/dsh/backend/internal/dispatch/store_captain_handoff_resolution_db_test.go",
  routes: "services/dsh/backend/internal/http/order_journey_routes.go",
  server: "services/dsh/backend/internal/http/server.go",
  main: "services/dsh/backend/cmd/dsh-api/main.go",
  workboard: "services/dsh/backend/internal/http/partner_order_workboard.go",
  baseContract: "services/dsh/contracts/dsh.openapi.yaml",
  contract: "services/dsh/contracts/dsh.store-captain-handoff.openapi.yaml",
  contractRegistry: "services/dsh/contracts/contract-registry.ts",
  sliceManifest: "services/dsh/contracts/jrn-013-slice-closure.json",
  partnerApi: "services/dsh/frontend/shared/orders/orders.api.ts",
  captainApi: "services/dsh/frontend/shared/dispatch/dispatch.api.ts",
  controller: "services/dsh/frontend/shared/dispatch/use-store-captain-handoff-exception.ts",
  partnerAdapter: "services/dsh/frontend/shared/partner/partner.adapters.ts",
  partnerScreen: "services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx",
  partnerList: "services/dsh/frontend/app-partner/orders/GovernedPartnerOrdersScreen.tsx",
  captainScreen: "services/dsh/frontend/app-captain/orders/OperationalCaptainExecutionScreen.tsx",
  operatorScreen: "services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx",
  clientController: "services/dsh/frontend/shared/orders/use-client-order-journey-controller.ts",
  productTruth: "governance/product/contracts/jrn-013-store-captain-handoff.product-truth.json",
  workflow: ".github/workflows/ci.yml",
};

test("custody database truth has dual confirmation, reassignment and reporter audit", () => {
  const handoff = read(paths.handoffMigration);
  const reassignment = read(paths.reassignmentMigration);
  const exception = read(paths.exceptionMigration);
  for (const token of ["awaiting_partner", "partner_confirmed", "completed", "superseded", "partner_confirmed_by_actor_id", "captain_confirmed_by_actor_id"]) {
    assert.match(handoff, new RegExp(token));
  }
  assert.match(handoff, /version\s+INTEGER\s+NOT NULL DEFAULT 1/);
  assert.match(reassignment, /AFTER INSERT ON dsh_assignments/);
  assert.match(reassignment, /status = 'superseded'/);
  assert.match(exception, /handoff_shortage/);
  assert.match(exception, /handoff_mismatch/);
  assert.match(exception, /dsh_delivery_exception_reporters/);
  assert.match(exception, /actor_role IN \('captain', 'partner'\)/);
});

test("backend enforces idempotency, exact replay and fail-closed pickup", () => {
  const handoff = read(paths.handoffDomain);
  const idempotency = read(paths.idempotencyDomain);
  const exception = read(paths.exceptionDomain);
  const exceptionTests = read(paths.exceptionTests);
  for (const token of ["ErrStoreHandoffRequired", "ensureStoreCaptainHandoff", "requireStoreCaptainHandoffConfirmed", "completeStoreCaptainHandoff", "DeliveryArrivedStore"]) {
    assert.match(handoff, new RegExp(token));
  }
  assert.match(idempotency, /UpdateDeliveryStatusGovernedIdempotent/);
  assert.match(idempotency, /ConfirmStoreCaptainHandoffIdempotent/);
  assert.match(idempotency, /ensureNoActiveStoreCaptainHandoffException/);
  assert.match(idempotency, /status IN \('open', 'acknowledged'\)/);
  assert.match(exception, /ReportPartnerStoreCaptainHandoffException/);
  assert.match(exception, /ReportCaptainStoreCaptainHandoffException/);
  assert.match(exception, /correlationId already belongs to a different exception command payload/);
  assert.match(exceptionTests, /partner payload drift error/);
  assert.match(exceptionTests, /captain payload drift error/);
});

test("runtime and OpenAPI have one governed operation owner", () => {
  const routes = read(paths.routes);
  const server = read(paths.server);
  const main = read(paths.main);
  const baseContract = read(paths.baseContract);
  const contract = read(paths.contract);
  const registry = read(paths.contractRegistry);
  for (const route of [
    "/dsh/partner/orders/{orderId}/captain-handoff/exceptions",
    "/dsh/captain/dispatch/assignments/{assignmentId}/handoff-exceptions",
  ]) {
    assert.ok(routes.includes(route), `runtime route missing: ${route}`);
    assert.ok(contract.includes(route), `contract route missing: ${route}`);
  }
  assert.match(server, /handleConfirmPartnerStoreCaptainHandoff/);
  assert.match(server, /handleGovernedUpdateDeliveryStatus/);
  assert.match(main, /RegisterOrderJourneyRoutes/);
  assert.match(contract, /confirmPartnerStoreCaptainHandoff/);
  assert.match(contract, /reportPartnerStoreCaptainHandoffException/);
  assert.match(contract, /reportCaptainStoreCaptainHandoffException/);
  assert.match(contract, /x-bthwani-parent-operation/);
  assert.equal((contract.match(/^  \/dsh\//gm) ?? []).length, 3);
  assert.doesNotMatch(contract, /operationId: updateCaptainDeliveryStatusWithCustodyGuard/);
  assert.match(baseContract, /operationId: updateDshDeliveryStatus/);
  assert.match(registry, /dsh-store-captain-handoff/);
});

test("partner and captain readback is persistent and surfaces use shared commands", () => {
  const workboard = read(paths.workboard);
  const adapter = read(paths.partnerAdapter);
  const list = read(paths.partnerList);
  const partnerScreen = read(paths.partnerScreen);
  const captainApi = read(paths.captainApi);
  const controller = read(paths.controller);
  const captainScreen = read(paths.captainScreen);
  const partnerApi = read(paths.partnerApi);
  assert.match(workboard, /OpenStoreCaptainHandoffExceptionID/);
  assert.match(workboard, /PendingCustomerDecisionCount/);
  assert.match(workboard, /ResolvablePreparationIssueCount/);
  assert.match(adapter, /openStoreCaptainHandoffExceptionId/);
  assert.match(list, /استثناء عهدة قيد مراجعة العمليات/);
  assert.match(partnerScreen, /StoreCaptainHandoffExceptionForm/);
  assert.match(captainApi, /fetchCaptainDeliveryException/);
  assert.match(controller, /clearResolvedLocalState/);
  assert.match(captainScreen, /readbackBlocksPickup/);
  assert.match(partnerApi, /reportPartnerStoreCaptainHandoffException/);
  assert.match(captainApi, /reportCaptainHandoffException/);
  assert.doesNotMatch(partnerScreen, /fetch\s*\(|\/dsh\//);
  assert.doesNotMatch(captainScreen, /fetch\s*\(|\/dsh\//);
});

test("operator resolution and client tracking consume the same DSH truth", () => {
  const operator = read(paths.operatorScreen);
  const resolutions = read(paths.resolutionTests);
  const client = read(paths.clientController);
  assert.match(operator, /handoff_shortage/);
  assert.match(operator, /handoff_mismatch/);
  assert.match(operator, /resolveDeliveryExceptionReassignCaptain/);
  assert.match(resolutions, /TestHandoffExceptionRetrySameCaptainReleasesCustodyGuardDBIntegration/);
  assert.match(resolutions, /TestHandoffExceptionReassignmentSupersedesCustodyDBIntegration/);
  assert.match(resolutions, /ConfirmStoreCaptainHandoffIdempotent/);
  assert.match(resolutions, /DeliveryPickedUp/);
  assert.match(client, /fetchClientOrderTruthDetail/);
  assert.match(client, /fetchClientLiveTracking/);
  assert.match(client, /setInterval/);
  assert.match(client, /cannot override order truth/);
});

test("product truth closes code without claiming release approval", () => {
  const truth = JSON.parse(read(paths.productTruth));
  const manifest = JSON.parse(read(paths.sliceManifest));
  assert.equal(truth.journeyId, "JRN-013");
  assert.equal(truth.owner, "DSH");
  assert.equal(truth.truthOwnership.financialTruth, "WLT");
  assert.equal(truth.internalZeroGate, "AUTOMATED_CLOSURE_PASSED");
  assert.equal(truth.decision, "READY_FOR_INDEPENDENT_REVIEW");
  assert.equal(truth.evidenceState.productionRelease, "NOT_APPROVED");
  assert.equal(manifest.requiredSliceCount, 18);
  assert.equal(manifest.codeDecision, "CLOSED");
  assert.equal(manifest.releaseDecision, "READY_FOR_INDEPENDENT_REVIEW");
  assert.equal(manifest.slices.every((slice) => slice.codeStatus === "CLOSED"), true);
});

test("contextual CI covers contracts, tests, boundaries, database and backend", () => {
  const workflow = read(paths.workflow);
  assert.match(workflow, /pnpm run contracts:lint/);
  assert.match(workflow, /pnpm run affected:typecheck/);
  assert.match(workflow, /pnpm run affected:test/);
  assert.match(workflow, /pnpm run affected:lint/);
  assert.match(workflow, /name: Apply DSH migrations/);
  assert.match(workflow, /go test \.\/\.\. -count=1/);
  assert.match(workflow, /go build \.\/\.\./);
  assert.match(workflow, /Run detected journey gates/);
});
