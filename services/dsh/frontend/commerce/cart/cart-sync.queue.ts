import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { secureRandomId } from "../../shared/_kernel/secure-random.ts";
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

const STORAGE_PREFIX = "@bthwani/dsh/cart-sync-queue/v4/";
const RECOVERY_PREFIX = `${STORAGE_PREFIX}recovery/`;
const RETIRED_EXACT_KEYS = new Set(["dsh_cart_sync_queue"]);
const RETIRED_PREFIXES = [
  "@bthwani/dsh/cart-sync-queue/v1/",
  "@bthwani/dsh/cart-sync-queue/v2/",
  "@bthwani/dsh/cart-sync-queue/v3/",
  "@bthwani/dsh/cart-sync-queue/legacy-quarantine/",
  `${STORAGE_PREFIX}quarantine/`,
];
const MAX_QUEUE_MUTATIONS = 100;
const MAX_SERIALIZED_CHARACTERS = 96_000;
let queueWrite: Promise<void> = Promise.resolve();

function encode(value: string): string {
  return encodeURIComponent(value.trim());
}

function queueKey(scope: CartQueueScope): string {
  return `${STORAGE_PREFIX}${encode(scope.actorId)}/${encode(scope.installationId)}`;
}

function recoveryKey(scope: CartQueueScope): string {
  return `${RECOVERY_PREFIX}${encode(scope.actorId)}/${encode(scope.installationId)}`;
}

function browserStorage(): Storage | null {
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
      recoveryKey(scope),
      JSON.stringify({
        sourceKey: key,
        reason: "CORRUPT_SCOPED_CART_QUEUE",
        capturedAt: new Date().toISOString(),
        recordCount: null,
        rawLength: raw.length,
      }),
    );
    await bthwaniDurableStorage.removeItem(key);
    throw new Error(`cart queue is corrupt and a bounded recovery marker was preserved: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function writeQueue(scope: CartQueueScope, queue: readonly QueuedCartMutation[]): Promise<void> {
  const key = queueKey(scope);
  if (queue.length === 0) {
    await bthwaniDurableStorage.removeItem(key);
    return;
  }
  if (queue.length > MAX_QUEUE_MUTATIONS) throw new Error("cart offline queue capacity exceeded");
  const serialized = JSON.stringify(queue);
  if (serialized.length > MAX_SERIALIZED_CHARACTERS) {
    throw new Error("cart offline queue storage limit exceeded");
  }
  await bthwaniDurableStorage.setItem(key, serialized);
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
 * One-way cleanup for storage namespaces retired before the scoped v4 queue.
 * It never reads or rebinds legacy payloads: all retired keys are removed and
 * the operation verifies that no retired namespace remains.
 */
export async function purgeRetiredCartSyncArtifacts(): Promise<void> {
  const durableKeys = await bthwaniDurableStorage.getAllKeys();
  const retiredDurableKeys = durableKeys.filter((key) =>
    RETIRED_EXACT_KEYS.has(key) || RETIRED_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
  if (retiredDurableKeys.length > 0) {
    await bthwaniDurableStorage.multiRemove(retiredDurableKeys);
  }

  const storage = browserStorage();
  if (storage) {
    const browserRetiredKeys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && (RETIRED_EXACT_KEYS.has(key) || RETIRED_PREFIXES.some((prefix) => key.startsWith(prefix)))) {
        browserRetiredKeys.push(key);
      }
    }
    for (const key of browserRetiredKeys) storage.removeItem(key);
  }

  const remaining = (await bthwaniDurableStorage.getAllKeys()).filter((key) =>
    RETIRED_EXACT_KEYS.has(key) || RETIRED_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
  if (remaining.length > 0 || browserStorage()?.getItem("dsh_cart_sync_queue")) {
    throw new Error(`retired cart storage cleanup incomplete: ${remaining.length} durable keys remain`);
  }
}

export async function getCartSyncQueue(actorId: string): Promise<readonly QueuedCartMutation[]> {
  await purgeRetiredCartSyncArtifacts();
  return readQueue(await resolveQueueScope(actorId));
}

export async function enqueueCartSyncCommand(input: {
  readonly actorId: string;
  readonly expectedVersion: number | undefined;
  readonly command: CartMutationCommand;
}): Promise<QueuedCartMutation> {
  await purgeRetiredCartSyncArtifacts();
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
    const diagnostic = lastError?.trim().slice(0, 512);
    await writeQueue(scope, queue.map((entry) => entry.id === id
      ? { ...entry, status, ...(diagnostic ? { lastError: diagnostic } : {}) }
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
      recoveryKey(scope),
      JSON.stringify({
        sourceKey: queueKey(scope),
        reason: "DISCARDED_BY_EXPLICIT_USER_DECISION",
        decisionProvided: Boolean(requireNonEmpty(reason, "cart discard reason")),
        capturedAt: new Date().toISOString(),
        recordCount: queue.length,
      }),
    );
    await writeQueue(scope, []);
  });
}
