import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

function source(path) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8');
}

test('JRN-015 persists one durable pickup lifecycle and command truth', () => {
  const migration = source('services/dsh/database/migrations/dsh-094_jrn_015_pickup_mutation_commands.sql');

  for (const required of [
    'customer_notified_at',
    'customer_arrived_at',
    'no_show_at',
    'no_show_reason',
    'rescheduled_at',
    'dsh_pickup_mutation_commands',
    'expected_version',
    'dsh_project_pickup_lifecycle_audit',
    'dsh_prepare_pickup_no_show_shape',
  ]) {
    assert.match(migration, new RegExp(required), `missing durable pickup truth: ${required}`);
  }
});

test('JRN-015 composes the governed reschedule route and lifecycle projection', () => {
  const fragment = source('services/dsh/contracts/fragments/pickup-recovery.fragment.yaml');
  const composer = source('tools/scripts/compose-dsh-openapi.mjs');

  assert.match(fragment, /\/dsh\/operator\/pickups\/\{orderId\}\/reschedule:/);
  assert.match(fragment, /operationId: rescheduleDshPickupWindow/);
  assert.match(fragment, /DshReschedulePickupWindowRequest:/);
  assert.match(fragment, /customerNotifiedAt:/);
  assert.match(fragment, /customerArrivedAt:/);
  assert.match(fragment, /noShowReason:/);
  assert.match(fragment, /rescheduledAt:/);
  assert.match(composer, /pickup-recovery\.fragment\.yaml/);
  assert.match(composer, /DshPickupSession:/);
  assert.match(composer, /Pickup lifecycle properties are duplicated/);
});

test('JRN-015 guards every pickup mutation with command and version semantics', () => {
  const guard = source('services/dsh/backend/internal/http/pickup_mutation_guard.go');
  const main = source('services/dsh/backend/cmd/dsh-api/main.go');

  for (const action of [
    'mark_ready',
    'notify_customer',
    'customer_arrived',
    'verify_otp',
    'no_show',
    'extend_window',
    'reschedule',
  ]) {
    assert.match(guard, new RegExp(`"${action}"`), `unguarded pickup action: ${action}`);
  }
  assert.match(guard, /pg_advisory_lock/);
  assert.match(guard, /PICKUP_COMMAND_IN_PROGRESS/);
  assert.match(guard, /VERSION_CONFLICT/);
  assert.match(main, /PickupMutationPathContext/);
  assert.match(main, /PickupMutationGuard/);
  assert.match(main, /RegisterPickupRecoveryRoutes/);
});

test('JRN-015 binds client, partner and operator surfaces to the shared pickup brain', () => {
  const api = source('services/dsh/frontend/shared/pickup/pickup.api.ts');
  const controller = source('services/dsh/frontend/shared/pickup/use-pickup-controller.tsx');
  const clientSurface = source('services/dsh/frontend/app-client/DshClientSurface.tsx');
  const clientScreen = source('services/dsh/frontend/app-client/orders/PickupSessionScreen.tsx');
  const partnerPanel = source('services/dsh/frontend/app-partner/orders/PartnerFulfillmentActionsPanel.tsx');
  const operatorScreen = source('services/dsh/frontend/control-panel/operations/PickupWorkbenchScreen.tsx');

  assert.match(api, /reschedulePickupWindow/);
  assert.match(api, /pk-reschedule/);
  assert.match(controller, /rescheduleWindow/);
  assert.match(clientSurface, /PickupSessionScreen/);
  assert.match(clientSurface, /\/orders\/\(\[\^\/\]\+\)\/pickup/);
  assert.match(clientScreen, /useClientPickupSessionController/);
  assert.match(partnerPanel, /usePickupActionsController/);
  assert.match(partnerPanel, /customerArrived/);
  assert.match(partnerPanel, /noShow/);
  assert.match(operatorScreen, /currentStatus === 'no_show'/);
  assert.match(operatorScreen, /rescheduleWindow/);
  assert.match(operatorScreen, /إعادة جدولة ساعتين/);
});

test('JRN-015 never returns the plaintext OTP from a pickup HTTP response', () => {
  const pickupHandler = source('services/dsh/backend/internal/http/pickup.go');

  assert.doesNotMatch(pickupHandler, /"otp"\s*:\s*plainOtp/);
  assert.doesNotMatch(pickupHandler, /"code"\s*:\s*plainOtp/);
  assert.match(pickupHandler, /DeliverOtpNotification/);
});
