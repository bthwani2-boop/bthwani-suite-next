import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureRandomId } from "../_kernel/secure-random.ts";

const OPERATION = "client-special-request-command";

export type ClientSpecialRequestCommandAction = "cancel" | "approve-quote" | "respond-information";

export type ClientSpecialRequestCommandIntent = {
  readonly actorId: string;
  readonly requestId: string;
  readonly action: ClientSpecialRequestCommandAction;
  readonly expectedVersion: number | undefined;
  readonly exchangeId?: string;
  readonly response?: string;
};

export type StoredClientSpecialRequestCommandAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

function normalizeIntent(intent: ClientSpecialRequestCommandIntent) {
  const actorId = intent.actorId.trim();
  const requestId = intent.requestId.trim();
  if (!actorId) throw new Error("client special-request command actor id is required");
  if (!requestId) throw new Error("client special-request command request id is required");
  if (intent.action === "respond-information"
    && (!Number.isInteger(intent.expectedVersion) || (intent.expectedVersion ?? 0) < 1)) {
    throw new Error("client special-request information response expected version is required");
  }
  if (intent.expectedVersion !== undefined && (!Number.isInteger(intent.expectedVersion) || intent.expectedVersion < 1)) {
    throw new Error("client special-request command expected version is required");
  }
  const exchangeId = intent.exchangeId?.trim() ?? "";
  const response = intent.response?.trim() ?? "";
  if (intent.action === "respond-information" && (!exchangeId || !response)) {
    throw new Error("client special-request information response exchange and response are required");
  }
  return {
    actorId,
    requestId,
    action: intent.action,
    expectedVersion: intent.expectedVersion,
    ...(intent.action === "respond-information" ? { exchangeId, response } : {}),
  };
}

function identity(intent: ClientSpecialRequestCommandIntent) {
  const normalized = normalizeIntent(intent);
  return {
    ...normalized,
    entityId: `special-request:${normalized.requestId}:${normalized.action}`,
    signature: JSON.stringify({
      requestId: normalized.requestId,
      action: normalized.action,
      expectedVersion: normalized.expectedVersion ?? null,
      exchangeId: normalized.exchangeId ?? null,
      response: normalized.response ?? null,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredClientSpecialRequestCommandAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredClientSpecialRequestCommandAttempt>;
  return typeof parsed.signature === "string"
    && parsed.signature === parsed.fingerprint
    && typeof parsed.idempotencyKey === "string"
    && parsed.idempotencyKey === parsed.context?.idempotencyKey
    && typeof parsed.correlationId === "string"
    && parsed.correlationId === parsed.context?.correlationId
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string";
}

export async function getOrCreateClientSpecialRequestCommandAttempt(
  intent: ClientSpecialRequestCommandIntent,
): Promise<StoredClientSpecialRequestCommandAttempt> {
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
      const idempotencyKey = `client-special-request:${current.action}:${secureRandomId()}`;
      return {
        signature: current.signature,
        fingerprint: current.signature,
        idempotencyKey,
        correlationId: idempotencyKey,
        scope: scoped,
        context: { idempotencyKey, correlationId: idempotencyKey },
      };
    },
    parse: parseStoredAttempt,
  });
}

export async function clearClientSpecialRequestCommandAttempt(
  intent: ClientSpecialRequestCommandIntent,
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
