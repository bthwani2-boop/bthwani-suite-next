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
  routes: 'services/dsh/backend/internal/http/order_journey_routes.go',
  contract: 'services/dsh/contracts/dsh.store-captain-handoff.openapi.yaml',
  contractRegistry: 'services/dsh/contracts/contract-registry.ts',
  partnerApi: 'services/dsh/frontend/shared/orders/orders.api.ts',
  captainApi: 'services/dsh/frontend/shared/dispatch/dispatch.api.ts',
  controller: 'services/dsh/frontend/shared/dispatch/use-store-captain-handoff-exception.ts',
  partnerScreen: 'services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx',
  captainScreen: 'services/dsh/frontend/app-captain/orders/OperationalCaptainExecutionScreen.tsx',
  productTruth: 'governance/product/contracts/jrn-013-store-captain-handoff.product-truth.json',
};

test('custody database truth has dual confirmation, reassignment, and reporter audit', () => {
  const handoff = read(paths.handoffMigration);
  assert.match(handoff, /awaiting_partner/);
  assert.match(handoff, /partner_confirmed/);
  assert.match(handoff, /completed/);
  assert.match(handoff, /superseded/);
  assert.match(handoff, /partner_confirmed_by_actor_id/);
  assert.match(handoff, /captain_confirmed_by_actor_id/);
  assert.match(handoff, /version INTEGER NOT NULL DEFAULT 1/);

  const reassignment = read(paths.reassignmentMigration);
  assert.match(reassignment, /AFTER INSERT ON dsh_assignments/);
  assert.match(reassignment, /status = 'superseded'/);

  const exception = read(paths.exceptionMigration);
  assert.match(exception, /handoff_shortage/);
  assert.match(exception, /handoff_mismatch/);
  assert.match(exception, /dsh_delivery_exception_reporters/);
  assert.match(exception, /actor_role IN \('captain', 'partner'\)/);
});

test('backend enforces idempotency, early-pickup prevention, and exception blocking', () => {
  const handoff = read(paths.handoffDomain);
  const idempotency = read(paths.idempotencyDomain);
  const exception = read(paths.exceptionDomain);

  assert.match(handoff, /ErrStoreHandoffRequired/);
  assert.match(handoff, /DeliveryArrivedStore/);
  assert.match(handoff, /partner_confirmed/);
  assert.match(handoff, /completed/);

  assert.match(idempotency, /UpdateDeliveryStatusGovernedIdempotent/);
  assert.match(idempotency, /ConfirmStoreCaptainHandoffIdempotent/);
  assert.match(idempotency, /ensureNoActiveStoreCaptainHandoffException/);
  assert.match(idempotency, /status IN \('open', 'acknowledged'\)/);

  assert.match(exception, /ReportPartnerStoreCaptainHandoffException/);
  assert.match(exception, /ReportCaptainStoreCaptainHandoffException/);
  assert.match(exception, /correlationId already belongs to a different exception command/);
  assert.match(exception, /severity/);
  assert.match(exception, /'high'/);
});

test('runtime routes and OpenAPI contract remain aligned', () => {
  const routes = read(paths.routes);
  const contract = read(paths.contract);
  const registry = read(paths.contractRegistry);

  for (const route of [
    '/dsh/partner/orders/{orderId}/captain-handoff/exceptions',
    '/dsh/captain/dispatch/assignments/{assignmentId}/handoff-exceptions',
  ]) {
    assert.ok(routes.includes(route), `runtime route missing: ${route}`);
    assert.ok(contract.includes(route), `contract route missing: ${route}`);
  }

  assert.match(contract, /confirmPartnerStoreCaptainHandoff/);
  assert.match(contract, /updateCaptainDeliveryStatusWithCustodyGuard/);
  assert.match(contract, /handoff_shortage/);
  assert.match(contract, /handoff_mismatch/);
  assert.match(registry, /dsh-store-captain-handoff/);
  assert.match(registry, /dsh\.store-captain-handoff\.openapi\.yaml/);
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

  assert.match(partnerScreen, /StoreCaptainHandoffExceptionForm/);
  assert.match(partnerScreen, /useStoreCaptainHandoffException\('partner'/);
  assert.match(captainScreen, /StoreCaptainHandoffExceptionForm/);
  assert.match(captainScreen, /useStoreCaptainHandoffException\('captain'/);
  assert.match(captainScreen, /handoffExceptionEnabled/);

  assert.doesNotMatch(partnerScreen, /fetch\s*\(|\/dsh\//);
  assert.doesNotMatch(captainScreen, /fetch\s*\(|\/dsh\//);
});

test('product truth preserves DSH custody and WLT financial ownership', () => {
  const truth = JSON.parse(read(paths.productTruth));
  assert.equal(truth.journeyId, 'JRN-013');
  assert.equal(truth.owner, 'DSH');
  assert.equal(truth.truthOwnership.financialTruth, 'WLT');
  assert.ok(truth.negativeInvariants.includes('لا pickup قبل اكتمال العهدة الثنائية.'));
  assert.equal(truth.decision, 'NEEDS_EVIDENCE');
});
