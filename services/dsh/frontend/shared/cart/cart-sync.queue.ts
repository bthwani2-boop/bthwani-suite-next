import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { secureRandomId } from "../_kernel/secure-random.ts";
import type { DshFulfillmentMode } from "./cart.types";

export type CartMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export type CartMutationCommand =
  | {
      readonly kind: "add";
      readonly storeId: string;
      readonly masterProductId: string;
      readonly quantity: number;
      readonly options: readonly string[];
      readonly note: string;
      readonly fulfillmentMode?: DshFulfillmentMode;
    }
  | { readonly kind: "remove"; readonly cartId: string; readonly itemId: string }
  | { readonly kind: "clear"; readonly cartId: string; readonly storeId: string };

export type CartMutationStatus =
  | "pending_local"
  | "submitted_unknown"
  | "conflict"
  | "permanent_failure";

export type QueuedCartMutation = {
  readonly id: string;
  readonly expectedVersion: number | undefined;
  readonly command: CartMutationCommand;
  readonly createdAt: number;
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
  };
  readonly context: CartMutationContext;
  readonly status: CartMutationStatus;
  readonly lastError?: string;
};

type CartQueueScope = {
  readonly actorId: string;
  readonly installationId: string;
};

type LegacyCartQueueQuarantine = {
  readonly sourceKey: string;
  readonly reason: "UNSCOPED_LEGACY_CART_QUEUE";
  readonly capturedAt: string;
  readonly raw: string;
};

const STORAGE_PREFIX = "@bthwani/dsh/cart-sync-queue/v4/";
const LEGACY_QUEUE_STORAGE_KEY = "dsh_cart_sync_queue";
const LEGACY_QUARANTINE_PREFIX = "@bthwani/dsh/cart-sync-queue/legacy-quarantine/v1/";

let legacyMigration: Promise<void> | undefined;
let queueWrite: Promise<void> = Promise.resolve();

function encode(value: string): string {
  return encodeURIComponent(value.trim());
}

function queueKey(scope: CartQueueScope): string {
  return `${STORAGE_PREFIX}${encode(scope.actorId)}/${encode(scope.installationId)}`;
}

function quarantineKey(scope: CartQueueScope): string {
  return `${STORAGE_PREFIX}quarantine/${encode(scope.actorId)}/${encode(scope.installationId)}/${Date.now()}-${secureRandomId()}`;
}

function legacyStorage(): Storage | null {
  const globalObject = globalThis as typeof globalThis & {
    localStorage?: Storage;
    window?: Window;
  };
  return globalObject.window?.localStorage ?? globalObject.localStorage ?? null;
}

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

async function resolveQueueScope(actorId: string): Promise<CartQueueScope> {
  const scope = await resolveMutationIdentityScope(requireNonEmpty(actorId, "cart actor id"));
  return { actorId: scope.actorId, installationId: scope.installationId };
}

function commandEntityId(command: CartMutationCommand): string {
  switch (command.kind) {
    case "add":
      return `store:${command.storeId}:product:${command.masterProductId}`;
    case "remove":
      return `cart:${command.cartId}:item:${command.itemId}`;
    case "clear":
      return `cart:${command.cartId}`;
  }
}

function isCartMutationCommand(value: unknown): value is CartMutationCommand {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CartMutationCommand>;
  if (candidate.kind === "add") {
    return typeof candidate.storeId === "string"
      && typeof candidate.masterProductId === "string"
      && typeof candidate.quantity === "number"
      && Number.isInteger(candidate.quantity)
      && candidate.quantity > 0
      && Array.isArray(candidate.options)
      && candidate.options.every((option) => typeof option === "string")
      && typeof candidate.note === "string"
      && (candidate.fulfillmentMode === undefined || typeof candidate.fulfillmentMode === "string");
  }
  if (candidate.kind === "remove") {
    return typeof candidate.cartId === "string" && typeof candidate.itemId === "string";
  }
  if (candidate.kind === "clear") {
    return typeof candidate.cartId === "string" && typeof candidate.storeId === "string";
  }
  return false;
}

function isQueuedCartMutation(value: unknown, scope: CartQueueScope): value is QueuedCartMutation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<QueuedCartMutation>;
  const candidateScope = candidate.scope;
  const candidateContext = candidate.context;
  const validStatus = candidate.status === "pending_local"
    || candidate.status === "submitted_unknown"
    || candidate.status === "conflict"
    || candidate.status === "permanent_failure";
  return typeof candidate.id === "string"
    && typeof candidate.createdAt === "number"
    && (candidate.expectedVersion === undefined || (Number.isInteger(candidate.expectedVersion) && candidate.expectedVersion >= 1))
    && isCartMutationCommand(candidate.command)
    && typeof candidateScope?.actorId === "string"
    && candidateScope.actorId === scope.actorId
    && typeof candidateScope.installationId === "string"
    && candidateScope.installationId === scope.installationId
    && typeof candidateScope.entityId === "string"
    && candidateScope.entityId === commandEntityId(candidate.command)
    && typeof candidateContext?.idempotencyKey === "string"
    && candidateContext.idempotencyKey === candidate.id
    && typeof candidateContext.correlationId === "string"
    && validStatus;
}

