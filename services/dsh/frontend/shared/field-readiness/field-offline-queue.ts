/**
 * Field Offline Queue
 *
 * Durable queue scoped to the authenticated platform-workforce actor and the
 * current app installation. Mobile runtimes must use encrypted storage.
 *
 * Session end must only detach the active scope. Destructive deletion is an
 * explicit recovery/maintenance action because unresolved work, corrupt
 * archives, and terminal quarantine are operational evidence, not session
 * cache.
 */

import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { secureRandomId } from "../_kernel/secure-random.ts";

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

export type FieldOfflineQuarantineReason = "TERMINAL_SYNC_FAILURE";

export type FieldOfflineQuarantineRecord = {
  readonly sourceKey: string;
  readonly reason: FieldOfflineQuarantineReason;
  readonly capturedAt: string;
  readonly raw: string;
};

export type FieldOfflineOperation<P = unknown> = {
  readonly operationId: string;
  readonly operationType: FieldOfflineOperationType;
  readonly actorId: string;
  readonly installationId: string;
  readonly payload: P;
  /** Exact local business-intent identity. It is never sent as an HTTP header. */
  readonly intentFingerprint: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAt: string;
  readonly attemptCount: number;
  readonly nextRetryAt: string;
  readonly status: FieldOfflineOperationStatus;
  readonly lastError?: string;
};

type FieldOfflineOperationV3<P = unknown> = Omit<FieldOfflineOperation<P>, "intentFingerprint">;

const STORAGE_PREFIX = "bthwani.field-offline-queue.v4";
const V3_STORAGE_PREFIX = "bthwani.field-offline-queue.v3";
const MAX_ATTEMPTS = 10;
const MAX_QUEUE_OPERATIONS = 100;
const MAX_SERIALIZED_CHARACTERS = 48_000;

let storageAdapter: FieldOfflineQueueStorageAdapter = {
  getItem: (key) => bthwaniDurableStorage.getItem(key),
  setItem: (key, value) => bthwaniDurableStorage.setItem(key, value),
  removeItem: (key) => bthwaniDurableStorage.removeItem(key),
};
let activeScope: FieldOfflineQueueScope | null = null;

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

/**
 * Collision-free encoding for SecureStore keys. Every UTF-16 code unit is
 * represented by exactly four hex characters, so different scope strings can
 * never alias because of a bounded hash.
 */
function encodeStorageSegment(value: string): string {
  let encoded = "";
  for (let index = 0; index < value.length; index += 1) {
    encoded += value.charCodeAt(index).toString(16).padStart(4, "0");
  }
  return encoded;
}

function scopeStorageSuffix(scope: FieldOfflineQueueScope): string {
  return `${encodeStorageSegment(scope.actorId)}.${encodeStorageSegment(scope.installationId)}`;
}

function storageKey(scope: FieldOfflineQueueScope): string {
  return `${STORAGE_PREFIX}.${scopeStorageSuffix(scope)}`;
}

function corruptStorageKey(scope: FieldOfflineQueueScope): string {
  return `${STORAGE_PREFIX}.corrupt.${scopeStorageSuffix(scope)}`;
}

function recoveryCorruptStorageKey(scope: FieldOfflineQueueScope): string {
  return `${STORAGE_PREFIX}.recovery-corrupt.${scopeStorageSuffix(scope)}`;
}

function recoveryQuarantineStorageKey(scope: FieldOfflineQueueScope): string {
  return `${STORAGE_PREFIX}.recovery-quarantine.${scopeStorageSuffix(scope)}`;
}

/** Historical v3 addressing exists only to perform the one-way cutover. */
function v3BoundedHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function v3ScopeSuffix(scope: FieldOfflineQueueScope): string {
  return v3BoundedHash(`${scope.actorId}|${scope.installationId}`);
}

function v3StorageKey(scope: FieldOfflineQueueScope): string {
  return `${V3_STORAGE_PREFIX}.${v3ScopeSuffix(scope)}`;
}

function v3CorruptStorageKey(scope: FieldOfflineQueueScope): string {
  return `${V3_STORAGE_PREFIX}.corrupt.${v3ScopeSuffix(scope)}`;
}

function v3RecoveryQuarantineStorageKey(scope: FieldOfflineQueueScope): string {
  return `${V3_STORAGE_PREFIX}.recovery-quarantine.${v3ScopeSuffix(scope)}`;
}

export function configureFieldOfflineQueueStorage(adapter: FieldOfflineQueueStorageAdapter): void {
  storageAdapter = adapter;
}

