import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "services/dsh/frontend/shared/field-readiness/field-offline-queue.ts",
  "utf8",
);
const barrel = readFileSync(
  "services/dsh/frontend/shared/field-readiness/index.ts",
  "utf8",
);
const sync = readFileSync(
  "services/dsh/frontend/shared/field-readiness/use-field-offline-sync.ts",
  "utf8",
);

test("field offline queue exposes only canonical scoped storage and recovery", () => {
  assert.match(source, /const STORAGE_PREFIX = "bthwani\.field-offline-queue\.v3"/);
  assert.match(source, /recovery-quarantine/);
  assert.match(source, /readFieldOfflineRecovery/);
  assert.doesNotMatch(source, /LEGACY|legacyStorage|prepareFieldOfflineQueue|field-offline-queue:v1/);
  assert.doesNotMatch(barrel, /FieldOfflineLegacy|configureFieldOfflineLegacyStorage|prepareFieldOfflineQueue|readLegacyQuarantine/);
  assert.doesNotMatch(sync, /prepareFieldOfflineQueue|migration\.quarantined/);
});
