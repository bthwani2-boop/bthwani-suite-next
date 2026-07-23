import AsyncStorage from "@react-native-async-storage/async-storage";

export type OfflineMutationEnvelope = {
  readonly id: string;
  readonly kind: string;
  readonly payload: unknown;
  readonly tenantScope: string;
  readonly createdAt: number;
  readonly attempts: number;
};

export type OfflineMutationHandler = (payload: unknown) => Promise<void>;

export type BthwaniOfflineMutationQueue = {
  enqueue(input: Omit<OfflineMutationEnvelope, "createdAt" | "attempts">): Promise<void>;
  register(kind: string, handler: OfflineMutationHandler): () => void;
  flush(): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
  setPaused(paused: boolean): void;
};

const MAX_ATTEMPTS = 5;

export function createBthwaniOfflineMutationQueue(
  storageKey: string,
): BthwaniOfflineMutationQueue {
  const handlers = new Map<string, OfflineMutationHandler>();
  let paused = false;
  let flushing: Promise<void> | undefined;

  async function readQueue(): Promise<OfflineMutationEnvelope[]> {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as OfflineMutationEnvelope[] : [];
    } catch {
      await AsyncStorage.removeItem(storageKey);
      return [];
    }
  }

  async function writeQueue(queue: readonly OfflineMutationEnvelope[]): Promise<void> {
    if (queue.length === 0) await AsyncStorage.removeItem(storageKey);
    else await AsyncStorage.setItem(storageKey, JSON.stringify(queue));
  }

  return {
    async enqueue(input) {
      const queue = await readQueue();
      if (queue.some((entry) => entry.id === input.id)) return;
      queue.push({ ...input, createdAt: Date.now(), attempts: 0 });
      await writeQueue(queue);
    },
    register(kind, handler) {
      handlers.set(kind, handler);
      return () => {
        if (handlers.get(kind) === handler) handlers.delete(kind);
      };
    },
    async flush() {
      if (paused) return;
      if (flushing) return flushing;
      flushing = (async () => {
        const queue = await readQueue();
        const retained: OfflineMutationEnvelope[] = [];
        for (const entry of queue) {
          if (paused) {
            retained.push(entry);
            continue;
          }
          const handler = handlers.get(entry.kind);
          if (!handler) {
            retained.push(entry);
            continue;
          }
          try {
            await handler(entry.payload);
          } catch {
            const attempts = entry.attempts + 1;
            if (attempts < MAX_ATTEMPTS) retained.push({ ...entry, attempts });
          }
        }
        await writeQueue(retained);
      })().finally(() => {
        flushing = undefined;
      });
      return flushing;
    },
    async clear() {
      await AsyncStorage.removeItem(storageKey);
    },
    async size() {
      return (await readQueue()).length;
    },
    setPaused(value) {
      paused = value;
    },
  };
}
