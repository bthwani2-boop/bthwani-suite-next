import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const paths = {
  handoffMigration: 'services/dsh/database/migrations/dsh-095_store_captain_outbound_handoff.sql',
  reassignmentMigration: 'services/dsh/database/migrations/dsh-096_store_captain_handoff_reassignment.sql',
  exceptionMigration: 'services/dsh/database/migrations/dsh-097_store_captain_handoff_exceptions.sql',
  handoffDomain: 'services/dsh/backend/internal/dispatch/store_captain_handoff.go',
  idempotencyDomain: 'services/dsh/backend/internal/dispatch/store_captain_handoff_idempotency.go',
  exceptionDomain: 'services/dsh/backend/internal/dispatch/store_captain_handoff_exceptions.go',
  exceptionTests: 'services/dsh/backend/internal/dispatch/store_captain_handoff_exceptions_db_test.go',
  resolutionTests: 'services/dsh/backend/internal/dispatch/store_captain_handoff_resolution_db_test.go',
  routes: 'services/dsh/backend/internal/http/order_journey_routes.go',
  server: 'services/dsh/backend/internal/http/server.go',
  main: 'services/dsh/backend/cmd/dsh-api/main.go',
  workboard: 'services/dsh/backend/internal/http/partner_order_workboard.go',
  baseContract: 'services/dsh/contracts/dsh.openapi.yaml',
  contract: 'services/dsh/contracts/dsh.store-captain-handoff.openapi.yaml',
  contractRegistry: 'services/dsh/contracts/contract-registry.ts',
  sliceManifest: 'services/dsh/contracts/jrn-013-slice-closure.json',
  partnerApi: 'services/dsh/frontend/shared/orders/orders.api.ts',
  captainApi: 'services/dsh/frontend/shared/dispatch/dispatch.api.ts',
  controller: 'services/dsh/frontend/shared/dispatch/use-store-captain-handoff-exception.ts',
  partnerAdapter: 'services/dsh/frontend/shared/partner/partner.adapters.ts',
  partnerScreen: 'services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx',
  partnerList: 'services/dsh/frontend/app-partner/orders/GovernedPartnerOrdersScreen.tsx',
  captainScreen: 'services/dsh/frontend/app-captain/orders/OperationalCaptainExecutionScreen.tsx',
  operatorScreen: 'services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx',
  clientController: 'services/dsh/frontend/shared/orders/use-client-order-journey-controller.ts',
  productTruth: 'governance/product/contracts/jrn-013-store-captain-handoff.product-truth.json',
  workflow: '.github/workflows/store-captain-handoff-verification.yml',
};

test('custody database truth has dual confirmation, reassignment, and reporter audit', () => {
  const handoff = read(paths.handoffMigration);
  assert.match(handoff, /awaiting_partner/);
  assert.match(handoff, /partner_confirmed/);
  assert.match(handoff, /completed/);
  assert.match(handoff, /superseded/);
  assert.match(handoff, /partner_confirmed_by_actor_id/);
  assert.match(handoff, /captain_confirmed_by_actor_id/);
  assert.match(handoff, /version\s+INTEGER\s+NOT NULL DEFAULT 1/);

  const reassignment = read(paths.reassignmentMigration);
  assert.match(reassignment, /AFTER INSERT ON dsh_assignments/);
  assert.match(reassignment, /status = 'superseded'/);

  const exception = read(paths.exceptionMigration);
  assert.match(exception, /handoff_shortage/);
  assert.match(exception, /handoff_mismatch/);
  assert.match(exception, /dsh_delivery_exception_reporters/);
  assert.match(exception, /actor_role IN \('captain', 'partner'\)/);
});

