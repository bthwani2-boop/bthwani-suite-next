import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  composeDshOpenApi,
  manifestPath,
  verifyDshOpenApiModular,
} from '../../../tools/scripts/dsh-openapi-modular-lib.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const contractsDirectory = path.join(repositoryRoot, 'services/dsh/contracts');
const entryContractPath = path.join(contractsDirectory, 'dsh.openapi.yaml');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

test('DSH sovereign OpenAPI entry remains modular and structurally valid', () => {
  const result = verifyDshOpenApiModular();
  const manifest = JSON.parse(read(manifestPath));

  assert.equal(result.pathCount, manifest.pathCount);
  assert.ok(result.componentSectionCount >= 3);
  assert.ok(result.rootLineCount < 4000);
});

test('generated bundle composition is deterministic and contains no modular path references', () => {
  const first = composeDshOpenApi({ write: false });
  const second = composeDshOpenApi({ write: false });

  assert.equal(first, second);
  assert.doesNotMatch(first, /\.\/paths\/[^\s"']+\.paths\.yaml/);
  assert.doesNotMatch(first, /\.\/components\/[^\s"']+\.yaml/);
  assert.match(first, /operationId:\s*getDshHealth/);
  assert.match(first, /operationId:\s*getDshPartnerOrderWorkboard/);
});

test('entry contract owns references while generated and migration artifacts stay separated', () => {
  const entry = read(entryContractPath);

  assert.match(entry, /x-bthwani-contract-layout:\s*MODULAR/);
  assert.match(entry, /x-bthwani-bundle:\s*\.\/generated\/dsh\.bundle\.openapi\.yaml/);
  assert.match(entry, /\$ref:\s*["']\.\/paths\//);
  assert.match(entry, /\$ref:\s*["']\.\/components\//);
  assert.doesNotMatch(entry, /^\s{4}operationId:/m);

  assert.equal(
    fs.existsSync(path.join(contractsDirectory, 'fragments/order-preparation-handoff.fragment.yaml')),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(contractsDirectory, 'fragments/pickup-recovery.fragment.yaml')),
    false,
  );
});
