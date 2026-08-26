import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";
import type { DshAddressMutationContext, DshClientAddressDraft } from "./client-address.types";
import { secureRandomId } from "../_kernel/secure-random.ts";

const STORAGE_KEY = "@bthwani/client-address-create-attempt:v2";
const STORAGE_KEY_LEGACY = "@bthwani/client-address-create-attempt:v1";

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

  const raw = await bthwaniDurableStorage.getItem(STORAGE_KEY);
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
          await bthwaniDurableStorage.removeItem(STORAGE_KEY);
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
  await bthwaniDurableStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  return attempt;
}

export async function clearClientAddressAttempt(): Promise<void> {
  const raw = await bthwaniDurableStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isStoredAttempt(parsed)) {
      await bthwaniDurableStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    await bthwaniDurableStorage.removeItem(STORAGE_KEY);
  }
}
