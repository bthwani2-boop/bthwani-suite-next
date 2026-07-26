/**
 * Field Offline Queue
 *
 * Durable, account-scoped queue for authenticated field operations during
 * network loss. Mobile runtimes must configure an encrypted storage adapter.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type FieldOfflineOperationType =
  | "create_visit"
  | "complete_visit"
  | "upsert_readiness_check"
  | "create_escalation";

export type FieldOfflineOperationStatus =
  | "pending"
  | "retrying"
  | "synced"
  | "failed_permanent";

export type FieldOfflineQueueScope = {
  readonly tenantId: string;
  readonly actorId: string;
};

export type FieldOfflineQueueStorageAdapter = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
};

export type FieldOfflineOperation<P = unknown> = {
  readonly operationId: string;
  readonly operationType: FieldOfflineOperationType;
  readonly tenantId: string;
  readonly actorId: string;
  readonly payload: P;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAt: string;
  readonly attemptCount: number;
  readonly nextRetryAt: string;
  readonly status: FieldOfflineOperationStatus;
  readonly lastError?: string;
};

const LEGACY_STORAGE_KEY = "@bthwani/field-offline-queue:v1";
const LEGACY_CORRUPT_STORAGE_KEY = "@bthwani/field-offline-queue:corrupt:v1";
const STORAGE_PREFIX = "bthwani.field-offline-queue.v2";
const MAX_ATTEMPTS = 10;
const MAX_QUEUE_OPERATIONS = 100;
const MAX_SERIALIZED_CHARACTERS = 48_000;

let storageAdapter: FieldOfflineQueueStorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
let activeScope: FieldOfflineQueueScope | null = null;

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function normalizeScope(scope: FieldOfflineQueueScope): FieldOfflineQueueScope {
  return {
    tenantId: requireNonEmpty(scope.tenantId, "field offline queue tenant id"),
    actorId: requireNonEmpty(scope.actorId, "field offline queue actor id"),
  };
}

function requireScope(): FieldOfflineQueueScope {
  if (!activeScope) throw new Error("field offline queue scope is not configured");
  return activeScope;
}

function scopeFingerprint(scope: FieldOfflineQueueScope): string {
  return stableHash(`${scope.tenantId}|${scope.actorId}`);
}

function storageKey(scope: FieldOfflineQueueScope): string {
  return `${STORAGE_PREFIX}.${scopeFingerprint(scope)}`;
}

function corruptStorageKey(scope: FieldOfflineQueueScope): string {
  return `${STORAGE_PREFIX}.corrupt.${scopeFingerprint(scope)}`;
}

export function configureFieldOfflineQueueStorage(adapter: FieldOfflineQueueStorageAdapter): void {
  storageAdapter = adapter;
}

export function configureFieldOfflineQueueScope(scope: FieldOfflineQueueScope | null): void {
  activeScope = scope ? normalizeScope(scope) : null;
}

function isOperation(value: unknown, scope: FieldOfflineQueueScope): value is FieldOfflineOperation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FieldOfflineOperation>;
  return (
    typeof candidate.operationId === "string" &&
    typeof candidate.operationType === "string" &&
    typeof candidate.tenantId === "string" &&
    candidate.tenantId === scope.tenantId &&
    typeof candidate.actorId === "string" &&
    candidate.actorId === scope.actorId &&
    typeof candidate.idempotencyKey === "string" &&
    typeof candidate.correlationId === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.attemptCount === "number" &&
    typeof candidate.nextRetryAt === "string" &&
    typeof candidate.status === "string"
  );
}

async function removeLegacyQueue(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
    AsyncStorage.removeItem(LEGACY_CORRUPT_STORAGE_KEY),
  ]);
}

async function readQueue(): Promise<FieldOfflineOperation[]> {
  const scope = requireScope();
  const key = storageKey(scope);
  const raw = await storageAdapter.getItem(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((entry) => isOperation(entry, scope))) {
      throw new Error("stored queue does not match the scoped field offline operation schema");
    }
    return parsed;
  } catch (error) {
    await storageAdapter.setItem(corruptStorageKey(scope), raw);
    throw new Error(
      `field offline queue is corrupt and was preserved for recovery: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function writeQueue(queue: FieldOfflineOperation[]): Promise<void> {
  const scope = requireScope();
  if (queue.length > MAX_QUEUE_OPERATIONS) {
    throw new Error("field offline queue capacity exceeded");
  }
  const serialized = JSON.stringify(queue);
  if (serialized.length > MAX_SERIALIZED_CHARACTERS) {
    throw new Error("field offline queue encrypted storage limit exceeded");
  }
  await storageAdapter.setItem(storageKey(scope), serialized);
}

export async function prepareFieldOfflineQueue(): Promise<void> {
  requireScope();
  await removeLegacyQueue();
}

export async function clearFieldOfflineQueue(): Promise<void> {
  const scope = activeScope;
  await removeLegacyQueue();
  if (!scope) return;
  await Promise.all([
    storageAdapter.removeItem(storageKey(scope)),
    storageAdapter.removeItem(corruptStorageKey(scope)),
  ]);
}

export async function recoverCorruptFieldOfflineQueue(): Promise<void> {
  const scope = requireScope();
  const key = storageKey(scope);
  const raw = await storageAdapter.getItem(key);
  if (raw) await storageAdapter.setItem(corruptStorageKey(scope), raw);
  await storageAdapter.removeItem(key);
}

export async function enqueueFieldOperation<P>(
  operationType: FieldOfflineOperationType,
  payload: P,
  idempotencyKey: string,
  correlationId?: string,
): Promise<FieldOfflineOperation<P>> {
  const scope = requireScope();
  const normalizedKey = requireNonEmpty(idempotencyKey, "field offline operation idempotency key");
  const queue = await readQueue();
  const existing = queue.find(
    (operation) =>
      operation.tenantId === scope.tenantId &&
      operation.actorId === scope.actorId &&
      operation.idempotencyKey === normalizedKey,
  );
  if (existing) return existing as FieldOfflineOperation<P>;

  const fingerprint = stableHash(`${scope.tenantId}|${scope.actorId}|${operationType}|${normalizedKey}`);
  const now = new Date().toISOString();
  const operation: FieldOfflineOperation<P> = {
    operationId: `field-op:${operationType}:${fingerprint}`,
    operationType,
    tenantId: scope.tenantId,
    actorId: scope.actorId,
    payload,
    idempotencyKey: normalizedKey,
    correlationId: correlationId?.trim() || `field-correlation:${operationType}:${fingerprint}`,
    createdAt: now,
    attemptCount: 0,
    nextRetryAt: now,
    status: "pending",
  };

  await writeQueue([...queue, operation]);
  return operation;
}

export async function markOperationSynced(operationId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(
    queue.map((operation) =>
      operation.operationId === operationId ? { ...operation, status: "synced" as const } : operation,
    ),
  );
}

export async function markOperationFailed(operationId: string, error: string): Promise<void> {
  const queue = await readQueue();
  const updated = queue.map((operation) => {
    if (operation.operationId !== operationId) return operation;
    const nextCount = operation.attemptCount + 1;
    const permanent = nextCount >= MAX_ATTEMPTS;
    const backoffMs = Math.min(2 ** nextCount * 1000, 30 * 60 * 1000);
    return {
      ...operation,
      attemptCount: nextCount,
      lastError: error,
      nextRetryAt: new Date(Date.now() + backoffMs).toISOString(),
      status: permanent ? ("failed_permanent" as const) : ("retrying" as const),
    };
  });
  await writeQueue(updated);
}

export async function getDueOperations(): Promise<FieldOfflineOperation[]> {
  const queue = await readQueue();
  const now = new Date().toISOString();
  return queue.filter(
    (operation) =>
      (operation.status === "pending" || operation.status === "retrying") &&
      operation.nextRetryAt <= now,
  );
}

export async function getPendingCount(): Promise<number> {
  const queue = await readQueue();
  return queue.filter(
    (operation) => operation.status === "pending" || operation.status === "retrying",
  ).length;
}

export async function purgeSyncedOperations(): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((operation) => operation.status !== "synced"));
}

export async function getAllOperations(): Promise<FieldOfflineOperation[]> {
  return readQueue();
}
