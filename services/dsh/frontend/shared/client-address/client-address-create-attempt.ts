import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DshAddressMutationContext, DshClientAddressDraft } from "./client-address.types";
import { secureRandomId } from "../_kernel/secure-random.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";

const OPERATION = "client-address-create";
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

export async function getOrCreateClientAddressAttempt(
  input: DshClientAddressDraft,
): Promise<StoredAttempt> {
  const fingerprint = fingerprintClientAddressDraft(input);
  const entityId = fingerprint.slice(0, 32);
  const scope = await resolveMutationIdentityScope("", { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint,
    create: () => newAttempt(fingerprint, scoped),
    parse: isStoredAttempt,
    legacyKeys: [STORAGE_KEY_LEGACY],
    legacyPrefixes: ["@bthwani/client-address-create-attempt:v2", "@bthwani/client-address-create-attempt:v3/"],
  });
}

export async function clearClientAddressAttempt(fingerprint: string): Promise<void> {
  const normalizedFingerprint = fingerprint.trim();
  if (!normalizedFingerprint) return;
  const entityId = normalizedFingerprint.slice(0, 32);
  const scope = await resolveMutationIdentityScope("", { entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: scope.actorId, installationId: scope.installationId, entityId },
    normalizedFingerprint,
    isStoredAttempt,
  );
}
