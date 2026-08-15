/**
 * Field Offline Queue
 *
 * Durable queue scoped to the authenticated platform-workforce actor and the
 * current app installation. Mobile runtimes must use encrypted storage.
 */

import { bthwaniKeyValueStorage as AsyncStorage } from "@bthwani/data-runtime/native-data-adapters";

export type FieldOfflineOperationType =
  | "create_visit"
  | "complete_visit"
  | "upsert_readiness_check"
  | "create_escalation";

export type FieldOfflineOperationStatus =
  | "pending"
  | "retrying"
  | "unknown"
  | "synced"
  | "failed_permanent";

export type FieldOfflineQueueScope = {
  readonly actorId: string;
  readonly installationId: string;
};

export type FieldOfflineQueueStorageAdapter = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
};

export type FieldOfflineLegacyStorageAdapter = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly removeItem: (key: string) => Promise<void>;
};

export type FieldOfflineQuarantineReason =
  | "LEGACY_V1_UNSCOPED"
  | "TERMINAL_SYNC_FAILURE";

export type FieldOfflineQuarantineRecord = {
  readonly sourceKey: string;
  readonly reason: FieldOfflineQuarantineReason;
  readonly capturedAt: string;
  readonly raw: string;
};

export type FieldOfflineLegacyMigrationSummary = {
  readonly adopted: number;
  readonly quarantined: number;
};

export type FieldOfflineOperation<P = unknown> = {
  readonly operationId: string;
  readonly operationType: FieldOfflineOperationType;
  readonly actorId: string;
  readonly installationId: string;
  readonly payload: P;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAt: string;
  readonly attemptCount: number;
  readonly nextRetryAt: string;
  readonly status: FieldOfflineOperationStatus;
  readonly lastError?: string;
};

const LEGACY_V1_STORAGE_KEYS = [
  "@bthwani/field-offline-queue:v1",
  "@bthwani/field-offline-queue:corrupt:v1",
] as const;
const STORAGE_PREFIX = "bthwani.field-offline-queue.v3";
const MAX_ATTEMPTS = 10;
const MAX_QUEUE_OPERATIONS = 100;
const MAX_SERIALIZED_CHARACTERS = 48_000;

let storageAdapter: FieldOfflineQueueStorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
let legacyStorageAdapter: FieldOfflineLegacyStorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
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
    actorId: requireNonEmpty(scope.actorId, "field offline queue actor id"),
    installationId: requireNonEmpty(scope.installationId, "field offline queue installation id"),
  };
}

function requireScope(): FieldOfflineQueueScope {
  if (!activeScope) throw new Error("field offline queue scope is not configured");
  return activeScope;
}

function scopeFingerprint(scope: FieldOfflineQueueScope): string {
  return stableHash(`${scope.actorId}|${scope.installationId}`);
}

function storageKey(scope: FieldOfflineQueueScope): string {
  return `${STORAGE_PREFIX}.${scopeFingerprint(scope)}`;
}

function corruptStorageKey(scope: FieldOfflineQueueScope): string {
  return `${STORAGE_PREFIX}.corrupt.${scopeFingerprint(scope)}`;
}

function legacyQuarantineStorageKey(scope: FieldOfflineQueueScope): string {
  return `${STORAGE_PREFIX}.legacy-quarantine.${scopeFingerprint(scope)}`;
}

export function configureFieldOfflineQueueStorage(adapter: FieldOfflineQueueStorageAdapter): void {
  storageAdapter = adapter;
}

export function configureFieldOfflineLegacyStorage(adapter: FieldOfflineLegacyStorageAdapter): void {
  legacyStorageAdapter = adapter;
}

export function configureFieldOfflineQueueScope(scope: FieldOfflineQueueScope | null): void {
  activeScope = scope ? normalizeScope(scope) : null;
}

function isOperation(value: unknown, scope: FieldOfflineQueueScope): value is FieldOfflineOperation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FieldOfflineOperation>;
  const validStatus =
    candidate.status === "pending" ||
    candidate.status === "retrying" ||
    candidate.status === "unknown" ||
    candidate.status === "synced" ||
    candidate.status === "failed_permanent";
  return (
    typeof candidate.operationId === "string" &&
    typeof candidate.operationType === "string" &&
    typeof candidate.actorId === "string" &&
    candidate.actorId === scope.actorId &&
    typeof candidate.installationId === "string" &&
    candidate.installationId === scope.installationId &&
    typeof candidate.idempotencyKey === "string" &&
    typeof candidate.correlationId === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.attemptCount === "number" &&
    typeof candidate.nextRetryAt === "string" &&
    validStatus
  );
}

async function readQuarantine(scope: FieldOfflineQueueScope): Promise<FieldOfflineQuarantineRecord[]> {
  const raw = await storageAdapter.getItem(legacyQuarantineStorageKey(scope));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FieldOfflineQuarantineRecord[]) : [];
  } catch {
    return [];
  }
}

