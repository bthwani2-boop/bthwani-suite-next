import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../../shared/_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../../shared/_kernel/durable-mutation-attempt-registry.ts";
import { secureRandomId } from "../../shared/_kernel/secure-random.ts";

const OPERATION = "commission-adjustment";

export type CommissionAdjustmentAttemptIntent = {
  readonly operatorActorId: string;
  readonly commissionId: string;
  readonly deltaMinorUnits: number;
  readonly reason: string;
};

export type StoredCommissionAdjustmentAttempt = DurableMutationAttemptEnvelope<{ readonly idempotencyKey: string }> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly createdAtMs: number;
};

function normalizeIntent(input: CommissionAdjustmentAttemptIntent): CommissionAdjustmentAttemptIntent {
  const operatorActorId = input.operatorActorId.trim();
  const commissionId = input.commissionId.trim();
  const reason = input.reason.trim();
  if (!operatorActorId) throw new Error("commission adjustment operator identity is required");
  if (!commissionId) throw new Error("commission id is required");
  if (!Number.isSafeInteger(input.deltaMinorUnits) || input.deltaMinorUnits === 0) {
    throw new Error("commission adjustment must be a non-zero integer in minor units");
  }
  if (!reason) throw new Error("commission adjustment reason is required");
  return { operatorActorId, commissionId, deltaMinorUnits: input.deltaMinorUnits, reason };
}

function signatureFor(input: CommissionAdjustmentAttemptIntent): string {
  return [input.operatorActorId, input.commissionId, input.deltaMinorUnits, input.reason].join("|");
}

function parseStoredAttempt(value: unknown): value is StoredCommissionAdjustmentAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredCommissionAdjustmentAttempt>;
  return typeof parsed.signature === "string"
    && typeof parsed.fingerprint === "string"
    && typeof parsed.idempotencyKey === "string"
    && typeof parsed.context?.idempotencyKey === "string"
    && parsed.idempotencyKey === parsed.context.idempotencyKey
    && typeof parsed.createdAtMs === "number"
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string";
}

export async function getOrCreateCommissionAdjustmentAttempt(
  input: CommissionAdjustmentAttemptIntent,
): Promise<StoredCommissionAdjustmentAttempt> {
  const normalized = normalizeIntent(input);
  const signature = signatureFor(normalized);
  const scope = await resolveMutationIdentityScope(normalized.operatorActorId, {
    entityId: normalized.commissionId,
  });
  const scoped = {
    actorId: scope.actorId,
    installationId: scope.installationId,
    entityId: normalized.commissionId,
  };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = `commission-adjustment:${normalized.commissionId}:${secureRandomId()}`;
      return {
        signature,
        fingerprint: signature,
        idempotencyKey,
        createdAtMs: Date.now(),
        scope: scoped,
        context: { idempotencyKey },
      };
    },
    parse: parseStoredAttempt,
  });
}

export async function clearCommissionAdjustmentAttempt(
  input: CommissionAdjustmentAttemptIntent,
  signature: string,
): Promise<void> {
  const normalizedSignature = signature.trim();
  if (!normalizedSignature) return;
  const normalized = normalizeIntent(input);
  const scope = await resolveMutationIdentityScope(normalized.operatorActorId, {
    entityId: normalized.commissionId,
  });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    {
      actorId: scope.actorId,
      installationId: scope.installationId,
      entityId: normalized.commissionId,
    },
    normalizedSignature,
    parseStoredAttempt,
  );
}
