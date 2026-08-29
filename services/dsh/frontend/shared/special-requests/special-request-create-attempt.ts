import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import { secureRandomId } from "../_kernel/secure-random.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import type { DshCreateSpecialRequest } from "./special-requests.types";

const OPERATION = "client-special-request-create";

type StoredAttempt = {
  readonly fingerprint: string;
  readonly context: {
    readonly idempotencyKey: string;
    readonly correlationId: string;
  };
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
  };
};

function normalized(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function fingerprintSpecialRequestInput(
  input: Omit<DshCreateSpecialRequest, "idempotencyKey">,
): string {
  return JSON.stringify({
    requestType: input.requestType,
    customerNotes: normalized(input.customerNotes),
    productUrl: normalized(input.productUrl),
    quantity: input.quantity ?? null,
    size: normalized(input.size),
    color: normalized(input.color),
    variantNotes: normalized(input.variantNotes),
    deliveryAddressReference: normalized(input.deliveryAddressReference),
    pickupAddressReference: normalized(input.pickupAddressReference),
    dropoffAddressReference: normalized(input.dropoffAddressReference),
    itemType: normalized(input.itemType),
    scheduleMode: normalized(input.scheduleMode),
    scheduledAt: normalized(input.scheduledAt),
    handlingRequirements: normalized(input.handlingRequirements),
    pickupLocation: input.pickupLocation ?? null,
    dropoffLocation: input.dropoffLocation ?? null,
  });
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

export async function getOrCreateSpecialRequestCreateAttempt(
  actorId: string,
  input: Omit<DshCreateSpecialRequest, "idempotencyKey">,
): Promise<StoredAttempt> {
  const fingerprint = fingerprintSpecialRequestInput(input);
  const entityId = fingerprint.slice(0, 32);
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint,
    create: () => ({
      fingerprint,
      scope: scoped,
      context: {
        idempotencyKey: `special-request-create:${secureRandomId()}`,
        correlationId: `special-request:${secureRandomId()}`,
      },
    }),
    parse: isStoredAttempt,
  });
}

export async function clearSpecialRequestCreateAttempt(
  actorId: string,
  fingerprint: string,
): Promise<void> {
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
