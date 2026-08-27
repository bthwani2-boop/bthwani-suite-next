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

function actorKeyPrefix(scope: { readonly actorId: string; readonly installationId: string }): string {
  return `${PREFIX}${encode(scope.actorId)}/${encode(scope.installationId)}/`;
}

function parseStored(raw: string | null): StoredAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredAttempt>;
    if (
      typeof value.fingerprint === "string"
      && typeof value.operation === "string"
      && typeof value.subject === "string"
      && typeof value.context?.idempotencyKey === "string"
      && typeof value.context?.correlationId === "string"
      && typeof value.scope?.actorId === "string"
      && typeof value.scope?.installationId === "string"
      && typeof value.scope?.entityId === "string"
    ) {
      return value as StoredAttempt;
    }
  } catch {
    return null;
  }
  return null;
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
  return parseStored(await bthwaniDurableStorage.getItem(latestPurchaseKey(scope)));
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
  const existingRaw = await bthwaniDurableStorage.getItem(key);
  if (existingRaw) {
    const existing = parseStored(existingRaw);
    if (existing?.fingerprint === input.fingerprint) {
      if (existing.scope.actorId !== scope.actorId) {
        throw new MutationIdentityScopeError(
          "actor_mismatch",
          `subscription attempt belongs to a different actor (${existing.scope.actorId}); refusing to reuse it for ${scope.actorId}`,
        );
      }
      if (existing.scope.installationId !== scope.installationId) {
        throw new MutationIdentityScopeError(
          "installation_mismatch",
          `subscription attempt belongs to a different installation (${existing.scope.installationId}); refusing to reuse it for ${scope.installationId}`,
        );
      }
      if (existing.scope.entityId === entityId) return existing;
      await bthwaniDurableStorage.removeItem(key);
    }
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
  const existing = parseStored(await bthwaniDurableStorage.getItem(key));
  if (!existing || existing.fingerprint !== input.fingerprint) return;
  await bthwaniDurableStorage.removeItem(key);
  if (input.operation === "purchase") {
    const latestKey = latestPurchaseKey(scope);
    const latest = parseStored(await bthwaniDurableStorage.getItem(latestKey));
    if (latest?.fingerprint === input.fingerprint) await bthwaniDurableStorage.removeItem(latestKey);
  }
}

export async function clearSubscriptionMutationAttempts(actorId: string): Promise<void> {
  const scope = await resolveScope(actorId, "subscription-mutation-cleanup");
  const prefix = actorKeyPrefix(scope);
  const keys = (await bthwaniDurableStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
  for (const key of keys) await bthwaniDurableStorage.removeItem(key);
}
