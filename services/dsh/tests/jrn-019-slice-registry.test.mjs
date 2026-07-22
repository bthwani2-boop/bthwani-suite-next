import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repositoryRoot = new URL('../../../', import.meta.url);

async function repositorySource(repositoryPath) {
  return readFile(new URL(repositoryPath, repositoryRoot), 'utf8');
}

test('JRN-019 registers FS-01 through FS-18 in order', async () => {
  const closure = JSON.parse(
    await repositorySource('services/dsh/contracts/jrn-019-slice-closure.json'),
  );
  assert.equal(closure.journeyId, 'JRN-019');
  assert.equal(closure.requiredSliceCount, 18);
  assert.equal(closure.slices.length, 18);
  assert.deepEqual(
    closure.slices.map((slice) => slice.id),
    Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, '0')}`),
  );
  for (const slice of closure.slices) {
    assert.equal(slice.codeStatus, 'IMPLEMENTED', `${slice.id} is not implemented`);
    assert.ok(slice.requiredFiles.length > 0, `${slice.id} has no required files`);
    assert.ok(slice.requiredMarkers.length > 0, `${slice.id} has no required markers`);
  }
  assert.deepEqual(closure.independentReviewPending, [
    'product-owner',
    'qa-device-accessibility',
    'application-security',
    'financial-control',
    'release-production',
  ]);
});

test('JRN-019 product truth preserves DSH and WLT ownership boundaries', async () => {
  const productTruth = JSON.parse(
    await repositorySource('governance/product/contracts/jrn-019-cancellation-refund.product-truth.json'),
  );
  assert.equal(productTruth.journeyId, 'JRN-019');
  assert.equal(productTruth.status, 'PENDING_INDEPENDENT_APPROVAL');
  assert.equal(productTruth.truthOwner, 'services/dsh');
  assert.equal(productTruth.financialTruthOwner, 'services/wlt');
  assert.equal(productTruth.sharedBrainOwner, 'services/dsh/frontend/shared/orders');
  assert.ok(productTruth.requiredSurfaces.includes('app-client'));
  assert.ok(productTruth.requiredSurfaces.includes('app-partner'));
  assert.ok(productTruth.requiredSurfaces.includes('control-panel'));
  assert.ok(productTruth.supportingReadbackSurfaces.includes('app-captain'));
  assert.ok(productTruth.negativeInvariants.length >= 7);
  assert.ok(productTruth.acceptanceCriteria.length >= 7);
  assert.ok(productTruth.forbiddenActions.includes('surface_created_refund'));
  assert.ok(productTruth.forbiddenActions.includes('dsh_ledger_or_balance_mutation'));
});
