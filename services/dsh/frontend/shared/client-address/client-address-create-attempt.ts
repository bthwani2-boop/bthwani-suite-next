import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DshAddressMutationContext, DshClientAddressDraft } from "./client-address.types";
import { secureRandomId } from "../_kernel/secure-random.ts";
import { sha256Hex } from "../field-readiness/field-intent-identity.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";

const OPERATION = "client-address-create";

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
  const canonicalDraft = JSON.stringify({
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
  return `sha256:${sha256Hex(canonicalDraft)}`;
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
  actorId: string,
  input: DshClientAddressDraft,
): Promise<StoredAttempt> {
  const fingerprint = fingerprintClientAddressDraft(input);
  const entityId = fingerprint.slice(0, 32);
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint,
    create: () => newAttempt(fingerprint, scoped),
    parse: isStoredAttempt,
  });
}

export async function clearClientAddressAttempt(actorId: string, fingerprint: string): Promise<void> {
  const normalizedFingerprint = fingerprint.trim();
  if (!normalizedFingerprint) return;
  const entityId = normalizedFingerprint.slice(0, 32);
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: scope.actorId, installationId: scope.installationId, entityId },
    normalizedFingerprint,
    isStoredAttempt,
  );
}
