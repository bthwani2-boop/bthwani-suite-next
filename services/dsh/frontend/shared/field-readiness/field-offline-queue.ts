/**
 * Field Offline Queue
 *
 * Durable queue for authenticated field operations during network loss.
 * The caller supplies the business idempotency key; queue identity and
 * correlation are derived from it so retries remain stable across restarts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type FieldOfflineOperationType =
  | "create_visit"
  | "complete_visit"
  | "upsert_readiness_check"
  | "create_escalation"
  | "submit_payout_request"
  | "upload_media_evidence";

export type FieldOfflineOperationStatus =
  | "pending"
  | "retrying"
  | "synced"
  | "failed_permanent";

export type FieldOfflineOperation<P = unknown> = {
  readonly operationId: string;
  readonly operationType: FieldOfflineOperationType;
  readonly payload: P;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAt: string;
  readonly attemptCount: number;
  readonly nextRetryAt: string;
  readonly status: FieldOfflineOperationStatus;
  readonly lastError?: string;
};

const STORAGE_KEY = "@bthwani/field-offline-queue:v1";
const CORRUPT_STORAGE_KEY = "@bthwani/field-offline-queue:corrupt:v1";
const MAX_ATTEMPTS = 10;

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function requireIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error("field offline operation idempotency key is required");
  return normalized;
}

function isOperation(value: unknown): value is FieldOfflineOperation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FieldOfflineOperation>;
  return (
    typeof candidate.operationId === "string" &&
    typeof candidate.operationType === "string" &&
    typeof candidate.idempotencyKey === "string" &&
    typeof candidate.correlationId === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.attemptCount === "number" &&
    typeof candidate.nextRetryAt === "string" &&
    typeof candidate.status === "string"
  );
}

async function readQueue(): Promise<FieldOfflineOperation[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isOperation)) {
      throw new Error("stored queue does not match the field offline operation schema");
    }
    return parsed;
  } catch (error) {
    await AsyncStorage.setItem(CORRUPT_STORAGE_KEY, raw);
    throw new Error(
      `field offline queue is corrupt and was preserved for recovery: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function writeQueue(queue: FieldOfflineOperation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function recoverCorruptFieldOfflineQueue(): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) await AsyncStorage.setItem(CORRUPT_STORAGE_KEY, raw);
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function enqueueFieldOperation<P>(
  operationType: FieldOfflineOperationType,
  payload: P,
  idempotencyKey: string,
): Promise<FieldOfflineOperation<P>> {
  const normalizedKey = requireIdempotencyKey(idempotencyKey);
  const queue = await readQueue();
  const existing = queue.find((op) => op.idempotencyKey === normalizedKey);
  if (existing) return existing as FieldOfflineOperation<P>;

  const fingerprint = stableHash(`${operationType}|${normalizedKey}`);
  const now = new Date().toISOString();
  const operation: FieldOfflineOperation<P> = {
    operationId: `field-op:${operationType}:${fingerprint}`,
    operationType,
    payload,
    idempotencyKey: normalizedKey,
    correlationId: `field-correlation:${operationType}:${fingerprint}`,
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
