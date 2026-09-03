import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  MutationIdentityPersistenceError,
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";
import type { DshCreateIntentInput } from "./checkout.types";
import { secureRandomId } from "../../shared/_kernel/secure-random.ts";

const STORAGE_PREFIX = "@bthwani/checkout-create-attempt:v3/";

function storageKey(scope: { readonly actorId: string; readonly installationId: string; readonly entityId: string }, fingerprint: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(scope.actorId)}/${encodeURIComponent(scope.installationId)}/${encodeURIComponent(scope.entityId)}/${encodeURIComponent(fingerprint)}`;
}

export type DshCheckoutMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

type StoredCheckoutAttempt = {
  readonly fingerprint: string;
  readonly context: DshCheckoutMutationContext;
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
  };
};

function uniquePart(): string {
  return secureRandomId();
}

export function fingerprintCheckoutInput(input: DshCreateIntentInput): string {
  return JSON.stringify({
    cartId: input.cartId.trim(),
    storeId: input.storeId.trim(),
    fulfillmentMode: input.fulfillmentMode ?? "bthwani_delivery",
    paymentMethod: input.paymentMethod ?? "cod",
    deliveryAddressId: input.deliveryAddressId?.trim() ?? "",
    note: input.note?.trim() ?? "",
    couponCode: input.couponCode?.trim().toUpperCase() ?? "",
  });
}

function newAttempt(fingerprint: string, scope: { readonly actorId: string; readonly installationId: string; readonly entityId: string }): StoredCheckoutAttempt {
  const part = uniquePart();
  return {
    fingerprint,
    scope,
    context: {
      idempotencyKey: `checkout-create:${part}`,
      correlationId: `checkout:${part}`,
    },
  };
}

function isStoredAttempt(value: unknown): value is StoredCheckoutAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCheckoutAttempt>;
  return typeof candidate.fingerprint === "string"
    && typeof candidate.context?.idempotencyKey === "string"
    && candidate.context.idempotencyKey.length >= 16
    && typeof candidate.context?.correlationId === "string"
    && candidate.context.correlationId.length > 0
    && typeof candidate.scope?.actorId === "string"
    && candidate.scope.actorId.length > 0
    && typeof candidate.scope?.installationId === "string"
    && candidate.scope.installationId.length > 0
    && typeof candidate.scope?.entityId === "string";
}

export async function getOrCreateCheckoutAttempt(
  actorId: string,
  input: DshCreateIntentInput,
): Promise<StoredCheckoutAttempt> {
  const fingerprint = fingerprintCheckoutInput(input);
  const entityId = fingerprint.slice(0, 32);
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  const attemptKey = storageKey(scoped, fingerprint);

  const raw = await bthwaniDurableStorage.getItem(attemptKey);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredAttempt(parsed) && parsed.fingerprint === fingerprint) {
        if (parsed.scope.actorId !== scoped.actorId) {
          throw new MutationIdentityScopeError(
            "actor_mismatch",
            `checkout attempt belongs to a different actor (${parsed.scope.actorId}); refusing to reuse it for ${scoped.actorId}`,
          );
        }
        if (parsed.scope.installationId !== scoped.installationId) {
          throw new MutationIdentityScopeError(
            "installation_mismatch",
            `checkout attempt belongs to a different installation (${parsed.scope.installationId}); refusing to reuse it for ${scoped.installationId}`,
          );
        }
        if (parsed.scope.entityId !== scoped.entityId) {
          throw new MutationIdentityPersistenceError(
            attemptKey,
            new Error("stored entityId does not match the current checkout draft"),
          );
        }
        return parsed;
      }
    } catch (cause) {
      if (cause instanceof MutationIdentityPersistenceError) throw cause;
      if (cause instanceof MutationIdentityScopeError) throw cause;
      await bthwaniDurableStorage.setItem(`${attemptKey}:quarantine:${Date.now()}`, raw);
      await bthwaniDurableStorage.removeItem(attemptKey);
    }
  }

  const attempt = newAttempt(fingerprint, scoped);
  await bthwaniDurableStorage.setItem(attemptKey, JSON.stringify(attempt));
  return attempt;
}

export async function clearCheckoutAttempt(actorId: string, fingerprint: string): Promise<void> {
  const normalizedFingerprint = fingerprint.trim();
  if (!normalizedFingerprint) return;
  const entityId = normalizedFingerprint.slice(0, 32);
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  const key = storageKey({ actorId: scope.actorId, installationId: scope.installationId, entityId }, normalizedFingerprint);
  const raw = await bthwaniDurableStorage.getItem(key);
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isStoredAttempt(parsed) && parsed.fingerprint === normalizedFingerprint) {
      await bthwaniDurableStorage.removeItem(key);
    }
  } catch {
    // Never delete a different entity's unresolved attempt on corrupt data.
  }
}
