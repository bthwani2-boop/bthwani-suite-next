import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";

import type { SubscriptionPaymentMethod } from "./subscription-lifecycle.types";
import { secureRandomId } from "../_kernel/secure-random.ts";

export type SubscriptionMutationOperation = "purchase" | "activate" | "renew" | "cancel";

export type SubscriptionMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export class SubscriptionMutationAttemptConflictError extends Error {
  readonly code = "SUBSCRIPTION_MUTATION_ATTEMPT_CONFLICT";

  constructor(operation: SubscriptionMutationOperation, subject: string) {
    super(`an unresolved ${operation} attempt already exists for ${subject}`);
    this.name = "SubscriptionMutationAttemptConflictError";
  }
}

type StoredAttempt = {
  readonly fingerprint: string;
  readonly context: SubscriptionMutationContext;
  readonly operation: SubscriptionMutationOperation;
  readonly subject: string;
  readonly paymentMethod?: SubscriptionPaymentMethod;
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
  };
};

const PREFIX = "@bthwani/dsh/subscription-mutation/v3/";
const LATEST_PURCHASE_SUFFIX = "purchase/latest";

function encode(value: string): string {
  return encodeURIComponent(value.trim());
}

function nextPart(): string {
  return secureRandomId();
}

function storageKey(
  scope: StoredAttempt["scope"],
  operation: SubscriptionMutationOperation,
  subject: string,
): string {
  return `${PREFIX}${encode(scope.actorId)}/${encode(scope.installationId)}/${encode(operation)}/${encode(subject)}`;
}

function latestPurchaseKey(scope: StoredAttempt["scope"]): string {
  return `${PREFIX}${encode(scope.actorId)}/${encode(scope.installationId)}/${LATEST_PURCHASE_SUFFIX}`;
}

function parseStored(raw: string | null): StoredAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredAttempt>;
    const validOperation = value.operation === "purchase"
      || value.operation === "activate"
      || value.operation === "renew"
      || value.operation === "cancel";
    const validPaymentMethod = value.paymentMethod === undefined
      || value.paymentMethod === "official_wallet"
      || value.paymentMethod === "wallet"
      || value.paymentMethod === "mixed";
    if (
      typeof value.fingerprint === "string"
      && validOperation
      && typeof value.subject === "string"
      && typeof value.context?.idempotencyKey === "string"
      && typeof value.context?.correlationId === "string"
      && typeof value.scope?.actorId === "string"
      && typeof value.scope?.installationId === "string"
      && typeof value.scope?.entityId === "string"
      && validPaymentMethod
    ) {
      return value as StoredAttempt;
    }
  } catch {
    return null;
  }
  return null;
}

async function quarantineInvalidAttempt(key: string, raw: string): Promise<never> {
  await bthwaniDurableStorage.setItem(
    `${key}:quarantine:${Date.now()}-${secureRandomId()}`,
    raw,
  );
  await bthwaniDurableStorage.removeItem(key);
  throw new Error(`subscription mutation attempt is corrupt and was preserved for recovery: ${key}`);
}

async function readStoredAttempt(
  key: string,
  expectedScope: { readonly actorId: string; readonly installationId: string; readonly entityId?: string },
): Promise<StoredAttempt | null> {
  const raw = await bthwaniDurableStorage.getItem(key);
  if (!raw) return null;
  const parsed = parseStored(raw);
  if (
    !parsed
    || parsed.scope.actorId !== expectedScope.actorId
    || parsed.scope.installationId !== expectedScope.installationId
    || (expectedScope.entityId !== undefined && parsed.scope.entityId !== expectedScope.entityId)
  ) {
    return quarantineInvalidAttempt(key, raw);
  }
  return parsed;
}

function requireActorId(actorId: string): string {
  const normalized = actorId.trim();
  if (!normalized) throw new MutationIdentityScopeError("missing_actor", "subscription mutation actor id is required");
  return normalized;
}

async function resolveScope(actorId: string, entityId: string) {
  const normalizedActorId = requireActorId(actorId);
  const scope = await resolveMutationIdentityScope(normalizedActorId, { entityId });
  return { actorId: scope.actorId, installationId: scope.installationId, entityId };
}

export async function getLatestSubscriptionPurchaseAttempt(actorId: string): Promise<StoredAttempt | null> {
  const scope = await resolveScope(actorId, "subscription-purchase-latest");
  return readStoredAttempt(latestPurchaseKey(scope), {
    actorId: scope.actorId,
    installationId: scope.installationId,
  });
}

export async function getOrCreateSubscriptionMutationAttempt(input: {
  readonly actorId: string;
  readonly operation: SubscriptionMutationOperation;
  readonly subject: string;
  readonly fingerprint: string;
  readonly paymentMethod?: SubscriptionPaymentMethod;
}): Promise<StoredAttempt> {
  const entityId = `${input.operation}:${input.subject}`;
  const scope = await resolveScope(input.actorId, entityId);
  const key = storageKey(scope, input.operation, input.subject);
  const existing = await readStoredAttempt(key, scope);
  if (existing) {
    if (existing.fingerprint === input.fingerprint) return existing;
    throw new SubscriptionMutationAttemptConflictError(input.operation, input.subject);
  }

  const part = nextPart();
  const created: StoredAttempt = {
    fingerprint: input.fingerprint,
    operation: input.operation,
    subject: input.subject,
    ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
    scope,
    context: {
      idempotencyKey: `subscription:${input.operation}:${part}`,
      correlationId: `subscription:${input.operation}:${part}`,
    },
  };
  const encoded = JSON.stringify(created);
  await bthwaniDurableStorage.setItem(key, encoded);
  if (input.operation === "purchase") await bthwaniDurableStorage.setItem(latestPurchaseKey(scope), encoded);
  return created;
}

export async function clearSubscriptionMutationAttempt(input: {
  readonly actorId: string;
  readonly operation: SubscriptionMutationOperation;
  readonly subject: string;
  readonly fingerprint: string;
}): Promise<void> {
  const entityId = `${input.operation}:${input.subject}`;
  const scope = await resolveScope(input.actorId, entityId);
  const key = storageKey(scope, input.operation, input.subject);
  const existing = await readStoredAttempt(key, scope);
  if (!existing || existing.fingerprint !== input.fingerprint) return;
  await bthwaniDurableStorage.removeItem(key);
  if (input.operation === "purchase") {
    const latestKey = latestPurchaseKey(scope);
    const latest = await readStoredAttempt(latestKey, {
      actorId: scope.actorId,
      installationId: scope.installationId,
    });
    if (latest?.fingerprint === input.fingerprint) await bthwaniDurableStorage.removeItem(latestKey);
  }
}
