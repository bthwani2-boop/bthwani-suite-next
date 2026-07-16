/**
 * Field Offline Queue
 *
 * A durable client-side queue for field agent operations that must survive
 * network interruptions. Operations are persisted in AsyncStorage and retried
 * with exponential backoff whenever connectivity is restored.
 *
 * Design constraints:
 * - Each operation carries a stable idempotencyKey so re-sending is safe
 * - A correlationId links client logs to backend traces
 * - Retry count is bounded to prevent infinite loops on unrecoverable errors
 * - Queue state is reactive — UI can display pending/failed items
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldOfflineOperationType =
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
  readonly createdAt: string; // ISO 8601
  readonly attemptCount: number;
  readonly nextRetryAt: string; // ISO 8601
  readonly status: FieldOfflineOperationStatus;
  readonly lastError?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "@bthwani/field-offline-queue:v1";
const MAX_ATTEMPTS = 10;

// ─── Persistence ─────────────────────────────────────────────────────────────

async function readQueue(): Promise<FieldOfflineOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FieldOfflineOperation[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: FieldOfflineOperation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

// ─── Enqueue ─────────────────────────────────────────────────────────────────

export async function enqueueFieldOperation<P>(
  operationType: FieldOfflineOperationType,
  payload: P,
  idempotencyKey: string,
): Promise<FieldOfflineOperation<P>> {
  const queue = await readQueue();

  // Deduplicate by idempotency key — re-enqueue is a no-op.
  const existing = queue.find((op) => op.idempotencyKey === idempotencyKey);
  if (existing) return existing as FieldOfflineOperation<P>;

  const op: FieldOfflineOperation<P> = {
    operationId: `${operationType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    operationType,
    payload,
    idempotencyKey,
    correlationId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    nextRetryAt: new Date().toISOString(),
    status: "pending",
  };

  await writeQueue([...queue, op]);
  return op;
}

// ─── Mark synced ─────────────────────────────────────────────────────────────

export async function markOperationSynced(operationId: string): Promise<void> {
  const queue = await readQueue();
  const updated = queue.map((op) =>
    op.operationId === operationId ? { ...op, status: "synced" as const } : op,
  );
  await writeQueue(updated);
}

// ─── Mark failed (with backoff) ───────────────────────────────────────────────

export async function markOperationFailed(
  operationId: string,
  error: string,
): Promise<void> {
  const queue = await readQueue();
  const updated = queue.map((op) => {
    if (op.operationId !== operationId) return op;
    const nextCount = op.attemptCount + 1;
    const isPermanent = nextCount >= MAX_ATTEMPTS;
    // Exponential backoff capped at 30 minutes.
    const backoffMs = Math.min(Math.pow(2, nextCount) * 1000, 30 * 60 * 1000);
    const nextRetry = new Date(Date.now() + backoffMs).toISOString();
    return {
      ...op,
      attemptCount: nextCount,
      lastError: error,
      nextRetryAt: nextRetry,
      status: isPermanent ? ("failed_permanent" as const) : ("retrying" as const),
    };
  });
  await writeQueue(updated);
}

// ─── Get due operations ───────────────────────────────────────────────────────

export async function getDueOperations(): Promise<FieldOfflineOperation[]> {
  const queue = await readQueue();
  const now = new Date().toISOString();
  return queue.filter(
    (op) =>
      (op.status === "pending" || op.status === "retrying") &&
      op.nextRetryAt <= now,
  );
}

// ─── Get pending count (for UI badge) ────────────────────────────────────────

export async function getPendingCount(): Promise<number> {
  const queue = await readQueue();
  return queue.filter(
    (op) => op.status === "pending" || op.status === "retrying",
  ).length;
}

// ─── Purge synced entries ─────────────────────────────────────────────────────

export async function purgeSyncedOperations(): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((op) => op.status !== "synced"));
}

// ─── Full queue snapshot (for UI) ────────────────────────────────────────────

export async function getAllOperations(): Promise<FieldOfflineOperation[]> {
  return readQueue();
}
