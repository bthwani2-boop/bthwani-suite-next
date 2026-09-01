import type { BthwaniSensitiveStore } from "./sensitive-storage-adapter.ts";

const DATABASE_NAME = "bthwani-sensitive-storage";
const DATABASE_VERSION = 1;
const VALUES_STORE = "values";
const METADATA_STORE = "metadata";
const MASTER_KEY_ID = "master-key";

type StoredValue = {
  readonly key: string;
  readonly iv: ArrayBuffer;
  readonly ciphertext: ArrayBuffer;
};

type StoredMasterKey = {
  readonly id: string;
  readonly key: CryptoKey;
};

function assertAvailable(): void {
  if (typeof indexedDB === "undefined" || !globalThis.crypto?.subtle) {
    throw new Error("BTHWANI_SENSITIVE_BROWSER_STORAGE_UNAVAILABLE");
  }
}

function openDatabase(): Promise<IDBDatabase> {
  assertAvailable();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(VALUES_STORE)) {
        database.createObjectStore(VALUES_STORE, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        database.createObjectStore(METADATA_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("BTHWANI_SENSITIVE_BROWSER_DB_OPEN_FAILED"));
  });
}

function runRequest<T>(
  database: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("BTHWANI_SENSITIVE_BROWSER_REQUEST_FAILED"));
    transaction.onerror = () => reject(transaction.error ?? new Error("BTHWANI_SENSITIVE_BROWSER_TRANSACTION_FAILED"));
  });
}

let masterKeyPromise: Promise<CryptoKey> | null = null;

async function getMasterKey(): Promise<CryptoKey> {
  if (masterKeyPromise) return masterKeyPromise;
  masterKeyPromise = (async () => {
    const database = await openDatabase();
    try {
      const existing = await runRequest<StoredMasterKey | undefined>(
        database,
        METADATA_STORE,
        "readonly",
        (store) => store.get(MASTER_KEY_ID),
      );
      if (existing?.key) return existing.key;

      const generated = await globalThis.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
      await runRequest(
        database,
        METADATA_STORE,
        "readwrite",
        (store) => store.put({ id: MASTER_KEY_ID, key: generated }),
      );
      return generated;
    } finally {
      database.close();
    }
  })().catch((error) => {
    masterKeyPromise = null;
    throw error;
  });
  return masterKeyPromise;
}

async function getItem(key: string): Promise<string | null> {
  const database = await openDatabase();
  try {
    const stored = await runRequest<StoredValue | undefined>(
      database,
      VALUES_STORE,
      "readonly",
      (store) => store.get(key),
    );
    if (!stored) return null;
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(stored.iv) },
      await getMasterKey(),
      stored.ciphertext,
    );
    return new TextDecoder().decode(plaintext);
  } catch (error) {
    throw new Error(`BTHWANI_SENSITIVE_BROWSER_VALUE_READ_FAILED:${key}`, { cause: error });
  } finally {
    database.close();
  }
}

async function setItem(key: string, value: string): Promise<void> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getMasterKey(),
    new TextEncoder().encode(value),
  );
  const database = await openDatabase();
  try {
    await runRequest(
      database,
      VALUES_STORE,
      "readwrite",
      (store) => store.put({ key, iv: iv.buffer, ciphertext } satisfies StoredValue),
    );
  } finally {
    database.close();
  }
}

async function removeItem(key: string): Promise<void> {
  const database = await openDatabase();
  try {
    await runRequest(database, VALUES_STORE, "readwrite", (store) => store.delete(key));
  } finally {
    database.close();
  }
}

/** Browser protected provider: IndexedDB stores only AES-GCM ciphertext. */
export function createBthwaniBrowserSensitiveStorage(): BthwaniSensitiveStore {
  return { getItem, setItem, removeItem };
}
