import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

function source(path) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8');
}

test('JRN-016 persists command replay and exception evidence truth', () => {
  const migration = source('services/dsh/database/migrations/dsh-116_partner_delivery_command_idempotency_and_exception_evidence.sql');
  const receipts = source('services/dsh/backend/internal/partnerdelivery/command_receipts.go');
  const exceptionCommands = source('services/dsh/backend/internal/partnerdelivery/exception_commands.go');

  for (const required of [
    'dsh_partner_delivery_command_receipts',
    'request_fingerprint',
    'exception_reason',
    'exception_evidence_references',
    'exception_reported_at',
  ]) {
    assert.match(migration, new RegExp(required), `missing durable JRN-016 truth: ${required}`);
  }
  assert.match(receipts, /pg_advisory_lock/);
  assert.match(receipts, /ErrIdempotencyConflict/);
  assert.match(receipts, /return Get\(s\.db, receipt\.TaskID\.String\)/);
  assert.match(exceptionCommands, /RaiseExceptionCommand/);
  assert.match(exceptionCommands, /WriteAuditEvent/);
  assert.match(exceptionCommands, /enqueueEvent/);
});

test('JRN-016 binds every JSON mutation to a stable command identity', () => {
  const handlers = source('services/dsh/backend/internal/http/partner_delivery.go');
  const commands = source('services/dsh/backend/internal/partnerdelivery/lifecycle_commands.go');
  const api = source('services/dsh/frontend/shared/partner-delivery/partner-delivery.api.ts');
  const types = source('services/dsh/frontend/shared/partner-delivery/partner-delivery.types.ts');
  const controller = source('services/dsh/frontend/shared/partner-delivery/use-partner-delivery-controller.tsx');

  for (const operation of [
    'AssignCourierCommand',
    'MarkPickedUpCommand',
    'MarkDepartedCommand',
    'MarkArrivedCommand',
    'SubmitProofCommand',
    'RaiseExceptionCommand',
  ]) {
    assert.match(handlers, new RegExp(operation), `HTTP route is not command-bound: ${operation}`);
  }
  assert.match(commands, /commandFingerprint/);
  assert.match(api, /suppliedCommandId/);
  assert.match(types, /IDEMPOTENCY_CONFLICT/);
  assert.match(controller, /commandIds = useRef/);
  assert.match(controller, /classified\.kind !== "network"/);
});

test('JRN-016 governs media proof and exception evidence contracts', () => {
  const deliveryContract = source('services/dsh/contracts/dsh.partner-delivery.openapi.yaml');
  const mediaContract = source('services/dsh/contracts/dsh.delivery-proof-media.openapi.yaml');
  const registry = source('services/dsh/contracts/contract-registry.ts');
  const mediaAdapter = source('services/dsh/frontend/shared/media/pod/delivery-proof-media.api.ts');

  assert.match(deliveryContract, /operationId: submitDshPartnerDeliveryProof/);
  assert.match(deliveryContract, /evidenceReferences:/);
  assert.match(deliveryContract, /commandId: \{ type: string, minLength: 1, maxLength: 160 \}/);
  assert.match(mediaContract, /name: X-Command-ID/);
  assert.match(mediaContract, /MANUAL_TYPED_ADAPTER/);
  assert.match(registry, /id: "dsh-partner-delivery"/);
  assert.match(registry, /id: "dsh-delivery-proof-media"/);
  assert.match(mediaAdapter, /'X-Command-ID'/);
});

test('JRN-016 binds partner, client and operator surfaces to the shared brain', () => {
  const partnerPanel = source('services/dsh/frontend/app-partner/orders/PartnerFulfillmentActionsPanel.tsx');
  const clientController = source('services/dsh/frontend/shared/orders/use-client-order-journey-controller.ts');
  const operatorScreen = source('services/dsh/frontend/control-panel/operations/PartnerDeliveryWorkbenchScreen.tsx');
  const operatorController = source('services/dsh/frontend/shared/partner-delivery/use-partner-delivery-controller.tsx');

  assert.match(partnerPanel, /usePartnerDeliveryActionsController/);
  assert.match(partnerPanel, /captureAndSubmitProof/);
  assert.match(clientController, /fetchClientPartnerDeliveryTask/);
  assert.match(clientController, /order\.fulfillmentMode === 'partner_delivery'/);
  assert.match(operatorScreen, /useOperatorPartnerDeliveriesController/);
  assert.match(operatorScreen, /تسجيل الاستثناء الموثق/);
  assert.match(operatorScreen, /exceptionEvidenceReferences/);
  assert.match(operatorController, /raiseException/);
});

test('JRN-016 preserves the partner fleet boundary', () => {
  const service = source('services/dsh/backend/internal/partnerdelivery/service.go');
  const productTruth = source('governance/product/contracts/jrn-016-partner-delivery.product-truth.json');
  const operatorScreen = source('services/dsh/frontend/control-panel/operations/PartnerDeliveryWorkbenchScreen.tsx');

  assert.match(service, /FROM dsh_assignments/);
  assert.match(service, /active bthwani-captain assignment/);
  assert.match(productTruth, /app-captain/);
  assert.match(productTruth, /must never enter BThwani captain dispatch/);
  assert.match(operatorScreen, /فصل أسطول الشريك عن أسطول بثواني/);
});

test('JRN-016 registers all eighteen slices', () => {
  const closure = JSON.parse(source('services/dsh/contracts/jrn-016-slice-closure.json'));
  assert.equal(closure.journeyId, 'JRN-016');
  assert.equal(closure.requiredSliceCount, 18);
  assert.equal(closure.slices.length, 18);
  assert.deepEqual(closure.slices.map((slice) => slice.id),
    Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, '0')}`));
});
