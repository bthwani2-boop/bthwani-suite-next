import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";
import type { DshDeliveryExceptionReasonCode } from "../dispatch/dispatch.types";

const OPERATION = "captain-delivery-exception-command";

export type CaptainDeliveryExceptionCommandIntent = {
  readonly actorId: string;
  readonly assignmentId: string;
  readonly reasonCode: DshDeliveryExceptionReasonCode;
  readonly note: string;
};

export type StoredCaptainDeliveryExceptionCommandAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

function normalizeIntent(intent: CaptainDeliveryExceptionCommandIntent): CaptainDeliveryExceptionCommandIntent {
  const actorId = intent.actorId.trim();
  const assignmentId = intent.assignmentId.trim();
  const note = intent.note.trim();
  if (!actorId) throw new Error("Captain delivery exception actor id is required");
  if (!assignmentId) throw new Error("Captain delivery exception assignment id is required");
  if (!note) throw new Error("Captain delivery exception note is required");
  return { ...intent, actorId, assignmentId, note };
}

function attemptIdentity(intent: CaptainDeliveryExceptionCommandIntent) {
  const normalized = normalizeIntent(intent);
  return {
    entityId: `assignment:${normalized.assignmentId}`,
    signature: JSON.stringify({
      assignmentId: normalized.assignmentId,
      reasonCode: normalized.reasonCode,
      note: normalized.note,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredCaptainDeliveryExceptionCommandAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredCaptainDeliveryExceptionCommandAttempt>;
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

export async function getOrCreateCaptainDeliveryExceptionCommandAttempt(
  intent: CaptainDeliveryExceptionCommandIntent,
): Promise<StoredCaptainDeliveryExceptionCommandAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = `captain-delivery-exception:${secureRandomId()}`;
      const correlationId = secureCorrelationId("captain-delivery-exception");
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

export async function clearCaptainDeliveryExceptionCommandAttempt(
  intent: CaptainDeliveryExceptionCommandIntent,
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
