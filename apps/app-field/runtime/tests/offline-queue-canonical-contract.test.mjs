import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const readRepositoryFile = (relativePath) => readFileSync(resolve(repositoryRoot, relativePath), "utf8");

const source = readRepositoryFile(
  "services/dsh/frontend/shared/field-readiness/field-offline-queue.ts",
);
const barrel = readRepositoryFile(
  "services/dsh/frontend/shared/field-readiness/index.ts",
);
const sync = readRepositoryFile(
  "services/dsh/frontend/shared/field-readiness/use-field-offline-sync.ts",
);

test("field offline queue exposes only canonical scoped storage and recovery", () => {
  assert.match(source, /const STORAGE_PREFIX = "bthwani\.field-offline-queue\.v3"/);
  assert.match(source, /recovery-quarantine/);
  assert.match(source, /readFieldOfflineRecovery/);
  assert.doesNotMatch(source, /LEGACY|legacyStorage|prepareFieldOfflineQueue|field-offline-queue:v1/);
  assert.doesNotMatch(barrel, /FieldOfflineLegacy|configureFieldOfflineLegacyStorage|prepareFieldOfflineQueue|readLegacyQuarantine/);
  assert.doesNotMatch(sync, /prepareFieldOfflineQueue|migration\.quarantined/);
});