async function readQueue(scope: CartQueueScope): Promise<QueuedCartMutation[]> {
  const key = queueKey(scope);
  const raw = await bthwaniDurableStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((entry) => isQueuedCartMutation(entry, scope))) {
      throw new Error("stored cart queue does not match the scoped mutation schema");
    }
    return parsed;
  } catch (error) {
    await bthwaniDurableStorage.setItem(
      quarantineKey(scope),
      JSON.stringify({ sourceKey: key, reason: "CORRUPT_SCOPED_CART_QUEUE", capturedAt: new Date().toISOString(), raw }),
    );
    await bthwaniDurableStorage.removeItem(key);
    throw new Error(`cart queue is corrupt and was preserved for recovery: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function writeQueue(scope: CartQueueScope, queue: readonly QueuedCartMutation[]): Promise<void> {
  const key = queueKey(scope);
  if (queue.length === 0) {
    await bthwaniDurableStorage.removeItem(key);
    return;
  }
  await bthwaniDurableStorage.setItem(key, JSON.stringify(queue));
}

async function withQueueWrite<T>(work: () => Promise<T>): Promise<T> {
  const previous = queueWrite;
  let release!: () => void;
  queueWrite = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

/**
 * The former queue had no actor or installation scope and was persisted in
 * localStorage. It must never be rebound to the current actor. Preserve it as
 * recovery evidence, then remove only the retired active key.
 */
export function quarantineLegacyCartSyncQueue(): Promise<void> {
  if (legacyMigration) return legacyMigration;
  legacyMigration = (async () => {
    const storage = legacyStorage();
    if (!storage) return;
    let raw: string | null;
    try {
      raw = storage.getItem(LEGACY_QUEUE_STORAGE_KEY);
    } catch (error) {
      throw new Error(`legacy cart queue could not be inspected: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!raw) return;

    const quarantine: LegacyCartQueueQuarantine = {
      sourceKey: LEGACY_QUEUE_STORAGE_KEY,
      reason: "UNSCOPED_LEGACY_CART_QUEUE",
      capturedAt: new Date().toISOString(),
      raw,
    };
    await bthwaniDurableStorage.setItem(
      `${LEGACY_QUARANTINE_PREFIX}${Date.now()}-${secureRandomId()}`,
      JSON.stringify(quarantine),
    );
    try {
      storage.removeItem(LEGACY_QUEUE_STORAGE_KEY);
    } catch (error) {
      throw new Error(`legacy cart queue could not be retired: ${error instanceof Error ? error.message : String(error)}`);
    }
  })().catch((error) => {
    legacyMigration = undefined;
    throw error;
  });
  return legacyMigration;
}

export async function getCartSyncQueue(actorId: string): Promise<readonly QueuedCartMutation[]> {
  await quarantineLegacyCartSyncQueue();
  return readQueue(await resolveQueueScope(actorId));
}

export async function enqueueCartSyncCommand(input: {
  readonly actorId: string;
  readonly expectedVersion: number | undefined;
  readonly command: CartMutationCommand;
}): Promise<QueuedCartMutation> {
  await quarantineLegacyCartSyncQueue();
  const scope = await resolveQueueScope(input.actorId);
  const entityId = commandEntityId(input.command);
  const operation = input.command.kind === "add" ? "add" : input.command.kind;
  const part = secureRandomId();
  const created: QueuedCartMutation = {
    id: `cart:${operation}:${part}`,
    expectedVersion: input.expectedVersion,
    command: input.command,
    createdAt: Date.now(),
    scope: { ...scope, entityId },
    context: {
      idempotencyKey: `cart:${operation}:${part}`,
      correlationId: `cart:${operation}:${part}`,
    },
    status: "pending_local",
  };

  return withQueueWrite(async () => {
    const queue = await readQueue(scope);
    await writeQueue(scope, [...queue, created]);
    return created;
  });
}

export async function removeCartSyncCommand(actorId: string, id: string): Promise<void> {
  const scope = await resolveQueueScope(actorId);
  await withQueueWrite(async () => {
    const queue = await readQueue(scope);
    await writeQueue(scope, queue.filter((entry) => entry.id !== id));
  });
}

export async function updateCartSyncCommand(
  actorId: string,
  id: string,
  status: CartMutationStatus,
  lastError?: string,
): Promise<void> {
  const scope = await resolveQueueScope(actorId);
  await withQueueWrite(async () => {
    const queue = await readQueue(scope);
    await writeQueue(scope, queue.map((entry) => entry.id === id
      ? { ...entry, status, ...(lastError ? { lastError } : {}) }
      : entry));
  });
}

/**
 * An explicit user discard is retained as durable recovery evidence. It is
 * never implemented as an untraceable delete of unresolved business intent.
 */
export async function discardCartSyncQueue(actorId: string, reason: string): Promise<void> {
  const scope = await resolveQueueScope(actorId);
  await withQueueWrite(async () => {
    const queue = await readQueue(scope);
    if (queue.length === 0) return;
    await bthwaniDurableStorage.setItem(
      quarantineKey(scope),
      JSON.stringify({
        sourceKey: queueKey(scope),
        reason: "DISCARDED_BY_EXPLICIT_USER_DECISION",
        decision: requireNonEmpty(reason, "cart discard reason"),
        capturedAt: new Date().toISOString(),
        raw: JSON.stringify(queue),
      }),
    );
    await writeQueue(scope, []);
  });
}