test('backend enforces idempotency, exact payload replay, and pickup blocking', () => {
  const handoff = read(paths.handoffDomain);
  const idempotency = read(paths.idempotencyDomain);
  const exception = read(paths.exceptionDomain);
  const exceptionTests = read(paths.exceptionTests);

  assert.match(handoff, /ErrStoreHandoffRequired/);
  assert.match(handoff, /ensureStoreCaptainHandoff/);
  assert.match(handoff, /requireStoreCaptainHandoffConfirmed/);
  assert.match(handoff, /completeStoreCaptainHandoff/);
  assert.match(handoff, /DeliveryArrivedStore/);
  assert.match(handoff, /partner_confirmed/);
  assert.match(handoff, /completed/);

  assert.match(idempotency, /UpdateDeliveryStatusGovernedIdempotent/);
  assert.match(idempotency, /ConfirmStoreCaptainHandoffIdempotent/);
  assert.match(idempotency, /ensureNoActiveStoreCaptainHandoffException/);
  assert.match(idempotency, /status IN \('open', 'acknowledged'\)/);

  assert.match(exception, /ReportPartnerStoreCaptainHandoffException/);
  assert.match(exception, /ReportCaptainStoreCaptainHandoffException/);
  assert.match(exception, /findPartnerHandoffExceptionReplay/);
  assert.match(exception, /findCaptainHandoffExceptionReplay/);
  assert.match(exception, /validateHandoffExceptionPayload/);
  assert.match(exception, /sameOptionalFloat64/);
  assert.match(exception, /correlationId already belongs to a different exception command payload/);
  assert.match(exception, /severity/);
  assert.match(exception, /'high'/);
  assert.match(exceptionTests, /partner payload drift error/);
  assert.match(exceptionTests, /captain payload drift error/);
});

