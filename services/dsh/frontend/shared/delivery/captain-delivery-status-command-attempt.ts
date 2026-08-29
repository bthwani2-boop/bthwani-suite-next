import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";
import type { DshDeliveryStatus } from "../dispatch/dispatch.types";

const OPERATION = "captain-delivery-status-command";

export type CaptainDeliveryStatusCommandIntent = {
  readonly actorId: string;
  readonly assignmentId: string;
  readonly expectedStatus: DshDeliveryStatus;
  readonly nextStatus: DshDeliveryStatus;
  readonly expectedVersion: number;
};

export type StoredCaptainDeliveryStatusCommandAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

function normalizeIntent(intent: CaptainDeliveryStatusCommandIntent): CaptainDeliveryStatusCommandIntent {
  const actorId = intent.actorId.trim();
  const assignmentId = intent.assignmentId.trim();
  if (!actorId) throw new Error("Captain delivery status actor id is required");
  if (!assignmentId) throw new Error("Captain delivery status assignment id is required");
  if (!Number.isInteger(intent.expectedVersion) || intent.expectedVersion < 1) {
    throw new Error("Captain delivery status expected version is required");
  }
  return { ...intent, actorId, assignmentId };
}

function attemptIdentity(intent: CaptainDeliveryStatusCommandIntent) {
  const normalized = normalizeIntent(intent);
  return {
    entityId: `assignment:${normalized.assignmentId}`,
    signature: JSON.stringify({
      assignmentId: normalized.assignmentId,
      expectedStatus: normalized.expectedStatus,
      nextStatus: normalized.nextStatus,
      expectedVersion: normalized.expectedVersion,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredCaptainDeliveryStatusCommandAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredCaptainDeliveryStatusCommandAttempt>;
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

export async function getOrCreateCaptainDeliveryStatusCommandAttempt(
  intent: CaptainDeliveryStatusCommandIntent,
): Promise<StoredCaptainDeliveryStatusCommandAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = `captain-delivery-status:${secureRandomId()}`;
      const correlationId = secureCorrelationId("captain-delivery-status");
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

export async function clearCaptainDeliveryStatusCommandAttempt(
  intent: CaptainDeliveryStatusCommandIntent,
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
