import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureRandomId } from "../_kernel/secure-random.ts";

const OPERATION = "client-order-ratings-submit";

export type ClientOrderRatingsInput = {
  readonly captainScore: number;
  readonly orderScore: number;
  readonly captainComment?: string;
  readonly orderComment?: string;
};

export type StoredClientOrderRatingAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

type NormalizedInput = {
  readonly captainScore: number;
  readonly orderScore: number;
  readonly captainComment: string;
  readonly orderComment: string;
};

function normalizeInput(input: ClientOrderRatingsInput): NormalizedInput {
  return {
    captainScore: input.captainScore,
    orderScore: input.orderScore,
    captainComment: input.captainComment?.trim() ?? "",
    orderComment: input.orderComment?.trim() ?? "",
  };
}

function attemptIdentity(actorId: string, orderId: string, input: ClientOrderRatingsInput) {
  const normalizedActorId = actorId.trim();
  const normalizedOrderId = orderId.trim();
  if (!normalizedActorId) throw new Error("client order rating actor id is required");
  if (!normalizedOrderId) throw new Error("client order rating order id is required");
  const normalized = normalizeInput(input);
  return {
    normalizedActorId,
    normalizedOrderId,
    entityId: `order:${normalizedOrderId}`,
    signature: JSON.stringify({ orderId: normalizedOrderId, ...normalized }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredClientOrderRatingAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredClientOrderRatingAttempt>;
  return typeof parsed.signature === "string"
    && parsed.signature === parsed.fingerprint
    && typeof parsed.idempotencyKey === "string"
    && parsed.idempotencyKey === parsed.context?.idempotencyKey
    && typeof parsed.correlationId === "string"
    && parsed.correlationId === parsed.context?.correlationId
    && typeof parsed.createdAtMs === "number"
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string";
}

export async function getOrCreateClientOrderRatingAttempt(
  actorId: string,
  orderId: string,
  input: ClientOrderRatingsInput,
): Promise<StoredClientOrderRatingAttempt> {
  const identity = attemptIdentity(actorId, orderId, input);
  const scope = await resolveMutationIdentityScope(identity.normalizedActorId, { entityId: identity.entityId });
  const scoped = {
    actorId: scope.actorId,
    installationId: scope.installationId,
    entityId: identity.entityId,
  };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint: identity.signature,
    create: () => {
      const idempotencyKey = `client-order-ratings:${secureRandomId()}`;
      return {
        signature: identity.signature,
        fingerprint: identity.signature,
        idempotencyKey,
        correlationId: idempotencyKey,
        createdAtMs: Date.now(),
        scope: scoped,
        context: { idempotencyKey, correlationId: idempotencyKey },
      };
    },
    parse: parseStoredAttempt,
  });
}

export async function clearClientOrderRatingAttempt(
  actorId: string,
  orderId: string,
  signature: string,
): Promise<void> {
  const identity = attemptIdentity(actorId, orderId, {
    captainScore: 0,
    orderScore: 0,
  });
  const scope = await resolveMutationIdentityScope(identity.normalizedActorId, { entityId: identity.entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: scope.actorId, installationId: scope.installationId, entityId: identity.entityId },
    signature,
    parseStoredAttempt,
  );
}
