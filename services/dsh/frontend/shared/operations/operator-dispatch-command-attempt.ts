import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";
import type { DshOperatorCommandContext } from "../dispatch/dispatch.api";

const OPERATION = "operator-dispatch-command";

export type OperatorDispatchCommandAction =
  | "cancel_assignment"
  | "reassign_assignment"
  | "expire_assignments";

export type OperatorDispatchCommandIntent = {
  readonly actorId: string;
  readonly action: OperatorDispatchCommandAction;
  readonly assignmentId?: string;
  readonly sourceVersion?: number;
  readonly captainId?: string;
  readonly serviceAreaCode?: string;
  readonly priority?: number;
  readonly distanceMeters?: number;
  readonly reasonCode?: string;
  readonly reason?: string;
  readonly responseTimeoutSeconds?: number;
  readonly limit?: number;
};

export type StoredOperatorDispatchCommandAttempt = DurableMutationAttemptEnvelope<DshOperatorCommandContext> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

function normalizeIntent(intent: OperatorDispatchCommandIntent): OperatorDispatchCommandIntent {
  const actorId = intent.actorId.trim();
  const assignmentId = intent.assignmentId?.trim() ?? "";
  const captainId = intent.captainId?.trim() ?? "";
  const serviceAreaCode = intent.serviceAreaCode?.trim() ?? "";
  const reasonCode = intent.reasonCode?.trim() ?? "";
  const reason = intent.reason?.trim() ?? "";
  const limit = intent.limit ?? 100;
  if (!actorId) throw new Error("operator dispatch actor identity is incomplete");
  if (intent.action === "expire_assignments") {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new Error("operator dispatch expiration limit is invalid");
    }
    return { actorId, action: intent.action, limit };
  }
  if (!assignmentId || reason.length < 3) {
    throw new Error("operator dispatch assignment identity or reason is incomplete");
  }
  if (intent.action === "cancel_assignment") {
    if (!reasonCode) throw new Error("operator dispatch cancellation reason code is required");
    return { actorId, action: intent.action, assignmentId, reasonCode, reason };
  }
  const sourceVersion = intent.sourceVersion;
  if (!captainId || !serviceAreaCode || typeof sourceVersion !== "number" || !Number.isInteger(sourceVersion) || sourceVersion < 1) {
    throw new Error("operator dispatch reassignment controls are incomplete");
  }
  const priority = intent.priority ?? 0;
  const responseTimeoutSeconds = intent.responseTimeoutSeconds ?? 90;
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
    throw new Error("operator dispatch priority is invalid");
  }
  if (!Number.isInteger(responseTimeoutSeconds) || responseTimeoutSeconds < 30 || responseTimeoutSeconds > 600) {
    throw new Error("operator dispatch response timeout is invalid");
  }
  if (intent.distanceMeters !== undefined && (!Number.isInteger(intent.distanceMeters) || intent.distanceMeters < 0)) {
    throw new Error("operator dispatch distance is invalid");
  }
  return {
    actorId,
    action: intent.action,
    assignmentId,
    sourceVersion,
    captainId,
    serviceAreaCode,
    priority,
    ...(intent.distanceMeters === undefined ? {} : { distanceMeters: intent.distanceMeters }),
    reason,
    responseTimeoutSeconds,
  };
}

function attemptIdentity(intent: OperatorDispatchCommandIntent) {
  const normalized = normalizeIntent(intent);
  const entityId = normalized.action === "expire_assignments"
    ? `expire:${normalized.limit}`
    : `${normalized.action}:${normalized.assignmentId}`;
  const signature = JSON.stringify(normalized);
  let hash = 0x811c9dc5;
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return {
    entityId,
    signature,
    fingerprint: (hash >>> 0).toString(36),
  };
}

function parseStoredAttempt(value: unknown): value is StoredOperatorDispatchCommandAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredOperatorDispatchCommandAttempt>;
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

export async function getOrCreateOperatorDispatchCommandAttempt(
  intent: OperatorDispatchCommandIntent,
): Promise<StoredOperatorDispatchCommandAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature, fingerprint } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint,
    create: () => {
      const idempotencyKey = `operator-dispatch:${secureRandomId()}`;
      const correlationId = secureCorrelationId("operator-dispatch");
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

export async function clearOperatorDispatchCommandAttempt(
  intent: OperatorDispatchCommandIntent,
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
