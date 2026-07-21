import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const wltDir = path.join(root, 'services/dsh/backend/internal/wlt');
const failures = [];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const goFiles = fs.readdirSync(wltDir)
  .filter((name) => name.endsWith('.go') && !name.endsWith('_test.go'))
  .map((name) => `services/dsh/backend/internal/wlt/${name}`);

const mutationPattern = /http\.Method(?:Post|Put|Patch|Delete)/;
const forbiddenReadMutation = /commercialRequest\([\s\S]{0,180}?http\.Method(?:Post|Put|Patch|Delete)/g;
const directHeaderPattern = /Header\.Set\(["']Idempotency-Key["']/;

for (const file of goFiles) {
  const source = read(file);
  if (forbiddenReadMutation.test(source)) {
    failures.push(`${file}: mutation routed through commercialRequest instead of commercialMutationRequest`);
  }
  forbiddenReadMutation.lastIndex = 0;
  if (directHeaderPattern.test(source) && !file.endsWith('mutation_headers.go')) {
    failures.push(`${file}: writes Idempotency-Key directly instead of setRequiredMutationHeaders`);
  }
  if (mutationPattern.test(source)) {
    const allowedDelegation = source.includes('commercialMutationRequest(')
      || source.includes('promotionFundingRequest(')
      || source.includes('actorFinanceRequest(')
      || source.includes('setRequiredMutationHeaders(');
    if (!allowedDelegation) {
      failures.push(`${file}: contains a financial mutation without governed mutation-header delegation`);
    }
  }
}

const helper = read('services/dsh/backend/internal/wlt/mutation_headers.go');
for (const required of [
  'X-Correlation-ID',
  'Idempotency-Key',
  'WLT mutation correlation id is required',
  'WLT mutation idempotency key is required',
]) {
  if (!helper.includes(required)) {
    failures.push(`mutation_headers.go: missing required invariant ${required}`);
  }
}

const requiredFiles = [
  'services/dsh/backend/internal/wlt/client.go',
  'services/dsh/backend/internal/wlt/actor_finance_client.go',
  'services/dsh/backend/internal/wlt/settlement_client.go',
  'services/dsh/backend/internal/wlt/subscription_purchase.go',
  'services/dsh/backend/internal/wlt/promotion_funding.go',
  'services/dsh/backend/internal/wlt/promotion_funding_outbox.go',
];
for (const file of requiredFiles) {
  if (!read(file).includes('setRequiredMutationHeaders(')) {
    failures.push(`${file}: does not call setRequiredMutationHeaders`);
  }
}

const tests = read('services/dsh/backend/internal/wlt/mutation_headers_test.go');
for (const invariant of [
  'TestRequiredMutationHeadersRejectMissingValues',
  'TestNotifyDeliveryCollectionAddsDeterministicHeaders',
  'TestActorFinanceMutationRejectsMissingCorrelation',
  'TestSettlementMutationAddsRequiredHeaders',
  'TestPromotionFundingRejectsMissingTenantBeforeNetwork',
]) {
  if (!tests.includes(invariant)) {
    failures.push(`mutation_headers_test.go: missing ${invariant}`);
  }
}

if (failures.length > 0) {
  console.error('DSH/WLT mutation idempotency gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`DSH/WLT mutation idempotency gate passed across ${goFiles.length} Go files.`);
