/**
 * Sensitive foreground-location storage.
 *
 * Browser storage is encrypted before it reaches IndexedDB. Native shells
 * install a platform secure-store adapter at composition time. There is no
 * cleartext web-storage fallback: if the browser cannot provide IndexedDB
 * and Web Crypto, location durability fails closed.
 */

export type DshCaptainLocationStorageAdapter = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
  readonly getAllKeys: () => Promise<readonly string[]>;
};

const DATABASE_NAME = "bthwani-sensitive-location";
const DATABASE_VERSION = 1;
const ENTRY_STORE = "entries";
const KEY_STORE = "keys";
const KEY_ID = "foreground-location-aes-gcm-v1";
const LEGACY_PREFIX = "@bthwani/captain-foreground-location:v1/";

type StoredEntry = {
  readonly version: 1;
  readonly iv: readonly number[];
  readonly ciphertext: readonly number[];
};

function requireBrowserSecurityPrimitives(): void {
  if (typeof indexedDB === "undefined" || !globalThis.crypto?.subtle) {
    throw new Error("SECURE_LOCATION_STORAGE_UNAVAILABLE");
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  requireBrowserSecurityPrimitives();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ENTRY_STORE)) database.createObjectStore(ENTRY_STORE);
      if (!database.objectStoreNames.contains(KEY_STORE)) database.createObjectStore(KEY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked"));
  });
}

async function readKey(database: IDBDatabase): Promise<CryptoKey | null> {
  const transaction = database.transaction(KEY_STORE, "readonly");
  const value = await requestResult(transaction.objectStore(KEY_STORE).get(KEY_ID));
  return typeof CryptoKey !== "undefined" && value instanceof CryptoKey ? value : null;
}

async function getEncryptionKey(database: IDBDatabase): Promise<CryptoKey> {
  const existing = await readKey(database);
  if (existing) return existing;

  const generated = await globalThis.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const transaction = database.transaction(KEY_STORE, "readwrite");
  transaction.objectStore(KEY_STORE).add(generated, KEY_ID);
  try {
    await transactionResult(transaction);
    return generated;
  } catch (error) {
    // A second tab may have won key creation. Re-read the authoritative key
    // before treating a uniqueness race as a storage failure.
    const winner = await readKey(database);
    if (winner) return winner;
    throw error;
  }
}

async function encrypt(database: IDBDatabase, value: string): Promise<StoredEntry> {
  const key = await getEncryptionKey(database);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );
  return {
    version: 1,
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext)),
  };
}

async function decrypt(database: IDBDatabase, entry: StoredEntry): Promise<string> {
  if (entry.version !== 1 || !Array.isArray(entry.iv) || !Array.isArray(entry.ciphertext)) {
    throw new Error("SECURE_LOCATION_STORAGE_CORRUPT");
  }
  const key = await getEncryptionKey(database);
  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(entry.iv) },
    key,
    new Uint8Array(entry.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

async function putEncrypted(database: IDBDatabase, key: string, value: string): Promise<void> {
  const entry = await encrypt(database, value);
  const transaction = database.transaction(ENTRY_STORE, "readwrite");
  transaction.objectStore(ENTRY_STORE).put(entry, key);
  await transactionResult(transaction);
}

async function migrateLegacyBrowserEntries(database: IDBDatabase): Promise<void> {
  if (typeof window === "undefined") return;
  const legacyKeys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(LEGACY_PREFIX)) legacyKeys.push(key);
  }
  for (const key of legacyKeys) {
    const value = window.localStorage.getItem(key);
    if (value !== null) {
      const existing = await requestResult(database.transaction(ENTRY_STORE, "readonly").objectStore(ENTRY_STORE).get(key));
      if (!existing) await putEncrypted(database, key, value);
    }
    window.localStorage.removeItem(key);
  }
}

let databasePromise: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase().then(async (opened) => {
      await migrateLegacyBrowserEntries(opened);
      return opened;
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

const browserEncryptedLocationStorage: DshCaptainLocationStorageAdapter = {
  async getItem(key) {
    const opened = await database();
    const stored = await requestResult(opened.transaction(ENTRY_STORE, "readonly").objectStore(ENTRY_STORE).get(key));
    return stored ? decrypt(opened, stored as StoredEntry) : null;
  },
  async setItem(key, value) {
    await putEncrypted(await database(), key, value);
  },
  async removeItem(key) {
    const transaction = (await database()).transaction(ENTRY_STORE, "readwrite");
    transaction.objectStore(ENTRY_STORE).delete(key);
    await transactionResult(transaction);
  },
  async getAllKeys() {
    const opened = await database();
    const keys = await requestResult(opened.transaction(ENTRY_STORE, "readonly").objectStore(ENTRY_STORE).getAllKeys());
    return keys.filter((key): key is string => typeof key === "string");
  },
};

let configuredLocationStorage: DshCaptainLocationStorageAdapter | null = null;

export function configureDshCaptainLocationStorage(adapter: DshCaptainLocationStorageAdapter): void {
  configuredLocationStorage = adapter;
}

export function resolveDshCaptainLocationStorage(): DshCaptainLocationStorageAdapter {
  return configuredLocationStorage ?? browserEncryptedLocationStorage;
}
