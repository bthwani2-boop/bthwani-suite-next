import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";

const OPERATION = "return-to-store-command";

export type ReturnToStoreCommand = "captain_arrive" | "partner_accept";

export type ReturnToStoreCommandIntent = {
  readonly actorId: string;
  readonly command: ReturnToStoreCommand;
  readonly entityId: string;
};

export type StoredReturnToStoreCommandAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

function normalizeIntent(intent: ReturnToStoreCommandIntent): ReturnToStoreCommandIntent {
  const actorId = intent.actorId.trim();
  const entityId = intent.entityId.trim();
  if (!actorId || !entityId) throw new Error("return-to-store command identity is incomplete");
  if (intent.command !== "captain_arrive" && intent.command !== "partner_accept") {
    throw new Error("return-to-store command is unsupported");
  }
  return { ...intent, actorId, entityId };
}

function attemptIdentity(intent: ReturnToStoreCommandIntent) {
  const normalized = normalizeIntent(intent);
  return {
    entityId: `${normalized.command}:${normalized.entityId}`,
    signature: JSON.stringify({
      actorId: normalized.actorId,
      command: normalized.command,
      entityId: normalized.entityId,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredReturnToStoreCommandAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredReturnToStoreCommandAttempt>;
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

export async function getOrCreateReturnToStoreCommandAttempt(
  intent: ReturnToStoreCommandIntent,
): Promise<StoredReturnToStoreCommandAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = `return-to-store:${secureRandomId()}`;
      const correlationId = secureCorrelationId("return-to-store");
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

export async function clearReturnToStoreCommandAttempt(
  intent: ReturnToStoreCommandIntent,
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
