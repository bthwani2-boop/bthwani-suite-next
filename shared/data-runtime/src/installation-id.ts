/**
 * Bthwani installation identity.
 *
 * Each app installation gets a stable, durable id that scopes every
 * mutation identity, every field-offline operation, and every actor
 * binding. The id is created on first read and persisted in the
 * durable store so it survives reload, app restart, and the identity
 * session lifecycle.
 *
 * Different installations of the same app on the same device do not
 * share the id, and the id is not derived from sessionStorage or
 * any cache that can be wiped independently of the durable store.
 */

import { bthwaniDurableStorage } from "./storage-adapter.ts";

const INSTALLATION_KEY = "@bthwani/installation-id/v1";
const MIN_INSTALLATION_ID_LENGTH = 16;

let cachedInstallationId: string | undefined;

function generateInstallationId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (buffer: Uint8Array) => Uint8Array } }).crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  let hex = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index] ?? 0;
    hex += byte.toString(16).padStart(2, "0");
  }
  return `bthwani-install-${hex}`;
}

export async function getBthwaniInstallationId(): Promise<string> {
  if (cachedInstallationId) return cachedInstallationId;
  const existing = await bthwaniDurableStorage.getItem(INSTALLATION_KEY);
  if (existing && existing.length >= MIN_INSTALLATION_ID_LENGTH) {
    cachedInstallationId = existing;
    return existing;
  }
  const created = generateInstallationId();
  await bthwaniDurableStorage.setItem(INSTALLATION_KEY, created);
  cachedInstallationId = created;
  return created;
}

export function resetBthwaniInstallationIdForTests(): void {
  cachedInstallationId = undefined;
}
