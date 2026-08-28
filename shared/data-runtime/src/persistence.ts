import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";
import {
  bthwaniCacheStorage,
  type BthwaniCacheStore,
} from "./storage-adapter.ts";

const CACHE_SCHEMA_VERSION = 3;
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

// Deny-by-default: only explicitly allowlisted query-key namespaces are
// eligible for disk persistence. Everything else (including financial data)
// stays server-authoritative and never reaches a persisted envelope.
export const PERSISTED_QUERY_NAMESPACE_ALLOWLIST = [
  ["dsh", "home-discovery"],
] as const;

export function isPersistableQueryKey(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length < 2) return false;
  const first = queryKey[0];
  const second = queryKey[1];
  if (typeof first !== "string" || typeof second !== "string") return false;
  return PERSISTED_QUERY_NAMESPACE_ALLOWLIST.some(
    (entry) => entry[0] === first && entry[1] === second,
  );
}

type PersistedQueryEnvelope = {
  readonly schemaVersion: number;
  readonly persistedAt: number;
  readonly clientState: DehydratedState;
};

function isEnvelope(value: unknown): value is PersistedQueryEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedQueryEnvelope>;
  return candidate.schemaVersion === CACHE_SCHEMA_VERSION
    && typeof candidate.persistedAt === "number"
    && Boolean(candidate.clientState);
}

export async function restoreBthwaniQueryClient(
  client: QueryClient,
  storageKey: string,
  storage: BthwaniCacheStore = bthwaniCacheStorage,
): Promise<void> {
  try {
    const raw = await storage.getItem(storageKey);
    if (!raw) return;
    try {
      const envelope: unknown = JSON.parse(raw);
      if (!isEnvelope(envelope) || Date.now() - envelope.persistedAt > MAX_CACHE_AGE_MS) {
        await storage.removeItem(storageKey);
        return;
      }
      const persistedQueries = envelope.clientState.queries.filter((query) =>
        isPersistableQueryKey(query.queryKey),
      );
      hydrate(client, { ...envelope.clientState, queries: persistedQueries });
    } catch {
      await storage.removeItem(storageKey);
    }
  } catch {
    // Storage unavailable (e.g. native module not linked); continue without cached state.
  }
}

export function persistBthwaniQueryClient(
  client: QueryClient,
  storageKey: string,
  storage: BthwaniCacheStore = bthwaniCacheStorage,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = client.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const envelope: PersistedQueryEnvelope = {
        schemaVersion: CACHE_SCHEMA_VERSION,
        persistedAt: Date.now(),
        clientState: dehydrate(client, {
          // Deny-by-default: unprefixed feature keys (e.g. wlt refund data)
          // are structurally excluded from disk persistence.
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && isPersistableQueryKey(query.queryKey),
        }),
      };
      void storage.setItem(storageKey, JSON.stringify(envelope));
    }, 250);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}

export async function clearBthwaniQueryClient(
  client: QueryClient,
  storageKey: string,
  storage: BthwaniCacheStore = bthwaniCacheStorage,
): Promise<void> {
  client.clear();
  await storage.removeItem(storageKey);
}
