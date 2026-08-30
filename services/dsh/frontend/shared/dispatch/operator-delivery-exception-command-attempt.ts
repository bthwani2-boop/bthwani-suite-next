import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";
import type { DshOperatorCommandContext } from "./dispatch.api";

const OPERATION = "operator-delivery-exception-command";

export type OperatorDeliveryExceptionCommandAction =
  | "acknowledge"
  | "retry_same_captain"
  | "reassign_captain"
  | "return_to_store"
  | "cancel_order";

export type OperatorDeliveryExceptionCommandIntent = {
  readonly actorId: string;
  readonly exceptionId: string;
  readonly action: OperatorDeliveryExceptionCommandAction;
  readonly expectedVersion: number;
  readonly note?: string;
  readonly newCaptainId?: string;
};

export type StoredOperatorDeliveryExceptionCommandAttempt = DurableMutationAttemptEnvelope<DshOperatorCommandContext> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

function normalizeIntent(intent: OperatorDeliveryExceptionCommandIntent): OperatorDeliveryExceptionCommandIntent {
  const actorId = intent.actorId.trim();
  const exceptionId = intent.exceptionId.trim();
  const note = intent.note?.trim() ?? "";
  const newCaptainId = intent.newCaptainId?.trim() ?? "";
  if (!actorId || !exceptionId) throw new Error("operator delivery exception identity is incomplete");
  if (!Number.isInteger(intent.expectedVersion) || intent.expectedVersion < 1) {
    throw new Error("operator delivery exception version is invalid");
  }
  if (intent.action !== "acknowledge" && note.length < 5) {
    throw new Error("operator delivery exception resolution note is required");
  }
  if (intent.action === "reassign_captain" && !newCaptainId) {
    throw new Error("replacement captain is required");
  }
  return {
    actorId,
    exceptionId,
    action: intent.action,
    expectedVersion: intent.expectedVersion,
    ...(note ? { note } : {}),
    ...(newCaptainId ? { newCaptainId } : {}),
  };
}

function attemptIdentity(intent: OperatorDeliveryExceptionCommandIntent) {
  const normalized = normalizeIntent(intent);
  const signature = JSON.stringify({
    exceptionId: normalized.exceptionId,
    action: normalized.action,
    expectedVersion: normalized.expectedVersion,
    note: normalized.note ?? "",
    newCaptainId: normalized.newCaptainId ?? "",
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return {
    entityId: `exception:${normalized.exceptionId}`,
    signature,
    fingerprint: (hash >>> 0).toString(36),
  };
}

function parseStoredAttempt(value: unknown): value is StoredOperatorDeliveryExceptionCommandAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredOperatorDeliveryExceptionCommandAttempt>;
  return typeof parsed.signature === "string"
    && typeof parsed.fingerprint === "string"
    && typeof parsed.idempotencyKey === "string"
    && parsed.idempotencyKey === parsed.context?.idempotencyKey
    && typeof parsed.correlationId === "string"
    && parsed.correlationId === parsed.context?.correlationId
    && typeof parsed.createdAtMs === "number"
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string";
}

export async function getOrCreateOperatorDeliveryExceptionCommandAttempt(
  intent: OperatorDeliveryExceptionCommandIntent,
): Promise<StoredOperatorDeliveryExceptionCommandAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature, fingerprint } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint,
    create: () => {
      const idempotencyKey = `operator-delivery-exception:${secureRandomId()}`;
      const correlationId = secureCorrelationId("operator-delivery-exception");
      return {
        signature,
        fingerprint,
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

export async function clearOperatorDeliveryExceptionCommandAttempt(
  intent: OperatorDeliveryExceptionCommandIntent,
  fingerprint: string,
): Promise<void> {
  const normalized = normalizeIntent(intent);
  const { entityId } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: identity.actorId, installationId: identity.installationId, entityId },
    fingerprint,
    parseStoredAttempt,
  );
}
