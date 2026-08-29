import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";

const OPERATION = "store-captain-handoff-confirmation";

export type StoreCaptainHandoffConfirmationIntent = {
  readonly actorId: string;
  readonly orderId: string;
};

export type StoredStoreCaptainHandoffConfirmationAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

function normalizeIntent(intent: StoreCaptainHandoffConfirmationIntent): StoreCaptainHandoffConfirmationIntent {
  const actorId = intent.actorId.trim();
  const orderId = intent.orderId.trim();
  if (!actorId || !orderId) throw new Error("store handoff confirmation identity is incomplete");
  return { actorId, orderId };
}

function attemptIdentity(intent: StoreCaptainHandoffConfirmationIntent) {
  const normalized = normalizeIntent(intent);
  return {
    entityId: `order:${normalized.orderId}`,
    signature: JSON.stringify({ actorId: normalized.actorId, orderId: normalized.orderId }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredStoreCaptainHandoffConfirmationAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredStoreCaptainHandoffConfirmationAttempt>;
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

export async function getOrCreateStoreCaptainHandoffConfirmationAttempt(
  intent: StoreCaptainHandoffConfirmationIntent,
): Promise<StoredStoreCaptainHandoffConfirmationAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = `store-captain-handoff-confirm:${secureRandomId()}`;
      const correlationId = secureCorrelationId("store-captain-handoff-confirm");
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

export async function clearStoreCaptainHandoffConfirmationAttempt(
  intent: StoreCaptainHandoffConfirmationIntent,
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
