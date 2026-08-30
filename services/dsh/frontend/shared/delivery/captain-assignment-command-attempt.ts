import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";

const OPERATION = "captain-assignment-command";

export type CaptainAssignmentCommandIntent = {
  readonly actorId: string;
  readonly assignmentId: string;
  readonly decision: "accept" | "decline";
  readonly reasonCode?: string;
  readonly reason?: string;
};

export type StoredCaptainAssignmentCommandAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

function normalizeIntent(intent: CaptainAssignmentCommandIntent): CaptainAssignmentCommandIntent {
  const actorId = intent.actorId.trim();
  const assignmentId = intent.assignmentId.trim();
  const reasonCode = intent.reasonCode?.trim() ?? "";
  const reason = intent.reason?.trim() ?? "";
  if (!actorId) throw new Error("Captain assignment command actor id is required");
  if (!assignmentId) throw new Error("Captain assignment command assignment id is required");
  if (intent.decision === "decline" && (!reasonCode || !reason)) {
    throw new Error("Captain assignment decline reason is required");
  }
  return {
    actorId,
    assignmentId,
    decision: intent.decision,
    ...(intent.decision === "decline" ? { reasonCode, reason } : {}),
  };
}

function attemptIdentity(intent: CaptainAssignmentCommandIntent) {
  const normalized = normalizeIntent(intent);
  return {
    entityId: `assignment:${normalized.assignmentId}`,
    signature: JSON.stringify({
      assignmentId: normalized.assignmentId,
      decision: normalized.decision,
      reasonCode: normalized.reasonCode ?? null,
      reason: normalized.reason ?? null,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredCaptainAssignmentCommandAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredCaptainAssignmentCommandAttempt>;
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

export async function getOrCreateCaptainAssignmentCommandAttempt(
  intent: CaptainAssignmentCommandIntent,
): Promise<StoredCaptainAssignmentCommandAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = `captain-assignment:${secureRandomId()}`;
      const correlationId = secureCorrelationId("captain-assignment");
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

export async function clearCaptainAssignmentCommandAttempt(
  intent: CaptainAssignmentCommandIntent,
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
