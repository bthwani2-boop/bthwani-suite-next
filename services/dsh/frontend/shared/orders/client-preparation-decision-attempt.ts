import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureRandomId } from "../_kernel/secure-random.ts";
import type { DshDecidePreparationIssueInput } from "./orders.types";

const OPERATION = "client-preparation-decision";

export type StoredClientPreparationDecisionAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

export type ClientPreparationDecisionIntent = {
  readonly actorId: string;
  readonly orderId: string;
  readonly issueId: string;
  readonly input: DshDecidePreparationIssueInput;
};

function normalizeIntent(intent: ClientPreparationDecisionIntent) {
  const actorId = intent.actorId.trim();
  const orderId = intent.orderId.trim();
  const issueId = intent.issueId.trim();
  const note = intent.input.note?.trim() ?? "";
  if (!actorId) throw new Error("client preparation decision actor id is required");
  if (!orderId) throw new Error("client preparation decision order id is required");
  if (!issueId) throw new Error("client preparation decision issue id is required");
  return {
    actorId,
    orderId,
    issueId,
    input: {
      expectedVersion: intent.input.expectedVersion,
      decision: intent.input.decision,
      note,
    },
  };
}

function identity(intent: ClientPreparationDecisionIntent) {
  const normalized = normalizeIntent(intent);
  return {
    ...normalized,
    entityId: `order:${normalized.orderId}:issue:${normalized.issueId}`,
    signature: JSON.stringify({
      orderId: normalized.orderId,
      issueId: normalized.issueId,
      ...normalized.input,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredClientPreparationDecisionAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredClientPreparationDecisionAttempt>;
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

export async function getOrCreateClientPreparationDecisionAttempt(
	intent: ClientPreparationDecisionIntent,
): Promise<StoredClientPreparationDecisionAttempt> {
  const current = identity(intent);
  const scope = await resolveMutationIdentityScope(current.actorId, { entityId: current.entityId });
  const scoped = {
    actorId: scope.actorId,
    installationId: scope.installationId,
    entityId: current.entityId,
  };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint: current.signature,
    create: () => {
      const idempotencyKey = `client-preparation-decision:${secureRandomId()}`;
      return {
        signature: current.signature,
        fingerprint: current.signature,
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

export async function clearClientPreparationDecisionAttempt(
	intent: ClientPreparationDecisionIntent,
  signature: string,
): Promise<void> {
  const current = identity(intent);
  const scope = await resolveMutationIdentityScope(current.actorId, { entityId: current.entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: scope.actorId, installationId: scope.installationId, entityId: current.entityId },
    signature,
    parseStoredAttempt,
  );
}
