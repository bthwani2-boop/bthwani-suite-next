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

const PREFIX = "@bthwani/dsh/subscription-mutation/v2/";
const PREFIX_LEGACY = "@bthwani/dsh/subscription-mutation/v1/";
const LATEST_PURCHASE_KEY = `${PREFIX}purchase/latest`;

function nextPart(): string {
  return secureRandomId();
}

function storageKey(operation: SubscriptionMutationOperation, subject: string): string {
  return `${PREFIX}${operation}/${subject}`;
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

export async function getLatestSubscriptionPurchaseAttempt(): Promise<StoredAttempt | null> {
  return parseStored(await bthwaniDurableStorage.getItem(LATEST_PURCHASE_KEY));
}

export async function getOrCreateSubscriptionMutationAttempt(input: {
  readonly operation: SubscriptionMutationOperation;
  readonly subject: string;
  readonly fingerprint: string;
  readonly paymentMethod?: SubscriptionPaymentMethod;
}): Promise<StoredAttempt> {
  const key = storageKey(input.operation, input.subject);
  const entityId = `${input.operation}:${input.subject}`;
  const scope = await resolveMutationIdentityScope("", { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };

  const existingRaw = await bthwaniDurableStorage.getItem(key);
  if (existingRaw) {
    const existing = parseStored(existingRaw);
    if (existing?.fingerprint === input.fingerprint) {
      if (existing.scope.actorId !== scoped.actorId) {
        throw new MutationIdentityScopeError(
          "actor_mismatch",
          `subscription attempt belongs to a different actor (${existing.scope.actorId}); refusing to reuse it for ${scoped.actorId}`,
        );
      }
      if (existing.scope.installationId !== scoped.installationId) {
        throw new MutationIdentityScopeError(
          "installation_mismatch",
          `subscription attempt belongs to a different installation (${existing.scope.installationId}); refusing to reuse it for ${scoped.installationId}`,
        );
      }
      if (existing.scope.entityId !== entityId) {
        await bthwaniDurableStorage.removeItem(key);
      } else {
        return existing;
      }
    }
  }

  const part = nextPart();
  const created: StoredAttempt = {
    fingerprint: input.fingerprint,
    operation: input.operation,
    subject: input.subject,
    ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
    scope: scoped,
    context: {
      idempotencyKey: `subscription:${input.operation}:${part}`,
      correlationId: `subscription:${input.operation}:${part}`,
    },
  };
  const encoded = JSON.stringify(created);
  await bthwaniDurableStorage.setItem(key, encoded);
  if (input.operation === "purchase") await bthwaniDurableStorage.setItem(LATEST_PURCHASE_KEY, encoded);
  return created;
}

export async function clearSubscriptionMutationAttempt(input: {
  readonly operation: SubscriptionMutationOperation;
  readonly subject: string;
  readonly fingerprint: string;
}): Promise<void> {
  const key = storageKey(input.operation, input.subject);
  const existing = parseStored(await bthwaniDurableStorage.getItem(key));
  if (!existing || existing.fingerprint !== input.fingerprint) return;
  await bthwaniDurableStorage.removeItem(key);
  if (input.operation === "purchase") {
    const latest = parseStored(await bthwaniDurableStorage.getItem(LATEST_PURCHASE_KEY));
    if (latest?.fingerprint === input.fingerprint) {
      await bthwaniDurableStorage.removeItem(LATEST_PURCHASE_KEY);
    }
  }
}

export async function clearSubscriptionMutationAttempts(): Promise<void> {
  const keys = (await bthwaniDurableStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
  for (const key of keys) {
    await bthwaniDurableStorage.removeItem(key);
  }
  for (const key of (await bthwaniDurableStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX_LEGACY))) {
    const raw = await bthwaniDurableStorage.getItem(key);
    if (!raw) continue;
    const quarantineKey = `${key}:quarantine:${Date.now()}`;
    await bthwaniDurableStorage.setItem(quarantineKey, raw);
    await bthwaniDurableStorage.removeItem(key);
  }
}
