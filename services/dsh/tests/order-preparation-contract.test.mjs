import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const basePath = resolve(repositoryRoot, 'services/dsh/contracts/dsh.openapi.yaml');
const outputPath = resolve(repositoryRoot, 'services/dsh/contracts/generated/dsh.openapi.yaml');

function countOccurrences(content, needle) {
  return content.split(needle).length - 1;
}

test('DSH composed contract contains one governed partner workboard', () => {
  rmSync(outputPath, { force: true });
  const result = spawnSync(
    process.execPath,
    ['tools/scripts/compose-dsh-openapi.mjs'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const base = readFileSync(basePath, 'utf8');
  const composed = readFileSync(outputPath, 'utf8');
  assert.equal(base.includes('/dsh/partner/order-workboard:'), false);
  assert.equal(countOccurrences(composed, '/dsh/partner/order-workboard:'), 1);
  assert.equal(countOccurrences(composed, 'DshPartnerOrderAction:'), 1);
  assert.equal(countOccurrences(composed, 'DshPartnerOrderWorkboardOrder:'), 1);
  assert.equal(countOccurrences(composed, 'DshPartnerOrderWorkboardResponse:'), 1);
  assert.match(composed, /operationId: getDshPartnerOrderWorkboard/);
  assert.match(composed, /required: \[allowedActions\]/);
  assert.match(composed, /enum: \[accept, reject, prepare, ready, handoff\]/);
});