export function configureFieldOfflineQueueScope(scope: FieldOfflineQueueScope | null): void {
  activeScope = scope ? normalizeScope(scope) : null;
}

export function detachFieldOfflineQueueScope(): void {
  activeScope = null;
}

function isOperationType(value: unknown): value is FieldOfflineOperationType {
  return value === "create_visit"
    || value === "complete_visit"
    || value === "upsert_readiness_check"
    || value === "create_escalation";
}

function isOperationStatus(value: unknown): value is FieldOfflineOperationStatus {
  return value === "pending"
    || value === "retrying"
    || value === "unknown"
    || value === "synced"
    || value === "failed_permanent";
}

function hasCommonOperationShape(
  value: unknown,
  scope: FieldOfflineQueueScope,
): value is FieldOfflineOperationV3 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FieldOfflineOperationV3>;
  return typeof candidate.operationId === "string"
    && isOperationType(candidate.operationType)
    && candidate.actorId === scope.actorId
    && candidate.installationId === scope.installationId
    && typeof candidate.idempotencyKey === "string"
    && candidate.idempotencyKey.trim().length > 0
    && typeof candidate.correlationId === "string"
    && candidate.correlationId.trim().length > 0
    && typeof candidate.createdAt === "string"
    && typeof candidate.attemptCount === "number"
    && Number.isInteger(candidate.attemptCount)
    && candidate.attemptCount >= 0
    && typeof candidate.nextRetryAt === "string"
    && isOperationStatus(candidate.status);
}

function isOperation(value: unknown, scope: FieldOfflineQueueScope): value is FieldOfflineOperation {
  if (!hasCommonOperationShape(value, scope)) return false;
  const candidate = value as Partial<FieldOfflineOperation>;
  return typeof candidate.intentFingerprint === "string" && candidate.intentFingerprint.trim().length > 0;
}

function isQuarantineRecord(value: unknown): value is FieldOfflineQuarantineRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<FieldOfflineQuarantineRecord>;
  return typeof record.sourceKey === "string"
    && record.reason === "TERMINAL_SYNC_FAILURE"
    && typeof record.capturedAt === "string"
    && typeof record.raw === "string";
}

function fallbackIntentFingerprint(operationType: FieldOfflineOperationType, payload: unknown): string {
  return JSON.stringify(["field-offline-v3-migrated", operationType, payload]);
}

export class FieldOfflineQueueCorruptError extends Error {
  readonly code = "OFFLINE_QUEUE_CORRUPT";

  constructor(cause: string) {
    super(`field offline queue is corrupt and was preserved for recovery: ${cause}`);
    this.name = "FieldOfflineQueueCorruptError";
  }
}

async function writeQueueForScope(scope: FieldOfflineQueueScope, queue: FieldOfflineOperation[]): Promise<void> {
  if (queue.length > MAX_QUEUE_OPERATIONS) throw new Error("field offline queue capacity exceeded");
  const serialized = JSON.stringify(queue);
  if (serialized.length > MAX_SERIALIZED_CHARACTERS) {
    throw new Error("field offline queue encrypted storage limit exceeded");
  }
  await storageAdapter.setItem(storageKey(scope), serialized);
}

async function migrateV3Artifacts(scope: FieldOfflineQueueScope): Promise<void> {
  const currentCorrupt = await storageAdapter.getItem(corruptStorageKey(scope));
  if (!currentCorrupt) {
    const archivedV3Corrupt = await storageAdapter.getItem(v3CorruptStorageKey(scope));
    if (archivedV3Corrupt) {
      await storageAdapter.setItem(corruptStorageKey(scope), archivedV3Corrupt);
      await storageAdapter.removeItem(v3CorruptStorageKey(scope));
    }
  }

  const currentRecovery = await storageAdapter.getItem(recoveryQuarantineStorageKey(scope));
  if (!currentRecovery) {
    const v3Recovery = await storageAdapter.getItem(v3RecoveryQuarantineStorageKey(scope));
    if (v3Recovery) {
      try {
        const parsed: unknown = JSON.parse(v3Recovery);
        if (!Array.isArray(parsed) || !parsed.every(isQuarantineRecord)) {
          throw new Error("stored v3 recovery quarantine does not match its schema");
        }
        await storageAdapter.setItem(recoveryQuarantineStorageKey(scope), v3Recovery);
        await storageAdapter.removeItem(v3RecoveryQuarantineStorageKey(scope));
      } catch (error) {
        await storageAdapter.setItem(recoveryCorruptStorageKey(scope), v3Recovery);
        await storageAdapter.removeItem(v3RecoveryQuarantineStorageKey(scope));
        throw new FieldOfflineQueueCorruptError(error instanceof Error ? error.message : String(error));
      }
    }
  }

  const currentQueue = await storageAdapter.getItem(storageKey(scope));
  if (currentQueue) return;

  const v3Raw = await storageAdapter.getItem(v3StorageKey(scope));
  if (!v3Raw) return;
  try {
    const parsed: unknown = JSON.parse(v3Raw);
    if (!Array.isArray(parsed) || !parsed.every((entry) => hasCommonOperationShape(entry, scope))) {
      throw new Error("stored v3 queue does not match the scoped field offline operation schema");
    }
    const migrated: FieldOfflineOperation[] = (parsed as FieldOfflineOperationV3[]).map((operation) => ({
      ...operation,
      intentFingerprint: fallbackIntentFingerprint(operation.operationType, operation.payload),
    }));
    await writeQueueForScope(scope, migrated);
    await storageAdapter.removeItem(v3StorageKey(scope));
  } catch (error) {
    await storageAdapter.setItem(corruptStorageKey(scope), v3Raw);
    await storageAdapter.removeItem(v3StorageKey(scope));
    throw new FieldOfflineQueueCorruptError(error instanceof Error ? error.message : String(error));
  }
}

