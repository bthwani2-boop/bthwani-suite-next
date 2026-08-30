import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  findDurableMutationAttempts,
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";
import type { DshDeliveryStatus } from "../dispatch/dispatch.types";

const OPERATION = "captain-delivery-status-command";

export type CaptainDeliveryStatusCommandIntent = {
  readonly actorId: string;
  readonly assignmentId: string;
  readonly expectedStatus: DshDeliveryStatus;
  readonly nextStatus: DshDeliveryStatus;
  readonly expectedVersion: number;
  readonly latitude?: number;
  readonly longitude?: number;
};

export type StoredCaptainDeliveryStatusCommandAttempt = DurableMutationAttemptEnvelope<{
  readonly idempotencyKey: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
  readonly latitude?: number;
  readonly longitude?: number;
};

function normalizeIntent(intent: CaptainDeliveryStatusCommandIntent): CaptainDeliveryStatusCommandIntent {
  const actorId = intent.actorId.trim();
  const assignmentId = intent.assignmentId.trim();
  if (!actorId) throw new Error("Captain delivery status actor id is required");
  if (!assignmentId) throw new Error("Captain delivery status assignment id is required");
  if (!Number.isInteger(intent.expectedVersion) || intent.expectedVersion < 1) {
    throw new Error("Captain delivery status expected version is required");
  }
  const hasLatitude = intent.latitude !== undefined;
  const hasLongitude = intent.longitude !== undefined;
  const latitude = intent.latitude;
  const longitude = intent.longitude;
  if (hasLatitude !== hasLongitude) {
    throw new Error("Captain delivery status coordinates are incomplete");
  }
  if (hasLatitude && (
    typeof latitude !== "number"
    || typeof longitude !== "number"
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  )) {
    throw new Error("Captain delivery status coordinates are invalid");
  }
  const normalized: CaptainDeliveryStatusCommandIntent = {
    ...intent,
    actorId,
    assignmentId,
  };
  if (latitude !== undefined && longitude !== undefined) {
    return { ...normalized, latitude, longitude };
  }
  return normalized;
}

function attemptIdentity(intent: CaptainDeliveryStatusCommandIntent) {
  const normalized = normalizeIntent(intent);
  return {
    entityId: `assignment:${normalized.assignmentId}`,
    signature: JSON.stringify({
      assignmentId: normalized.assignmentId,
      expectedStatus: normalized.expectedStatus,
      nextStatus: normalized.nextStatus,
      expectedVersion: normalized.expectedVersion,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredCaptainDeliveryStatusCommandAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredCaptainDeliveryStatusCommandAttempt>;
  const hasLatitude = parsed.latitude !== undefined;
  const hasLongitude = parsed.longitude !== undefined;
  const latitude = parsed.latitude;
  const longitude = parsed.longitude;
  return typeof parsed.signature === "string"
    && parsed.signature === parsed.fingerprint
    && typeof parsed.idempotencyKey === "string"
    && parsed.idempotencyKey === parsed.context?.idempotencyKey
    && typeof parsed.correlationId === "string"
    && parsed.correlationId === parsed.context?.correlationId
    && typeof parsed.createdAtMs === "number"
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string"
    && hasLatitude === hasLongitude
    && (!hasLatitude || (
      typeof latitude === "number"
      && typeof longitude === "number"
      && Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180
    ));
}

export async function getOrCreateCaptainDeliveryStatusCommandAttempt(
  intent: CaptainDeliveryStatusCommandIntent,
): Promise<StoredCaptainDeliveryStatusCommandAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint: signature,
    create: () => {
      const idempotencyKey = `captain-delivery-status:${secureRandomId()}`;
      const correlationId = secureCorrelationId("captain-delivery-status");
      return {
        signature,
        fingerprint: signature,
        idempotencyKey,
        correlationId,
        createdAtMs: Date.now(),
        scope,
        context: { idempotencyKey, correlationId },
        ...(normalized.latitude !== undefined
          ? { latitude: normalized.latitude, longitude: normalized.longitude }
          : {}),
      };
    },
    parse: parseStoredAttempt,
  });
}

export async function findPendingCaptainDeliveryStatusCommandAttempt(
  actorId: string,
  assignmentId: string,
): Promise<StoredCaptainDeliveryStatusCommandAttempt | null> {
  const normalizedActorId = actorId.trim();
  const normalizedAssignmentId = assignmentId.trim();
  if (!normalizedActorId || !normalizedAssignmentId) {
    throw new Error("Captain delivery status pending command identity is incomplete");
  }
  const entityId = `assignment:${normalizedAssignmentId}`;
  const identity = await resolveMutationIdentityScope(normalizedActorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  const attempts = await findDurableMutationAttempts(OPERATION, scope, parseStoredAttempt);
  if (attempts.length > 1) {
    throw new Error("Multiple unresolved Captain delivery status commands exist for this assignment");
  }
  return attempts[0] ?? null;
}

export function captainDeliveryStatusCommandIntentFromAttempt(
  attempt: StoredCaptainDeliveryStatusCommandAttempt,
): CaptainDeliveryStatusCommandIntent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(attempt.signature);
  } catch {
    throw new Error("Captain delivery status command signature is corrupt");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Captain delivery status command signature is invalid");
  }
  const command = parsed as Partial<CaptainDeliveryStatusCommandIntent>;
  const expectedVersion = command.expectedVersion;
  if (typeof command.assignmentId !== "string"
    || typeof command.expectedStatus !== "string"
    || typeof command.nextStatus !== "string"
    || typeof expectedVersion !== "number"
    || !Number.isInteger(expectedVersion)
    || expectedVersion < 1) {
    throw new Error("Captain delivery status command signature is incomplete");
  }
  const intent: CaptainDeliveryStatusCommandIntent = {
    actorId: attempt.scope.actorId,
    assignmentId: command.assignmentId,
    expectedStatus: command.expectedStatus as DshDeliveryStatus,
    nextStatus: command.nextStatus as DshDeliveryStatus,
    expectedVersion,
    ...(attempt.latitude !== undefined && attempt.longitude !== undefined
      ? { latitude: attempt.latitude, longitude: attempt.longitude }
      : {}),
  };
  if (attempt.scope.entityId !== `assignment:${intent.assignmentId}`) {
    throw new Error("Captain delivery status command assignment scope mismatch");
  }
  return normalizeIntent(intent);
}

export async function clearCaptainDeliveryStatusCommandAttempt(
  intent: CaptainDeliveryStatusCommandIntent,
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
