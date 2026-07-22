import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('JRN-019 owns canonical actor routes and compatibility normalization', async () => {
  const routes = await source('../backend/internal/http/order_cancellations.go');

  for (const path of [
    '/dsh/client/orders/{orderId}/cancel',
    '/dsh/client/orders/{orderId}/cancellation',
    '/dsh/partner/orders/{orderId}/cancel',
    '/dsh/partner/orders/{orderId}/cancellation',
    '/dsh/operator/orders/{orderId}/cancellation',
  ]) {
    assert.match(routes, new RegExp(path.replaceAll(/[{}]/g, '\\$&')));
  }
  assert.match(routes, /body\.ReasonCode = "other"/);
  assert.match(routes, /body\.ReasonNote = body\.Reason/);
  assert.doesNotMatch(routes, /operator_cancelled/);
});

test('JRN-019 cancellation policy has governed role and terminal-state mapping', async () => {
  const runtime = await source('../backend/internal/orders/runtime.go');

  assert.match(runtime, /case "client":[\s\S]*StatusCancelledByClient/);
  assert.match(runtime, /case "partner":[\s\S]*StatusCancelledByStore/);
  assert.match(runtime, /case "no_driver":[\s\S]*StatusCancelledNoDriver/);
  assert.match(runtime, /case "payment_issue":[\s\S]*StatusFailedPayment/);
  assert.match(runtime, /case "operational_failure":[\s\S]*StatusFailedDispatch/);
  assert.match(runtime, /ErrCancellationRequiresReview/);
  assert.match(runtime, /maxCancellationReasonNoteLength = 1000/);
});

test('JRN-019 durable DSH to WLT handoff preserves command identity', async () => {
  const outbox = await source('../backend/internal/checkoutfinanceoutbox/checkoutfinanceoutbox.go');
  const worker = await source('../backend/internal/checkoutfinanceoutbox/worker.go');
  const client = await source('../backend/internal/wlt/cancel_for_order.go');

  assert.match(outbox, /CorrelationID\s+string/);
  assert.match(outbox, /reason, correlation_id/);
  assert.match(outbox, /COALESCE\(correlation_id, checkout_intent_id::text\)/);
  assert.match(worker, /CorrelationID: event\.CorrelationID/);
  assert.match(client, /X-Service-Caller/);
  assert.match(client, /setRequiredMutationHeaders/);
  assert.match(client, /missing refund id/);
  assert.match(client, /requested payment session/);
});

test('JRN-019 projects only WLT references and releases dependent work', async () => {
  const projection = await source('../backend/internal/checkoutfinanceoutbox/projection.go');
  const migration = await source('../database/migrations/dsh-091_pickup_cancellation_state.sql');

  assert.match(projection, /case "none":[\s\S]*reference = result\.PaymentSessionID/);
  assert.doesNotMatch(projection, /reference = result\.SessionStatus/);
  assert.match(projection, /missing its WLT reference/);
  for (const table of [
    'dsh_assignments',
    'dsh_deliveries',
    'dsh_partner_delivery_tasks',
    'dsh_pickup_sessions',
  ]) {
    assert.match(migration, new RegExp(`UPDATE ${table}`));
  }
});

test('JRN-019 readback is shared across client, partner, and operations', async () => {
  const clientSurface = await source('../frontend/app-client/orders/OrderTrackingScreen.tsx');
  const partnerSurface = await source('../frontend/app-partner/orders/OperationalOrderDecisionScreen.tsx');
  const operatorSurface = await source('../frontend/control-panel/operations/OrderJourneyOperatorIntervention.tsx');
  const controller = await source('../frontend/shared/orders/use-order-cancellation-controller.tsx');

  assert.match(clientSurface, /useOrderCancellationController/);
  assert.match(clientSurface, /FINANCIAL_CLOSURE_LABELS/);
  assert.match(partnerSurface, /useOrderCancellationController/);
  assert.match(operatorSurface, /FINANCIAL_CLOSURE_LABELS/);
  assert.match(operatorSurface, /<TextField/);
  assert.doesNotMatch(operatorSurface, /<textarea/);
  assert.match(controller, /financialClosureStatus === "pending"/);
  assert.match(controller, /setInterval/);
});