async function readQuarantine(scope: FieldOfflineQueueScope): Promise<FieldOfflineQuarantineRecord[]> {
  await migrateV3Artifacts(scope);
  const key = recoveryQuarantineStorageKey(scope);
  const raw = await storageAdapter.getItem(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isQuarantineRecord)) {
      throw new Error("stored field offline recovery quarantine does not match its schema");
    }
    return parsed;
  } catch (error) {
    await storageAdapter.setItem(recoveryCorruptStorageKey(scope), raw);
    throw new FieldOfflineQueueCorruptError(error instanceof Error ? error.message : String(error));
  }
}

export async function readFieldOfflineRecovery(): Promise<FieldOfflineQuarantineRecord[]> {
  return readQuarantine(requireScope());
}

async function readQueue(): Promise<FieldOfflineOperation[]> {
  const scope = requireScope();
  await migrateV3Artifacts(scope);
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
  await writeQueueForScope(requireScope(), queue);
}

/**
 * Explicit destructive maintenance action. Normal logout/session changes must
 * never call this function.
 */
export async function discardFieldOfflineRecoveryState(): Promise<void> {
  const scope = activeScope;
  if (!scope) return;
  await Promise.all([
    storageAdapter.removeItem(storageKey(scope)),
    storageAdapter.removeItem(corruptStorageKey(scope)),
    storageAdapter.removeItem(recoveryCorruptStorageKey(scope)),
    storageAdapter.removeItem(recoveryQuarantineStorageKey(scope)),
    storageAdapter.removeItem(v3StorageKey(scope)),
    storageAdapter.removeItem(v3CorruptStorageKey(scope)),
    storageAdapter.removeItem(v3RecoveryQuarantineStorageKey(scope)),
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
  intentFingerprint?: string,
): Promise<FieldOfflineOperation<P>> {
  const scope = requireScope();
  const normalizedKey = requireNonEmpty(idempotencyKey, "field offline operation idempotency key");
  const normalizedFingerprint = intentFingerprint?.trim()
    || JSON.stringify(["field-offline-intent", operationType, payload]);
  const normalizedCorrelation = correlationId?.trim()
    || `field:${operationType}:corr:${secureRandomId()}`;
  if (normalizedCorrelation === normalizedKey) {
    throw new Error("field offline correlation id must be distinct from the idempotency key");
  }

  const queue = await readQueue();
  const existing = queue.find(
    (operation) => operation.operationType === operationType
      && operation.intentFingerprint === normalizedFingerprint,
  );
  if (existing) return existing as FieldOfflineOperation<P>;

  const now = new Date().toISOString();
  const operation: FieldOfflineOperation<P> = {
    operationId: `field-op:v4:${operationType}:${encodeURIComponent(normalizedKey)}`,
    operationType,
    actorId: scope.actorId,
    installationId: scope.installationId,
    payload,
    intentFingerprint: normalizedFingerprint,
    idempotencyKey: normalizedKey,
    correlationId: normalizedCorrelation,
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
  await storageAdapter.setItem(recoveryQuarantineStorageKey(scope), JSON.stringify(quarantined));
  await writeQueue(queue.filter((operation) => operation.status !== "failed_permanent"));
  return terminal.length;
}

export async function getAllOperations(): Promise<FieldOfflineOperation[]> {
  return readQueue();
}
