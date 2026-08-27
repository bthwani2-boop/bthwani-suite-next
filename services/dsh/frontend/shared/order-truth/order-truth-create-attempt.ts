import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  MutationIdentityPersistenceError,
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";
import type {
  CreateOrderTruthInput,
  OrderTruthMutationContext,
} from "./order-truth.types";
import { secureRandomId } from "../_kernel/secure-random.ts";

const STORAGE_PREFIX = "@bthwani/order-truth-create-attempt:v3/";
const STORAGE_KEY_LEGACY = "@bthwani/order-truth-create-attempt:v1";

function storageKey(scope: { readonly actorId: string; readonly installationId: string; readonly entityId: string }, fingerprint: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(scope.actorId)}/${encodeURIComponent(scope.installationId)}/${encodeURIComponent(scope.entityId)}/${encodeURIComponent(fingerprint)}`;
}

type StoredOrderTruthAttempt = {
  readonly fingerprint: string;
  readonly context: OrderTruthMutationContext;
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
  };
};

function uniquePart(): string {
  return secureRandomId();
}

export function fingerprintOrderTruthInput(input: CreateOrderTruthInput): string {
  return JSON.stringify({ checkoutIntentId: input.checkoutIntentId.trim() });
}

function newAttempt(
  fingerprint: string,
  scope: { readonly actorId: string; readonly installationId: string; readonly entityId: string },
): StoredOrderTruthAttempt {
  const idempotencyPart = uniquePart();
  const correlationPart = uniquePart();
  return {
    fingerprint,
    scope,
    context: {
      idempotencyKey: `order-create-key:${idempotencyPart}`,
      correlationId: `order-create-correlation:${correlationPart}`,
    },
  };
}

function isStoredAttempt(value: unknown): value is StoredOrderTruthAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredOrderTruthAttempt>;
  return typeof candidate.fingerprint === "string"
    && typeof candidate.context?.idempotencyKey === "string"
    && candidate.context.idempotencyKey.length >= 16
    && typeof candidate.context?.correlationId === "string"
    && candidate.context.correlationId.length >= 8
    && candidate.context.correlationId !== candidate.context.idempotencyKey
    && typeof candidate.scope?.actorId === "string"
    && candidate.scope.actorId.length > 0
    && typeof candidate.scope?.installationId === "string"
    && candidate.scope.installationId.length > 0
    && typeof candidate.scope?.entityId === "string";
}

async function quarantineLegacy(): Promise<void> {
  const raw = await bthwaniDurableStorage.getItem(STORAGE_KEY_LEGACY);
  if (!raw) return;
  const quarantineKey = `${STORAGE_KEY_LEGACY}:corrupt:${Date.now()}`;
  await bthwaniDurableStorage.setItem(quarantineKey, raw);
  await bthwaniDurableStorage.removeItem(STORAGE_KEY_LEGACY);
}

export async function getOrCreateOrderTruthAttempt(
  input: CreateOrderTruthInput,
): Promise<StoredOrderTruthAttempt> {
  const fingerprint = fingerprintOrderTruthInput(input);
  const entityId = input.checkoutIntentId.trim();
  const scope = await resolveMutationIdentityScope("", { entityId });
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
            `order-truth attempt belongs to a different actor (${parsed.scope.actorId}); refusing to reuse it for ${scoped.actorId}`,
          );
        }
        if (parsed.scope.installationId !== scoped.installationId) {
          throw new MutationIdentityScopeError(
            "installation_mismatch",
            `order-truth attempt belongs to a different installation (${parsed.scope.installationId}); refusing to reuse it for ${scoped.installationId}`,
          );
        }
        if (parsed.scope.entityId !== scoped.entityId) {
          throw new MutationIdentityPersistenceError(
            attemptKey,
            new Error("stored entityId does not match the current checkout intent"),
          );
        }
        return parsed;
      }
    } catch (cause) {
      if (cause instanceof MutationIdentityPersistenceError) throw cause;
      if (cause instanceof MutationIdentityScopeError) throw cause;
      await quarantineLegacy();
    }
  }

  const attempt = newAttempt(fingerprint, scoped);
  await bthwaniDurableStorage.setItem(attemptKey, JSON.stringify(attempt));
  return attempt;
}

export async function clearOrderTruthAttempt(fingerprint: string): Promise<void> {
  const normalizedFingerprint = fingerprint.trim();
  if (!normalizedFingerprint) return;
  const entityId = normalizedFingerprint.startsWith('{')
    ? (() => { try { return (JSON.parse(normalizedFingerprint) as { checkoutIntentId?: string }).checkoutIntentId?.trim() ?? ''; } catch { return ''; } })()
    : normalizedFingerprint;
  if (!entityId) return;
  const scope = await resolveMutationIdentityScope("", { entityId });
  const key = storageKey({ actorId: scope.actorId, installationId: scope.installationId, entityId }, normalizedFingerprint);
  const raw = await bthwaniDurableStorage.getItem(key);
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isStoredAttempt(parsed) && parsed.fingerprint === normalizedFingerprint) {
      await bthwaniDurableStorage.removeItem(key);
    }
  } catch {
    // Preserve unresolved attempts when the entry is corrupt.
  }
}