async function migrateLegacyQueues(scope: FieldOfflineQueueScope): Promise<FieldOfflineLegacyMigrationSummary> {
  const found: { key: string; raw: string }[] = [];
  for (const key of LEGACY_V1_STORAGE_KEYS) {
    const raw = await legacyStorageAdapter.getItem(key);
    if (raw) found.push({ key, raw });
  }
  if (found.length === 0) return { adopted: 0, quarantined: 0 };

  const capturedAt = new Date().toISOString();
  const quarantined = [
    ...(await readQuarantine(scope)),
    ...found.map(({ key, raw }) => ({
      sourceKey: key,
      reason: "LEGACY_V1_UNSCOPED" as const,
      capturedAt,
      raw,
    })),
  ];

  await storageAdapter.setItem(legacyQuarantineStorageKey(scope), JSON.stringify(quarantined));
  for (const { key } of found) await legacyStorageAdapter.removeItem(key);
  return { adopted: 0, quarantined: quarantined.length };
}

export async function readLegacyQuarantine(): Promise<FieldOfflineQuarantineRecord[]> {
  return readQuarantine(requireScope());
}

export class FieldOfflineQueueCorruptError extends Error {
  readonly code = "OFFLINE_QUEUE_CORRUPT";

  constructor(cause: string) {
    super(`field offline queue is corrupt and was preserved for recovery: ${cause}`);
    this.name = "FieldOfflineQueueCorruptError";
  }
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
    throw new FieldOfflineQueueCorruptError(error instanceof Error ? error.message : String(error));
  }
}

async function writeQueue(queue: FieldOfflineOperation[]): Promise<void> {
  const scope = requireScope();
  if (queue.length > MAX_QUEUE_OPERATIONS) throw new Error("field offline queue capacity exceeded");
  const serialized = JSON.stringify(queue);
  if (serialized.length > MAX_SERIALIZED_CHARACTERS) {
    throw new Error("field offline queue encrypted storage limit exceeded");
  }
  await storageAdapter.setItem(storageKey(scope), serialized);
}

export async function prepareFieldOfflineQueue(): Promise<FieldOfflineLegacyMigrationSummary> {
  return migrateLegacyQueues(requireScope());
}

export async function clearFieldOfflineQueue(): Promise<void> {
  const scope = activeScope;
  for (const key of LEGACY_V1_STORAGE_KEYS) await legacyStorageAdapter.removeItem(key);
  if (!scope) return;
  await Promise.all([
    storageAdapter.removeItem(storageKey(scope)),
    storageAdapter.removeItem(corruptStorageKey(scope)),
    storageAdapter.removeItem(legacyQuarantineStorageKey(scope)),
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
      operation.actorId === scope.actorId &&
      operation.installationId === scope.installationId &&
      operation.operationType === operationType &&
      operation.idempotencyKey === normalizedKey,
  );
  if (existing) return existing as FieldOfflineOperation<P>;

  const fingerprint = stableHash(`${scope.actorId}|${scope.installationId}|${operationType}|${normalizedKey}`);
  const now = new Date().toISOString();
  const operation: FieldOfflineOperation<P> = {
    operationId: `field-op:${operationType}:${fingerprint}`,
    operationType,
    actorId: scope.actorId,
    installationId: scope.installationId,
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
  await writeQueue(queue.map((operation) =>
    operation.operationId === operationId ? { ...operation, status: "synced" as const } : operation,
  ));
}

export async function markOperationUnknown(operationId: string, error: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.map((operation) => {
    if (operation.operationId !== operationId) return operation;
    return {
      ...operation,
      attemptCount: operation.attemptCount + 1,
      lastError: error,
      nextRetryAt: new Date().toISOString(),
      status: "unknown" as const,
    };
  }));
}

export async function markOperationReadyForRetry(operationId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.map((operation) =>
    operation.operationId === operationId
      ? { ...operation, nextRetryAt: new Date().toISOString(), status: "retrying" as const }
      : operation,
  ));
}

export async function markOperationFailed(operationId: string, error: string, isPermanent = false): Promise<void> {
  const queue = await readQueue();
  const updated = queue.map((operation) => {
    if (operation.operationId !== operationId) return operation;
    const nextCount = operation.attemptCount + 1;
    const permanent = isPermanent || nextCount >= MAX_ATTEMPTS;
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
  return queue.filter((operation) =>
    (operation.status === "pending" || operation.status === "retrying") && operation.nextRetryAt <= now,
  );
}

export async function getUnknownOperations(): Promise<FieldOfflineOperation[]> {
  const queue = await readQueue();
  return queue.filter((operation) => operation.status === "unknown");
}

export async function purgeSyncedOperations(): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((operation) => operation.status !== "synced"));
}

export async function evacuateTerminalOperations(): Promise<number> {
  const scope = requireScope();
  const queue = await readQueue();
  const terminal = queue.filter((operation) => operation.status === "failed_permanent");
  if (terminal.length === 0) return 0;

  const capturedAt = new Date().toISOString();
  const quarantined = [
    ...(await readQuarantine(scope)),
    ...terminal.map((operation) => ({
      sourceKey: storageKey(scope),
      reason: "TERMINAL_SYNC_FAILURE" as const,
      capturedAt,
      raw: JSON.stringify(operation),
    })),
  ];
  await storageAdapter.setItem(legacyQuarantineStorageKey(scope), JSON.stringify(quarantined));
  await writeQueue(queue.filter((operation) => operation.status !== "failed_permanent"));
  return terminal.length;
}

export async function getAllOperations(): Promise<FieldOfflineOperation[]> {
  return readQueue();
}
