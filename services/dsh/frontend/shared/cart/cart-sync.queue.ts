import { secureRandomId } from "../_kernel/secure-random";

export type CartMutationCommand =
  | { kind: "add"; storeId: string; masterProductId: string; quantity: number; options: string[]; note: string }
  | { kind: "remove"; cartId: string; itemId: string }
  | { kind: "clear"; cartId: string; storeId: string };

export type QueuedCartMutation = {
  readonly id: string; // Used as Idempotency-Key
  readonly expectedVersion: number | undefined;
  readonly command: CartMutationCommand;
  readonly createdAt: number;
};

const QUEUE_STORAGE_KEY = "dsh_cart_sync_queue";

export function getCartSyncQueue(): readonly QueuedCartMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedCartMutation[];
  } catch (err) {
    return [];
  }
}

export function pushToCartSyncQueue(mutation: QueuedCartMutation): void {
  const queue = [...getCartSyncQueue(), mutation];
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    // Ignore storage errors, we just lose offline capabilities
  }
}

export function removeCartSyncCommand(id: string): void {
  const queue = getCartSyncQueue().filter((q) => q.id !== id);
  try {
    if (queue.length === 0) {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } else {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    }
  } catch (err) {
    // Ignore
  }
}

export function clearCartSyncQueue(): void {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (err) {
    // Ignore
  }
}

export function generateIdempotencyKey(): string {
  return `idemp-${secureRandomId()}`;
}

export function getDeviceId(): string {
  const DEVICE_KEY = "dsh_device_id";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = generateIdempotencyKey();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}

export function getSessionId(): string {
  const SESSION_KEY = "dsh_session_id";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateIdempotencyKey();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "unknown-session";
  }
}
