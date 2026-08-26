import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";

const STORAGE_KEY = "@bthwani/field-payout-attempt:v2";
const STORAGE_KEY_LEGACY = "@bthwani/field-payout-attempt:v1";
const MAX_ATTEMPT_AGE_MS = 24 * 60 * 60 * 1000;
let fallbackSequence = 0;

type StoredPayoutAttempt = {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly createdAtMs: number;
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
  };
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
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const randomUUID = cryptoApi?.randomUUID?.();
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
      typeof parsed.signature !== "string"
      || typeof parsed.idempotencyKey !== "string"
      || typeof parsed.createdAtMs !== "number"
    ) {
      return null;
    }
    return parsed as StoredPayoutAttempt;
  } catch {
    return null;
  }
}

function payoutEntityId(actorId: string, amountMinorUnits: number, currency: string): string {
  return `${actorId}|${amountMinorUnits}|${currency.toUpperCase()}`;
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
  const entityId = payoutEntityId(normalizedActorId, amountMinorUnits, normalizedCurrency);
  const scope = await resolveMutationIdentityScope(normalizedActorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };

  const existingRaw = await bthwaniDurableStorage.getItem(STORAGE_KEY);
  if (existingRaw) {
    const existing = parseStoredAttempt(existingRaw);
    if (existing) {
      if (existing.scope.actorId !== scoped.actorId) {
        throw new MutationIdentityScopeError(
          "actor_mismatch",
          `field-payout attempt belongs to a different actor (${existing.scope.actorId}); refusing to reuse it for ${scoped.actorId}`,
        );
      }
      if (existing.scope.installationId !== scoped.installationId) {
        throw new MutationIdentityScopeError(
          "installation_mismatch",
          `field-payout attempt belongs to a different installation (${existing.scope.installationId}); refusing to reuse it for ${scoped.installationId}`,
        );
      }
      if (existing.scope.entityId !== entityId) {
        await bthwaniDurableStorage.removeItem(STORAGE_KEY);
      } else if (
        existing.signature === signature
        && Date.now() - existing.createdAtMs <= MAX_ATTEMPT_AGE_MS
      ) {
        return existing;
      } else {
        await bthwaniDurableStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  const legacy = await bthwaniDurableStorage.getItem(STORAGE_KEY_LEGACY);
  if (legacy) {
    await bthwaniDurableStorage.setItem(`${STORAGE_KEY_LEGACY}:quarantine:${Date.now()}`, legacy);
    await bthwaniDurableStorage.removeItem(STORAGE_KEY_LEGACY);
  }

  const attempt: StoredPayoutAttempt = {
    signature,
    idempotencyKey: buildAttemptKey(signature),
    createdAtMs: Date.now(),
    scope: scoped,
  };
  await bthwaniDurableStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  return attempt;
}

export async function clearFieldPayoutAttempt(): Promise<void> {
  await bthwaniDurableStorage.removeItem(STORAGE_KEY);
}