test('runtime routes and OpenAPI contracts have single operation ownership', () => {
  const routes = read(paths.routes);
  const server = read(paths.server);
  const main = read(paths.main);
  const baseContract = read(paths.baseContract);
  const contract = read(paths.contract);
  const registry = read(paths.contractRegistry);

  for (const route of [
    '/dsh/partner/orders/{orderId}/captain-handoff/exceptions',
    '/dsh/captain/dispatch/assignments/{assignmentId}/handoff-exceptions',
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
  assert.match(baseContract, /\/dsh\/captain\/dispatch\/assignments\/\{assignmentId\}\/status:/);
  assert.match(baseContract, /operationId: updateDshDeliveryStatus/);
  assert.match(contract, /handoff_shortage/);
  assert.match(contract, /handoff_mismatch/);
  assert.match(contract, /bearerAuth/);
  assert.match(registry, /dsh-store-captain-handoff/);
  assert.match(registry, /dsh\.store-captain-handoff\.openapi\.yaml/);
});

test('partner readback survives refresh, releases resolved state, and preserves decision governance', () => {
  const workboard = read(paths.workboard);
  const adapter = read(paths.partnerAdapter);
  const list = read(paths.partnerList);
  const screen = read(paths.partnerScreen);

  assert.match(workboard, /OpenStoreCaptainHandoffExceptionID/);
  assert.match(workboard, /hasOpenStoreCaptainHandoffException/);
  assert.match(workboard, /PendingCustomerDecisionCount/);
  assert.match(workboard, /ResolvablePreparationIssueCount/);
  assert.match(workboard, /reason_code IN \('handoff_shortage', 'handoff_mismatch'\)/);

  assert.match(adapter, /pending customer decision count is inconsistent/);
  assert.match(adapter, /resolvable preparation issue count is inconsistent/);
  assert.match(adapter, /exposes handoff while custody exception is active/);
  assert.match(adapter, /openStoreCaptainHandoffExceptionId/);

  assert.match(list, /استثناء عهدة قيد مراجعة العمليات/);
  assert.match(list, /handoffExceptionAvailable/);
  assert.match(screen, /openStoreCaptainHandoffExceptionId === ''/);
  assert.match(screen, /observedServerHandoffExceptionOrderId/);
  assert.match(screen, /if \(item\.allowedActions\.includes\(actionId\)\)/);
  assert.match(screen, /StoreCaptainHandoffExceptionForm/);
  assert.doesNotMatch(screen, /actionId === 'resolve_issue'.*openPreparationIssueCount/s);
  assert.doesNotMatch(screen, /fetch\s*\(|\/dsh\//);
});

test('captain readback is persistent, fail-closed, and releases after resolution', () => {
  const captainApi = read(paths.captainApi);
  const controller = read(paths.controller);
  const screen = read(paths.captainScreen);

  assert.match(captainApi, /fetchCaptainDeliveryException/);
  assert.match(controller, /fetchCaptainDeliveryException/);
  assert.match(controller, /backend pickup guard blocks on every open\/acknowledged delivery/);
  assert.match(controller, /setReadback\(\{ kind: "blocked"/);
  assert.match(controller, /clearResolvedLocalState/);
  assert.match(controller, /current\.kind === "success" && current\.entityId === entityId/);
  assert.match(screen, /setInterval/);
  assert.match(screen, /readbackBlocksPickup/);
  assert.match(screen, /handoffReadback\.kind !== 'clear'/);
  assert.match(screen, /الاستلام محجوب بقرار تشغيلي/);
  assert.match(screen, /تعذر التحقق من الاستثناء التشغيلي/);
  assert.doesNotMatch(screen, /fetch\s*\(|\/dsh\//);
});

test('partner and captain surfaces consume only shared custody commands', () => {
  const partnerApi = read(paths.partnerApi);
  const captainApi = read(paths.captainApi);
  const controller = read(paths.controller);
  const partnerScreen = read(paths.partnerScreen);
  const captainScreen = read(paths.captainScreen);

  assert.match(partnerApi, /reportPartnerStoreCaptainHandoffException/);
  assert.match(captainApi, /reportCaptainHandoffException/);
  assert.match(controller, /useStoreCaptainHandoffException/);
  assert.match(controller, /await refresh\(\)/);
  assert.match(partnerScreen, /useStoreCaptainHandoffException\('partner'/);
  assert.match(captainScreen, /useStoreCaptainHandoffException\('captain'/);
  assert.match(captainScreen, /handoffExceptionEnabled/);
});

test('operator resolutions execute and client consumes the same DSH lifecycle truth', () => {
  const operator = read(paths.operatorScreen);
  const resolutions = read(paths.resolutionTests);
  const client = read(paths.clientController);

  assert.match(operator, /handoff_shortage/);
  assert.match(operator, /handoff_mismatch/);
  assert.match(operator, /استثناءات عهدة/);
  assert.match(operator, /السماح باستكمال العهدة/);
  assert.match(operator, /resolveDeliveryExceptionReassignCaptain/);
  assert.match(resolutions, /TestHandoffExceptionRetrySameCaptainReleasesCustodyGuardDBIntegration/);
  assert.match(resolutions, /TestHandoffExceptionReassignmentSupersedesCustodyDBIntegration/);
  assert.match(resolutions, /ConfirmStoreCaptainHandoffIdempotent/);
  assert.match(resolutions, /DeliveryPickedUp/);
  assert.match(resolutions, /oldHandoffStatus != "superseded"/);

  assert.match(client, /fetchClientOrderTruthDetail/);
  assert.match(client, /fetchClientOrderTracking/);
  assert.match(client, /setInterval/);
  assert.match(client, /cannot override order truth/);
});

test('product truth and slice manifest close code without claiming release approval', () => {
  const truth = JSON.parse(read(paths.productTruth));
  const manifest = JSON.parse(read(paths.sliceManifest));

  assert.equal(truth.journeyId, 'JRN-013');
  assert.equal(truth.owner, 'DSH');
  assert.equal(truth.truthOwnership.financialTruth, 'WLT');
  assert.equal(truth.internalZeroGate, 'SOURCE_CODE_CLOSED');
  assert.equal(truth.decision, 'READY_FOR_REVIEW');
  assert.equal(truth.evidenceState.ciExecution, 'NOT_OBSERVED_FROM_CONNECTOR');
  assert.equal(truth.evidenceState.productionRelease, 'NOT_APPROVED');
  assert.ok(truth.negativeInvariants.includes('لا pickup قبل اكتمال العهدة الثنائية.'));
  assert.ok(truth.negativeInvariants.includes('لا يبقى pickup محجوبًا محليًا بعد أن يثبت DSH حل الاستثناء.'));

  assert.equal(manifest.requiredSliceCount, 18);
  assert.equal(manifest.codeDecision, 'CLOSED');
  assert.equal(manifest.releaseDecision, 'READY_FOR_INDEPENDENT_REVIEW');
  assert.equal(manifest.slices.every((slice) => slice.codeStatus === 'CLOSED'), true);
});

test('verification workflow covers source, type, boundaries, database, and backend', () => {
  const workflow = read(paths.workflow);
  assert.match(workflow, /store-captain-handoff-closure\.test\.mjs/);
  assert.match(workflow, /jrn-013-slice-closure\.test\.mjs/);
  assert.match(workflow, /contracts:lint/);
  assert.match(workflow, /Typecheck DSH shared brain and surfaces/);
  assert.match(workflow, /guard:ui-kit-boundary/);
  assert.match(workflow, /guard:fullstack-boundary/);
  assert.match(workflow, /Apply DSH migrations from a clean database/);
  assert.match(workflow, /TestHandoffExceptionRetrySameCaptainReleasesCustodyGuardDBIntegration/);
  assert.match(workflow, /TestHandoffExceptionReassignmentSupersedesCustodyDBIntegration/);
  assert.match(workflow, /Prove custody, replay, reassignment, exception, and operator resolution invariants/);
});
