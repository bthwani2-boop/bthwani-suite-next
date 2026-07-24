import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";

const CACHE_SCHEMA_VERSION = 2;
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

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
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const envelope: unknown = JSON.parse(raw);
      if (!isEnvelope(envelope) || Date.now() - envelope.persistedAt > MAX_CACHE_AGE_MS) {
        await AsyncStorage.removeItem(storageKey);
        return;
      }
      hydrate(client, envelope.clientState);
    } catch {
      await AsyncStorage.removeItem(storageKey);
    }
  } catch {
    // Storage unavailable (e.g. native module not linked); continue without cached state.
  }
}

export function persistBthwaniQueryClient(
  client: QueryClient,
  storageKey: string,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = client.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const envelope: PersistedQueryEnvelope = {
        schemaVersion: CACHE_SCHEMA_VERSION,
        persistedAt: Date.now(),
        clientState: dehydrate(client, {
          shouldDehydrateQuery: (query) => query.state.status === "success",
        }),
      };
      void AsyncStorage.setItem(storageKey, JSON.stringify(envelope));
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
): Promise<void> {
  client.clear();
  await AsyncStorage.removeItem(storageKey);
}
