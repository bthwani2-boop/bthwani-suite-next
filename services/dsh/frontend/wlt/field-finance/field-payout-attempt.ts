import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../../shared/_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../../shared/_kernel/durable-mutation-attempt-registry.ts";

const OPERATION = "field-payout-create";
const STORAGE_KEY_LEGACY = "@bthwani/field-payout-attempt:v1";
const MAX_ATTEMPT_AGE_MS = 24 * 60 * 60 * 1000;
let fallbackSequence = 0;

type StoredPayoutAttempt = DurableMutationAttemptEnvelope<{ readonly idempotencyKey: string }> & {
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
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const randomUUID = cryptoApi?.randomUUID?.();
  if (randomUUID) return `field-payout:${randomUUID}`;
  fallbackSequence += 1;
  const timestamp = Date.now();
  return `field-payout:${timestamp.toString(36)}:${fallbackSequence.toString(36)}:${stableHash(`${signature}|${timestamp}|${fallbackSequence}`)}`;
}

function parseStoredAttempt(value: unknown): value is StoredPayoutAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredPayoutAttempt>;
  return typeof parsed.signature === "string"
    && typeof parsed.fingerprint === "string"
    && typeof parsed.context?.idempotencyKey === "string"
    && typeof parsed.createdAtMs === "number"
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string";
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
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = buildAttemptKey(signature);
      return {
        signature,
        fingerprint: signature,
        idempotencyKey,
        createdAtMs: Date.now(),
        scope: scoped,
        context: { idempotencyKey },
      };
    },
    parse: parseStoredAttempt,
    legacyKeys: [STORAGE_KEY_LEGACY],
    legacyPrefixes: ["@bthwani/field-payout-attempt:v2", "@bthwani/field-payout-attempt:v3/"],
  });
}

export async function clearFieldPayoutAttempt(
  actorId: string,
  amountMinorUnits: number,
  currency: string,
  signature: string,
): Promise<void> {
  const normalizedActorId = actorId.trim();
  const normalizedCurrency = currency.trim().toUpperCase();
  const normalizedSignature = signature.trim();
  if (!normalizedActorId || !normalizedCurrency || !normalizedSignature) return;
  const entityId = payoutEntityId(normalizedActorId, amountMinorUnits, normalizedCurrency);
  const scope = await resolveMutationIdentityScope(normalizedActorId, { entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: scope.actorId, installationId: scope.installationId, entityId },
    normalizedSignature,
    parseStoredAttempt,
  );
}
