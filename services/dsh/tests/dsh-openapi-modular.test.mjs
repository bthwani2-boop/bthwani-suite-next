import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  composeDshOpenApi,
  generatedBundlePath,
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
  assert.equal(manifest.pathCount, 263);
  assert.equal(manifest.operationIdCount, 310);
  assert.equal(manifest.componentCounts.schemas, 282);
});

test('generated bundle is deterministic and contains no modular path references', () => {
  const generated = read(generatedBundlePath);
  const recomposed = composeDshOpenApi({ write: false });

  assert.equal(generated, recomposed);
  assert.doesNotMatch(generated, /\.\/paths\/[^\s"']+\.paths\.yaml/);
  assert.doesNotMatch(generated, /\.\/components\/[^\s"']+\.yaml/);
  assert.match(generated, /operationId:\s*getDshHealth/);
  assert.match(generated, /operationId:\s*getDshPartnerOrderWorkboard/);
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
