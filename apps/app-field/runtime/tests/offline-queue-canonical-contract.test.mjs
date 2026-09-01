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
const api = readRepositoryFile(
  "services/dsh/frontend/shared/field-readiness/field-readiness.api.ts",
);
const identity = readRepositoryFile(
  "services/dsh/frontend/shared/field-readiness/field-intent-identity.ts",
);
const barrel = readRepositoryFile(
  "services/dsh/frontend/shared/field-readiness/index.ts",
);
const sync = readRepositoryFile(
  "services/dsh/frontend/shared/field-readiness/use-field-offline-sync.ts",
);
const runtime = readRepositoryFile("apps/app-field/runtime/src/index.ts");

test("field offline queue has one v4 authority with a one-way v3 migration", () => {
  assert.match(source, /const STORAGE_PREFIX = "bthwani\.field-offline-queue\.v4"/);
  assert.match(source, /const V3_STORAGE_PREFIX = "bthwani\.field-offline-queue\.v3"/);
  assert.match(source, /const V3_CUTOVER_MARKER_SUFFIX = "v3-cutover-complete"/);
  assert.match(source, /cutoverMarker/);
  assert.match(source, /migrateV3Artifacts/);
  assert.match(source, /buildFieldIntentFingerprint\(operation\.operationType, operation\.payload\)/);
  assert.match(source, /await storageAdapter\.removeItem\(v3StorageKey\(scope\)\)/);
  assert.match(source, /encodeStorageSegment/);
  assert.doesNotMatch(source, /function stableHash/);
});

test("logout detaches field scope but cannot destroy unresolved operational work", () => {
  assert.match(source, /export function detachFieldOfflineQueueScope/);
  assert.match(source, /export async function discardFieldOfflineRecoveryState/);
  assert.doesNotMatch(barrel, /clearFieldOfflineQueue/);
  assert.doesNotMatch(runtime, /clearFieldOfflineQueue|discardFieldOfflineRecoveryState/);
  assert.match(runtime, /detachFieldOfflineQueueScope\(\)/);
});

test("field mutation transport ids are separate from canonical business intent", () => {
  assert.match(api, /intentFingerprint/);
  assert.match(identity, /secureRandomId\(\)/);
  assert.doesNotMatch(api, /function stableHash/);
  assert.match(identity, /idempotencyKey: `field-intent:v\$\{FIELD_INTENT_SCHEMA_VERSION\}:\$\{operationId\}`/);
  assert.match(identity, /correlationId: `field:\$\{operationType\}:corr:\$\{secureRandomId\(\)\}`/);
  assert.match(source, /field offline correlation id must be distinct from the idempotency key/);
});

test("persisted recovery is surfaced after restart rather than counted only in-memory", () => {
  assert.match(source, /recovery-quarantine/);
  assert.match(source, /readFieldOfflineRecovery/);
  assert.match(sync, /setQuarantinedCount\(\(await readFieldOfflineRecovery\(\)\)\.length\)/);
  assert.doesNotMatch(sync, /setQuarantinedCount\(\(current\) => current \+ evacuated\)/);
});
