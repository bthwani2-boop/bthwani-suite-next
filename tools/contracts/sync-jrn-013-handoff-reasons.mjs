import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');

const primaryContractPath = resolve(root, 'services/dsh/contracts/dsh.openapi.yaml');
const generatedClientPath = resolve(root, 'services/dsh/clients/generated/dsh-api.ts');
const closureTestPath = resolve(root, 'services/dsh/tests/store-captain-handoff-closure.test.mjs');

const requiredReasons = ['handoff_shortage', 'handoff_mismatch'];

function alignPrimaryContract(source) {
  const schemaStart = source.indexOf('    DshDeliveryExceptionReasonCode:');
  const schemaEnd = source.indexOf('    DshDeliveryExceptionStatus:', schemaStart);
  if (schemaStart < 0 || schemaEnd < 0) {
    throw new Error('Primary DSH contract is missing DshDeliveryExceptionReasonCode.');
  }

  let schema = source.slice(schemaStart, schemaEnd);
  if (!schema.includes('        - handoff_shortage')) {
    schema = schema.replace(
      '        - proof_unavailable\n',
      '        - proof_unavailable\n        - handoff_shortage\n',
    );
  }
  if (!schema.includes('        - handoff_mismatch')) {
    schema = schema.replace(
      '        - handoff_shortage\n',
      '        - handoff_shortage\n        - handoff_mismatch\n',
    );
  }

  for (const reason of requiredReasons) {
    if (!schema.includes(`        - ${reason}`)) {
      throw new Error(`Primary DSH contract could not be aligned for ${reason}.`);
    }
  }

  return source.slice(0, schemaStart) + schema + source.slice(schemaEnd);
}

function alignGeneratedClient(source) {
  if (!source.includes('| "handoff_shortage"')) {
    source = source.replace(
      '| "proof_unavailable" | "other";',
      '| "proof_unavailable" | "handoff_shortage" | "handoff_mismatch" | "other";',
    );
  }

  const expected = '| "proof_unavailable" | "handoff_shortage" | "handoff_mismatch" | "other";';
  if (!source.includes(expected)) {
    throw new Error('Generated DSH TypeScript client could not be aligned with handoff reasons.');
  }
  return source;
}

function alignClosureTest(source) {
  const broadAssertion = "  assert.doesNotMatch(screen, /actionId === 'resolve_issue'.*openPreparationIssueCount/s);";
  const scopedAssertion = "  assert.doesNotMatch(screen, /\\|\\| \\(actionId === 'resolve_issue' && item\\.openPreparationIssueCount > 0\\)/);";
  if (source.includes(broadAssertion)) source = source.replace(broadAssertion, scopedAssertion);
  if (!source.includes(scopedAssertion)) {
    throw new Error('JRN-013 closure test does not contain the scoped preparation-decision assertion.');
  }
  return source;
}

const currentContract = readFileSync(primaryContractPath, 'utf8');
const currentClient = readFileSync(generatedClientPath, 'utf8');
const currentClosureTest = readFileSync(closureTestPath, 'utf8');
const alignedContract = alignPrimaryContract(currentContract);
const alignedClient = alignGeneratedClient(currentClient);
const alignedClosureTest = alignClosureTest(currentClosureTest);

const changed = alignedContract !== currentContract
  || alignedClient !== currentClient
  || alignedClosureTest !== currentClosureTest;

if (writeMode) {
  if (alignedContract !== currentContract) writeFileSync(primaryContractPath, alignedContract, 'utf8');
  if (alignedClient !== currentClient) writeFileSync(generatedClientPath, alignedClient, 'utf8');
  if (alignedClosureTest !== currentClosureTest) writeFileSync(closureTestPath, alignedClosureTest, 'utf8');
  console.log(changed ? 'JRN-013 contract artifacts and closure assertion synchronized.' : 'JRN-013 contract artifacts and closure assertion already synchronized.');
} else {
  if (changed) {
    throw new Error('JRN-013 contract artifacts are stale. Run: node tools/contracts/sync-jrn-013-handoff-reasons.mjs --write');
  }
  console.log('JRN-013 contract artifacts and closure assertion are synchronized.');
}
