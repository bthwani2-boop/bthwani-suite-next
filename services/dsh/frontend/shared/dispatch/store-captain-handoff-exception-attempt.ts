import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureRandomId } from "../_kernel/secure-random.ts";
import type { DshStoreCaptainHandoffExceptionReason } from "../orders/orders.types.ts";
import type { StoreCaptainHandoffExceptionActor } from "./use-store-captain-handoff-exception.ts";

const OPERATION = "store-captain-handoff-exception-report";

export type StoreCaptainHandoffExceptionAttemptIntent = {
  readonly actor: StoreCaptainHandoffExceptionActor;
  readonly actorId: string;
  readonly entityId: string;
  readonly reasonCode: DshStoreCaptainHandoffExceptionReason;
  readonly note: string;
};

export type StoredStoreCaptainHandoffExceptionAttempt = DurableMutationAttemptEnvelope<{
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

type NormalizedIntent = StoreCaptainHandoffExceptionAttemptIntent;

function normalizeIntent(input: StoreCaptainHandoffExceptionAttemptIntent): NormalizedIntent {
  const actorId = input.actorId.trim();
  const entityId = input.entityId.trim();
  const note = input.note.trim();
  if (!actorId) throw new Error("handoff exception actor id is required");
  if (!entityId) throw new Error("handoff exception entity id is required");
  if (note.length < 5 || note.length > 1000) {
    throw new Error("handoff exception note must be between 5 and 1000 characters");
  }
  return { ...input, actorId, entityId, note };
}

function attemptIdentity(input: NormalizedIntent): {
  readonly entityId: string;
  readonly signature: string;
} {
  return {
    entityId: `${input.actor}|${input.entityId}`,
    signature: JSON.stringify({
      actor: input.actor,
      actorId: input.actorId,
      entityId: input.entityId,
      reasonCode: input.reasonCode,
      note: input.note,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredStoreCaptainHandoffExceptionAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredStoreCaptainHandoffExceptionAttempt>;
  return typeof parsed.signature === "string"
    && typeof parsed.fingerprint === "string"
    && parsed.signature === parsed.fingerprint
    && typeof parsed.correlationId === "string"
    && typeof parsed.context?.correlationId === "string"
    && parsed.correlationId === parsed.context.correlationId
    && typeof parsed.createdAtMs === "number"
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string";
}

export async function getOrCreateStoreCaptainHandoffExceptionAttempt(
  input: StoreCaptainHandoffExceptionAttemptIntent,
): Promise<StoredStoreCaptainHandoffExceptionAttempt> {
  const normalized = normalizeIntent(input);
  const { entityId, signature } = attemptIdentity(normalized);
  const scope = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint: signature,
    create: () => {
      const correlationId = `${normalized.actor}:store-captain-handoff:${secureRandomId()}`;
      return {
        signature,
        fingerprint: signature,
        correlationId,
        createdAtMs: Date.now(),
        scope: scoped,
        context: { correlationId },
      };
    },
    parse: parseStoredAttempt,
  });
}

export async function clearStoreCaptainHandoffExceptionAttempt(
  input: StoreCaptainHandoffExceptionAttemptIntent,
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
