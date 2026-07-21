import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@bthwani/field-payout-attempt:v1";
const MAX_ATTEMPT_AGE_MS = 24 * 60 * 60 * 1000;
let fallbackSequence = 0;

type StoredPayoutAttempt = {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly createdAtMs: number;
};

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function buildAttemptKey(signature: string): string {
  const randomUUID = globalThis.crypto?.randomUUID?.();
  if (randomUUID) return `field-payout:${randomUUID}`;
  fallbackSequence += 1;
  const timestamp = Date.now();
  return `field-payout:${timestamp.toString(36)}:${fallbackSequence.toString(36)}:${stableHash(`${signature}|${timestamp}|${fallbackSequence}`)}`;
}

function parseStoredAttempt(raw: string | null): StoredPayoutAttempt | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPayoutAttempt>;
    if (
      typeof parsed.signature !== "string" ||
      typeof parsed.idempotencyKey !== "string" ||
      typeof parsed.createdAtMs !== "number"
    ) {
      return null;
    }
    return parsed as StoredPayoutAttempt;
  } catch {
    return null;
  }
}

export async function getOrCreateFieldPayoutAttempt(
  actorId: string,
  amountMinorUnits: number,
  currency: string,
): Promise<StoredPayoutAttempt> {
  const normalizedActorId = actorId.trim();
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!normalizedActorId) throw new Error("field payout actor id is required");
  if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits <= 0) {
    throw new Error("field payout amount must be a positive integer in minor units");
  }
  if (!normalizedCurrency) throw new Error("field payout currency is required");

  const signature = `${normalizedActorId}|${amountMinorUnits}|${normalizedCurrency}`;
  const existing = parseStoredAttempt(await AsyncStorage.getItem(STORAGE_KEY));
  const now = Date.now();
  if (
    existing &&
    existing.signature === signature &&
    now - existing.createdAtMs <= MAX_ATTEMPT_AGE_MS
  ) {
    return existing;
  }

  const attempt: StoredPayoutAttempt = {
    signature,
    idempotencyKey: buildAttemptKey(signature),
    createdAtMs: now,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  return attempt;
}

export async function clearFieldPayoutAttempt(idempotencyKey: string): Promise<void> {
  const existing = parseStoredAttempt(await AsyncStorage.getItem(STORAGE_KEY));
  if (existing?.idempotencyKey === idempotencyKey) {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
