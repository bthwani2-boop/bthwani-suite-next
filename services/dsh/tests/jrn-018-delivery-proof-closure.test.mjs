import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

function requireMarkers(path, markers) {
  const content = read(path);
  for (const marker of markers) {
    assert.ok(content.includes(marker), `${path} is missing ${marker}`);
  }
}

test('JRN-018 registry and product truth are governed', () => {
  requireMarkers('governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md', [
    'JRN-018',
    'إثبات التسليم وإكمال الطلب',
    'التحقق برمز OTP أو PIN',
    'إرسال حدث إكمال دائم إلى WLT',
  ]);
  requireMarkers('governance/product/contracts/jrn-018-delivery-proof-order-completion.product-truth.json', [
    'WLT_DELIVERY_COMPLETION_HANDOFF_ONLY',
    'client_issue_or_refresh_delivery_pin',
    'captain_retry_rejected_proof',
    'system_enqueue_wlt_delivery_completed_once',
    'CLOSED_WITH_AUTOMATED_EVIDENCE',
    'independentReviewPending',
  ]);
});

test('JRN-018 closes every registered slice with automated evidence', () => {
  const closure = readJson('services/dsh/contracts/jrn-018-slice-closure.json');
  assert.equal(closure.journeyId, 'JRN-018');
  assert.equal(closure.requiredSliceCount, 18);
  assert.equal(closure.closedSliceCount, 18);
  assert.equal(closure.openSliceCount, 0);
  assert.equal(closure.slices.length, 18);
  assert.equal(closure.codeDecision, 'CLOSED_WITH_AUTOMATED_EVIDENCE');
  assert.ok(closure.slices.every((slice) => slice.codeStatus === 'CLOSED_WITH_AUTOMATED_EVIDENCE'));
  assert.equal(new Set(closure.slices.map((slice) => slice.id)).size, 18);
  assert.deepEqual(
    closure.slices.map((slice) => slice.id),
    Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, '0')}`),
  );
  assert.equal(closure.automatedEvidence.sameCommitRequired, true);
  assert.ok(Array.isArray(closure.independentReviewPending));
});

test('JRN-018 database owns PIN, proof, review, idempotency, and location evidence', () => {
  requireMarkers('services/dsh/database/migrations/dsh-117_jrn_018_delivery_proof_completion.sql', [
    'dsh_delivery_verification_challenges',
    'pin_hash',
    'dsh_delivery_proofs',
    'idempotency_key',
    'pending_review',
    'idx_dsh_delivery_proofs_one_accepted_assignment',
    'idx_dsh_wlt_outbox_delivery_completed_once',
  ]);
  requireMarkers('services/dsh/database/migrations/dsh-118_jrn_018_delivery_proof_location_snapshot.sql', [
    'dsh_snapshot_delivery_proof_location',
    'location_recorded_at',
    "INTERVAL '15 minutes'",
  ]);
  requireMarkers('services/dsh/database/migrations/dsh-119_jrn_018_delivery_pin_hardening.sql', [
    "pin_hash LIKE '$2%'",
    'idx_dsh_delivery_proofs_one_open_assignment',
    'legacy fast hashes',
  ]);
});

test('JRN-018 backend cannot complete through the legacy photo reference path', () => {
  const legacy = read('services/dsh/backend/internal/http/delivery_proof_upload.go');
  assert.ok(legacy.includes('s.handleSubmitGovernedDeliveryProof(w, r)'));
  assert.ok(!legacy.includes('dispatch.SubmitPoD('));
  requireMarkers('services/dsh/backend/internal/dispatch/delivery_proof.go', [
    'IssueDeliveryPIN',
    'SubmitDeliveryProof',
    'ReviewDeliveryProof',
    'verifyDeliveryPIN',
    'bcrypt.GenerateFromPassword',
    'errDeliveryPINMismatch',
    'ErrIdempotencyConflict',
    'ensureNoOpenDeliveryProof',
    'finalizeAcceptedDeliveryProof',
    'wltoutbox.EnqueueDeliveryCompleted',
  ]);
  requireMarkers('services/dsh/backend/internal/http/delivery_proof_completion.go', [
    'delivery_signature',
    'X-Idempotency-Key',
    'Idempotency-Key',
    'marshalClientDeliveryProof',
    'OperationsPermissionManage',
  ]);
});

test('JRN-018 contract and route registry match actor operations', () => {
  requireMarkers('services/dsh/contracts/dsh.delivery-proof-completion.openapi.yaml', [
    '/dsh/client/orders/{orderId}/delivery-pin:',
    '/dsh/client/orders/{orderId}/delivery-proof:',
    '/dsh/captain/dispatch/assignments/{assignmentId}/delivery-proof:',
    '/dsh/operator/delivery-proofs/{proofId}/accept:',
    '/dsh/operator/delivery-proofs/{proofId}/reject:',
    'otp_pin',
    'signature',
    'pending_review',
  ]);
  requireMarkers('services/dsh/contracts/contract-registry.ts', [
    'dsh-delivery-proof-completion',
    'contracts/dsh.delivery-proof-completion.openapi.yaml',
    'frontend/shared/delivery-proof',
  ]);
  requireMarkers('services/dsh/backend/internal/http/delivery_proof_routes.go', [
    'registerDeliveryProofRoutes',
    'handleIssueDeliveryPIN',
    'handleSubmitGovernedDeliveryProof',
    'handleAcceptOperatorDeliveryProof',
  ]);
  requireMarkers('services/dsh/backend/internal/http/catalog_unified_routes.go', [
    'registerDeliveryProofRoutes(mux, s)',
  ]);
});

test('JRN-018 shared brain and all required surfaces consume real DSH state', () => {
  requireMarkers('services/dsh/frontend/shared/delivery-proof/delivery-proof.api.ts', [
    'issueClientDeliveryPin',
    'submitCaptainDeliveryProof',
    'acceptOperatorDeliveryProof',
    'rejectOperatorDeliveryProof',
  ]);
  requireMarkers('services/dsh/frontend/shared/delivery-proof/use-delivery-proof-controller.ts', [
    'useClientDeliveryPinController',
    'useCaptainDeliveryProofController',
    'useOperatorDeliveryProofReviewController',
    'submitCaptured',
  ]);
  requireMarkers('services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx', [
    'رمز التسليم من العميل',
    'توقيع العميل',
    'pending_review',
    'رُفض إثبات التسليم',
  ]);
  requireMarkers('services/dsh/frontend/app-client/orders/ClientDeliveryProofPanel.tsx', [
    'إصدار رمز التسليم',
    'إثبات التسليم المقبول',
    'ملخصًا مخفي التفاصيل',
  ]);
  requireMarkers('services/dsh/frontend/control-panel/operations/DeliveryProofReviewScreen.tsx', [
    'قبول وإكمال الطلب',
    'رفض والسماح بمحاولة جديدة',
    'expectedVersion',
  ]);
  requireMarkers('services/dsh/frontend/control-panel/operations/OperationsHubScreen.tsx', [
    'proofs: DeliveryProofReviewScreen',
  ]);
});

test('JRN-018 does not introduce financial truth in DSH surfaces', () => {
  const files = [
    'services/dsh/frontend/shared/delivery-proof/delivery-proof.api.ts',
    'services/dsh/frontend/shared/delivery-proof/use-delivery-proof-controller.ts',
    'services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx',
    'services/dsh/frontend/app-client/orders/ClientDeliveryProofPanel.tsx',
    'services/dsh/frontend/control-panel/operations/DeliveryProofReviewScreen.tsx',
  ];
  for (const path of files) {
    const content = read(path);
    assert.ok(!/ledger|settlement|wallet balance|commission calculation/i.test(content), `${path} contains local financial truth`);
  }
});
