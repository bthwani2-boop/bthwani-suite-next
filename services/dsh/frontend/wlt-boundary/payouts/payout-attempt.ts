import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../../shared/_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../../shared/_kernel/durable-mutation-attempt-registry.ts";
import { secureRandomId } from "../../shared/_kernel/secure-random.ts";
import type { PayoutActorType, PayoutAmountMode } from "./payout.api.ts";

const OPERATION = "actor-payout-create";

export type PayoutAttemptIntent = {
  readonly actorType: PayoutActorType;
  readonly actorId: string;
  readonly payoutDestinationId: string;
  readonly payoutDestinationVersion: number;
  readonly amountMode: PayoutAmountMode;
  readonly amountMinorUnits?: number;
  readonly currency: string;
};

export type StoredPayoutAttempt = DurableMutationAttemptEnvelope<{ readonly idempotencyKey: string }> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly createdAtMs: number;
};

type NormalizedPayoutAttemptIntent = {
  readonly actorType: PayoutActorType;
  readonly actorId: string;
  readonly payoutDestinationId: string;
  readonly payoutDestinationVersion: number;
  readonly amountMode: PayoutAmountMode;
  readonly amountMinorUnits: number | null;
  readonly currency: string;
};

function normalizeIntent(input: PayoutAttemptIntent): NormalizedPayoutAttemptIntent {
  const actorId = input.actorId.trim();
  const payoutDestinationId = input.payoutDestinationId.trim();
  const currency = input.currency.trim().toUpperCase();
  if (!actorId) throw new Error("payout actor id is required");
  if (!payoutDestinationId) throw new Error("payout destination id is required");
  if (!Number.isSafeInteger(input.payoutDestinationVersion) || input.payoutDestinationVersion < 1) {
    throw new Error("payout destination version must be a positive integer");
  }
  if (!currency) throw new Error("payout currency is required");

  if (input.amountMode === "FULL_AVAILABLE") {
    if (input.amountMinorUnits !== undefined) {
      throw new Error("FULL_AVAILABLE payout attempts must not include an amount");
    }
    return { ...input, actorId, payoutDestinationId, currency, amountMinorUnits: null };
  }
  if (!Number.isSafeInteger(input.amountMinorUnits) || (input.amountMinorUnits ?? 0) <= 0) {
    throw new Error("SPECIFIED payout attempts require a positive minor-unit amount");
  }
  return {
    ...input,
    actorId,
    payoutDestinationId,
    currency,
    amountMinorUnits: input.amountMinorUnits!,
  };
}

function attemptIdentity(input: NormalizedPayoutAttemptIntent): {
  readonly entityId: string;
  readonly signature: string;
} {
  const entityId = `${input.actorType}|${input.payoutDestinationId}|${input.payoutDestinationVersion}`;
  return {
    entityId,
    signature: [
      input.actorType,
      input.actorId,
      input.payoutDestinationId,
      input.payoutDestinationVersion,
      input.amountMode,
      input.amountMinorUnits ?? "full",
      input.currency,
    ].join("|"),
  };
}

function parseStoredAttempt(value: unknown): value is StoredPayoutAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredPayoutAttempt>;
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

export async function getOrCreatePayoutAttempt(
  input: PayoutAttemptIntent,
): Promise<StoredPayoutAttempt> {
  const normalized = normalizeIntent(input);
  const { entityId, signature } = attemptIdentity(normalized);
  const scope = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = `payout:${normalized.actorType}:${secureRandomId()}`;
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

export async function clearPayoutAttempt(
  input: PayoutAttemptIntent,
  signature: string,
): Promise<void> {
  const normalizedSignature = signature.trim();
  if (!normalizedSignature) return;
  const normalized = normalizeIntent(input);
  const { entityId } = attemptIdentity(normalized);
  const scope = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: scope.actorId, installationId: scope.installationId, entityId },
    normalizedSignature,
    parseStoredAttempt,
  );
}
