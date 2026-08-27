import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";
import type { DshAddressMutationContext, DshClientAddressDraft } from "./client-address.types";
import { secureRandomId } from "../_kernel/secure-random.ts";

const STORAGE_PREFIX = "@bthwani/client-address-create-attempt:v3/";
const STORAGE_KEY_LEGACY = "@bthwani/client-address-create-attempt:v1";

function storageKey(scope: { readonly actorId: string; readonly installationId: string; readonly entityId: string }, fingerprint: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(scope.actorId)}/${encodeURIComponent(scope.installationId)}/${encodeURIComponent(scope.entityId)}/${encodeURIComponent(fingerprint)}`;
}

type StoredAttempt = {
  readonly fingerprint: string;
  readonly context: DshAddressMutationContext;
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
  };
};

function uniquePart(): string {
  return secureRandomId();
}

export function fingerprintClientAddressDraft(input: DshClientAddressDraft): string {
  return JSON.stringify({
    label: input.label.trim(),
    recipientName: input.recipientName.trim(),
    phoneE164: input.phoneE164.trim(),
    addressLine: input.addressLine.trim(),
    serviceAreaCode: input.serviceAreaCode.trim(),
    building: input.building?.trim() ?? "",
    floor: input.floor?.trim() ?? "",
    unit: input.unit?.trim() ?? "",
    deliveryInstructions: input.deliveryInstructions?.trim() ?? "",
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    makeDefault: input.makeDefault === true,
  });
}

function newAttempt(
  fingerprint: string,
  scope: { readonly actorId: string; readonly installationId: string; readonly entityId: string },
): StoredAttempt {
  const part = uniquePart();
  return {
    fingerprint,
    scope,
    context: {
      idempotencyKey: `address-create:${part}`,
      correlationId: `client-address:${part}`,
    },
  };
}

function isStoredAttempt(value: unknown): value is StoredAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredAttempt>;
  return typeof candidate.fingerprint === "string"
    && typeof candidate.context?.idempotencyKey === "string"
    && candidate.context.idempotencyKey.length >= 8
    && typeof candidate.context?.correlationId === "string"
    && candidate.context.correlationId.length > 0
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

export async function getOrCreateClientAddressAttempt(
  input: DshClientAddressDraft,
): Promise<StoredAttempt> {
  const fingerprint = fingerprintClientAddressDraft(input);
  const entityId = fingerprint.slice(0, 32);
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
            `client-address attempt belongs to a different actor (${parsed.scope.actorId}); refusing to reuse it for ${scoped.actorId}`,
          );
        }
        if (parsed.scope.installationId !== scoped.installationId) {
          throw new MutationIdentityScopeError(
            "installation_mismatch",
            `client-address attempt belongs to a different installation (${parsed.scope.installationId}); refusing to reuse it for ${scoped.installationId}`,
          );
        }
        if (parsed.scope.entityId !== scoped.entityId) {
          await bthwaniDurableStorage.removeItem(attemptKey);
        } else {
          return parsed;
        }
      }
    } catch (cause) {
      if (cause instanceof MutationIdentityScopeError) throw cause;
      await quarantineLegacy();
    }
  }

  const attempt = newAttempt(fingerprint, scoped);
  await bthwaniDurableStorage.setItem(attemptKey, JSON.stringify(attempt));
  return attempt;
}

export async function clearClientAddressAttempt(fingerprint: string): Promise<void> {
  const normalizedFingerprint = fingerprint.trim();
  if (!normalizedFingerprint) return;
  const entityId = normalizedFingerprint.slice(0, 32);
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
