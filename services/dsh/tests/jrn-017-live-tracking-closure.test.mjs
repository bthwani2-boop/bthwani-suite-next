import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

function source(path) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8');
}

test('JRN-017 governs trusted location freshness, accuracy and replay', () => {
  const integrity = source('services/dsh/backend/internal/http/dispatch_location_integrity.go');
  const tests = source('services/dsh/backend/internal/http/dispatch_location_integrity_test.go');
  const migration = source('services/dsh/database/migrations/dsh-039_dispatch_captain_location.sql');

  assert.match(integrity, /maxLocationAccuracyMeters\s*=\s*100\.0/);
  assert.match(integrity, /sameDispatchLocationSample/);
  assert.match(integrity, /LOCATION_SAMPLE_OUT_OF_ORDER/);
  assert.match(integrity, /LOCATION_SAMPLE_TOO_FREQUENT/);
  assert.match(tests, /expected exact replay to be idempotent/);
  assert.match(migration, /location_recorded_at/);
  assert.match(migration, /last_latitude/);
  assert.match(migration, /last_longitude/);
});

test('JRN-017 computes ETA through governed Providers without a fake fallback', () => {
  const provider = source('core/providers/backend/internal/providers/routes.go');
  const providerHttp = source('core/providers/backend/internal/http/server.go');
  const dshClient = source('services/dsh/backend/internal/mapproviders/route.go');
  const tracking = source('services/dsh/backend/internal/http/dispatch_live_tracking.go');

  assert.match(provider, /func \(s \*Service\) RouteMaps/);
  assert.match(provider, /unsupported route provider protocol/);
  assert.match(providerHttp, /POST \/providers\/maps\/route/);
  assert.match(dshClient, /\/providers\/maps\/route/);
  assert.match(tracking, /routeEta/);
  assert.match(tracking, /provider_unavailable/);
  assert.doesNotMatch(tracking, /fallbackEta|mockEta|hardcodedEta/i);
});

test('JRN-017 protects captain privacy across client and partner readback', () => {
  const tracking = source('services/dsh/backend/internal/http/dispatch_live_tracking.go');
  const trackingTests = source('services/dsh/backend/internal/http/dispatch_live_tracking_test.go');
  const partnerScreen = source('services/dsh/frontend/app-partner/orders/PartnerDispatchTrackingScreen.tsx');
  const clientCard = source('services/dsh/frontend/app-client/orders/ClientLiveTrackingCard.tsx');

  assert.match(tracking, /hidden_until_pickup/);
  assert.match(tracking, /delivery_window_rounded/);
  assert.match(tracking, /roundTrackingCoordinate/);
  assert.match(tracking, /clientCanSeeCaptainLocation/);
  assert.match(trackingTests, /TestClientCanSeeCaptainLocation/);
  assert.match(partnerScreen, /الإحداثيات محجوبة عن الشريك/);
  assert.match(clientCard, /تظهر إحداثيات تقريبية فقط أثناء نافذة التوصيل/);
});

test('JRN-017 binds captain, client, partner and operator surfaces to shared tracking', () => {
  const captain = source('services/dsh/frontend/app-captain/orders/OperationalCaptainExecutionScreen.tsx');
  const clientController = source('services/dsh/frontend/shared/orders/use-client-order-journey-controller.ts');
  const partnerController = source('services/dsh/frontend/shared/dispatch/use-partner-dispatch-tracking.ts');
  const operatorController = source('services/dsh/frontend/shared/dispatch/use-operator-dispatch-tracking-alerts.ts');
  const operatorDashboard = source('services/dsh/frontend/control-panel/dashboard/DshOperationalDashboardScreen.tsx');

  assert.match(captain, /readCaptainForegroundLocation/);
  assert.match(captain, /accuracyMeters/);
  assert.match(clientController, /fetchClientLiveTracking/);
  assert.match(clientController, /liveTracking/);
  assert.match(partnerController, /fetchPartnerDispatchTrackingReference/);
  assert.match(operatorController, /fetchOperatorDispatchTrackingAlerts/);
  assert.match(operatorDashboard, /DispatchTrackingAlertsPanel/);
});

test('JRN-017 retries only transport state and leaves operational truth in DSH', () => {
  const locationApi = source('services/dsh/frontend/shared/dispatch/dispatch-location.api.ts');
  const runtime = source('services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts');
  const productTruth = source('governance/product/contracts/jrn-017-captain-live-tracking.product-truth.json');

  assert.match(locationApi, /pendingLocationByAssignment/);
  assert.match(locationApi, /flushPendingForegroundDispatchLocations/);
  assert.match(locationApi, /This is not operational truth/);
  assert.match(runtime, /foreground-only periodic sampling/i);
  assert.match(productTruth, /WLT_REFERENCE_ONLY/);
  assert.match(productTruth, /لا mutation مالية/);
});

test('JRN-017 registers canonical contract and all eighteen slices', () => {
  const contract = source('services/dsh/contracts/dsh.live-tracking.openapi.yaml');
  const registry = source('services/dsh/contracts/contract-registry.ts');
  const closure = JSON.parse(source('services/dsh/contracts/jrn-017-slice-closure.json'));

  assert.match(contract, /operationId: pushTrustedCaptainDispatchLocation/);
  assert.match(contract, /operationId: getClientPrivacyAwareLiveTracking/);
  assert.match(contract, /operationId: getPartnerDispatchTrackingReference/);
  assert.match(contract, /operationId: listOperatorDispatchTrackingAlerts/);
  assert.match(registry, /id: "dsh-live-tracking"/);
  assert.equal(closure.journeyId, 'JRN-017');
  assert.equal(closure.requiredSliceCount, 18);
  assert.equal(closure.slices.length, 18);
  assert.deepEqual(
    closure.slices.map((slice) => slice.id),
    Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, '0')}`),
  );
});
