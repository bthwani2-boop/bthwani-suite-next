import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  composeContext,
  repositoryRoot,
} from "../../../tools/scripts/openapi-context-composer.mjs";

const contractsDirectory = path.join(repositoryRoot, "services/dsh/contracts");
const entryContractPath = path.join(contractsDirectory, "dsh.openapi.yaml");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

test("DSH sovereign OpenAPI entry remains modular and structurally valid", async () => {
  const entry = read(entryContractPath);
  const composed = await composeContext("dsh", { write: false });

  assert.match(entry, /x-bthwani-contract-layout:\s*MODULAR/);
  assert.match(entry, /x-bthwani-bundle:\s*\.\/generated\/dsh\.bundle\.openapi\.yaml/);
  assert.match(entry, /\$ref:\s*["']\.\/paths\//);
  assert.match(entry, /\$ref:\s*["']\.\/components\//);
  assert.ok(entry.split(/\r?\n/).length < 4000);
  assert.ok(composed.pathCount > 0);
  assert.ok(composed.operationIds.length > 0);
  assert.equal(new Set(composed.operationIds).size, composed.operationIds.length);
});

test("generated bundle composition is deterministic and contains no modular path references", async () => {
  const first = await composeContext("dsh", { write: false });
  const second = await composeContext("dsh", { write: false });

  assert.equal(first.bundle, second.bundle);
  assert.equal(first.sourceDigest, second.sourceDigest);
  assert.doesNotMatch(first.bundle, /\.\/paths\/[^\s"']+\.paths\.yaml/);
  assert.doesNotMatch(first.bundle, /\.\/components\/[^\s"']+\.yaml/);
  assert.match(first.bundle, /operationId:\s*getDshHealth/);
  assert.match(first.bundle, /operationId:\s*getDshPartnerOrderWorkboard/);
});

test("entry contract owns references while generated artifacts stay separated", () => {
  const entry = read(entryContractPath);

  assert.match(entry, /x-bthwani-contract-layout:\s*MODULAR/);
  assert.match(entry, /x-bthwani-bundle:\s*\.\/generated\/dsh\.bundle\.openapi\.yaml/);
  assert.match(entry, /\$ref:\s*["']\.\/paths\//);
  assert.match(entry, /\$ref:\s*["']\.\/components\//);
  assert.doesNotMatch(entry, /^\s{4}operationId:/m);

  assert.equal(
    fs.existsSync(path.join(contractsDirectory, "fragments/order-preparation-handoff.fragment.yaml")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(contractsDirectory, "fragments/pickup-recovery.fragment.yaml")),
    false,
  );
});
