import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

test('JRN-013 handoff reasons remain aligned across primary contract and generated client', () => {
  const contract = read('services/dsh/contracts/dsh.openapi.yaml');
  const client = read('services/dsh/clients/generated/dsh-api.ts');
  const synchronizer = read('tools/contracts/sync-jrn-013-handoff-reasons.mjs');

  const schemaStart = contract.indexOf('    DshDeliveryExceptionReasonCode:');
  const schemaEnd = contract.indexOf('    DshDeliveryExceptionStatus:', schemaStart);
  assert.ok(schemaStart >= 0 && schemaEnd > schemaStart, 'primary reason schema is missing');
  const reasonSchema = contract.slice(schemaStart, schemaEnd);

  assert.match(reasonSchema, /        - handoff_shortage/);
  assert.match(reasonSchema, /        - handoff_mismatch/);
  assert.match(
    client,
    /DshDeliveryExceptionReasonCode: .*"handoff_shortage" \| "handoff_mismatch" \| "other";/,
  );
  assert.match(synchronizer, /--write/);
  assert.match(synchronizer, /contract artifacts and closure assertion are synchronized/);
});
