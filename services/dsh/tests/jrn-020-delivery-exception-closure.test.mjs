import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('JRN-020 return lifecycle has complete shared readback', async () => {
  const viewModel = await source('../frontend/shared/dispatch/dispatch.view-model.ts');

  for (const status of ['returning_to_store', 'return_arrived_store', 'returned_to_store']) {
    assert.match(viewModel, new RegExp(`assignment\\.delivery\\.status === "${status}"`));
    assert.match(viewModel, new RegExp(`"${status}"`));
  }
  assert.match(viewModel, /RETURN_SEQUENCE/);
  assert.match(viewModel, /أغلقت محاولة التوصيل بعد استلام المتجر/);
});

test('JRN-020 governed mutation boundary is active in runtime', async () => {
  const governance = await source('../backend/internal/http/delivery_exception_governance.go');
  const main = await source('../backend/cmd/dsh-api/main.go');

  assert.match(governance, /validateDeliveryExceptionReportNote/);
  assert.match(governance, /acknowledge the exception and assign operational responsibility before resolution/);
  assert.match(governance, /DeliveryExceptionGovernanceMiddleware/);
  assert.match(governance, /handleReportDeliveryExceptionGoverned/);
  assert.match(governance, /handleResolveDeliveryExceptionGoverned/);
  assert.match(main, /DeliveryExceptionGovernanceMiddleware/);
  assert.match(main, /deliveryExceptionGovernedRouter/);
  assert.match(main, /CorsMiddleware\(authMode, deliveryExceptionGovernedRouter\)/);
});

test('JRN-020 blocks late delivery and keeps financial mutation WLT-owned', async () => {
  const dispatch = await source('../backend/internal/dispatch/dispatch.go');
  const exceptions = await source('../backend/internal/dispatch/delivery_exceptions.go');
  const operatorSurface = await source('../frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx');

  assert.match(dispatch, /func SubmitPoD[\s\S]*ensureNoOpenDeliveryException\(tx, assignmentID\)/);
  assert.match(exceptions, /UPDATE dsh_assignments SET status='completed'/);
  assert.match(exceptions, /UPDATE dsh_orders SET status='returned_to_store'/);
  assert.match(exceptions, /return_accepted_by_actor_id/);
  assert.match(exceptions, /orders\.CancelOrder/);
  assert.match(exceptions, /delivery-exception-cancel:/);
  assert.match(operatorSurface, /cancelOrder\('operator'/);
  assert.match(operatorSurface, /لن ينشئ DSH استردادًا مباشرًا/);
  assert.match(operatorSurface, /ثم يقرر WLT تحرير الجلسة أو طلب الاسترداد/);
});
