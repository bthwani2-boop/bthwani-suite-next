import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";
import type { CaptainAvailabilityStatus } from "./captain.contract";

const OPERATION = "captain-availability";
type CaptainOwnedAvailability = Extract<CaptainAvailabilityStatus, "available" | "unavailable">;

export type CaptainAvailabilityMutationIntent = {
  readonly actorId: string;
  readonly status: CaptainOwnedAvailability;
  readonly expectedVersion: number;
};

export type StoredCaptainAvailabilityAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

function normalizeIntent(intent: CaptainAvailabilityMutationIntent): CaptainAvailabilityMutationIntent {
  const actorId = intent.actorId.trim();
  if (!actorId) throw new Error("Captain availability actor id is required");
  if (!Number.isInteger(intent.expectedVersion) || intent.expectedVersion < 1) {
    throw new Error("Captain availability expected version must be positive");
  }
  return { actorId, status: intent.status, expectedVersion: intent.expectedVersion };
}

function attemptIdentity(intent: CaptainAvailabilityMutationIntent) {
  const normalized = normalizeIntent(intent);
  return {
    entityId: `captain:${normalized.actorId}:availability`,
    signature: JSON.stringify({
      status: normalized.status,
      expectedVersion: normalized.expectedVersion,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredCaptainAvailabilityAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredCaptainAvailabilityAttempt>;
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

export async function getOrCreateCaptainAvailabilityAttempt(
  intent: CaptainAvailabilityMutationIntent,
): Promise<StoredCaptainAvailabilityAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = `captain-availability:${secureRandomId()}`;
      const correlationId = secureCorrelationId("captain-availability");
      return {
        signature,
        fingerprint: signature,
        idempotencyKey,
        correlationId,
        createdAtMs: Date.now(),
        scope,
        context: { idempotencyKey, correlationId },
      };
    },
    parse: parseStoredAttempt,
  });
}

export async function clearCaptainAvailabilityAttempt(
  intent: CaptainAvailabilityMutationIntent,
  signature: string,
): Promise<void> {
  const normalized = normalizeIntent(intent);
  const { entityId } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: identity.actorId, installationId: identity.installationId, entityId },
    signature,
    parseStoredAttempt,
  );
}
