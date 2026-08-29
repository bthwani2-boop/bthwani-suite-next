import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureRandomId } from "../_kernel/secure-random.ts";
import type {
  ClientProfileConsentsInput,
  ClientProfilePreferencesInput,
} from "./client-profile.types";

const OPERATION = "client-profile-mutation";

export type ClientProfileMutationOperation = "preferences" | "consents";

export type ClientProfileMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export type ClientProfileMutationIntent = {
  readonly actorId: string;
  readonly operation: ClientProfileMutationOperation;
  readonly input: ClientProfilePreferencesInput | ClientProfileConsentsInput;
};

export type StoredClientProfileMutationAttempt = DurableMutationAttemptEnvelope<ClientProfileMutationContext> & {
  readonly signature: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

function normalizeIntent(intent: ClientProfileMutationIntent) {
  const actorId = intent.actorId.trim();
  if (!actorId) throw new Error("client profile mutation actor id is required");
  if (intent.operation === "preferences") {
    const input = intent.input as ClientProfilePreferencesInput;
    return {
      actorId,
      operation: intent.operation,
      input: {
        locale: input.locale.trim(),
        currencyPreference: input.currencyPreference.trim(),
        expectedVersion: input.expectedVersion ?? 0,
      },
    };
  }
  const input = intent.input as ClientProfileConsentsInput;
  return {
    actorId,
    operation: intent.operation,
    input: {
      marketingConsentEmail: input.marketingConsentEmail === true,
      marketingConsentSms: input.marketingConsentSms === true,
      marketingConsentPush: input.marketingConsentPush === true,
      expectedVersion: input.expectedVersion ?? 0,
    },
  };
}

function identity(intent: ClientProfileMutationIntent) {
  const normalized = normalizeIntent(intent);
  return {
    ...normalized,
    entityId: `client-profile:${normalized.operation}`,
    signature: JSON.stringify({ operation: normalized.operation, input: normalized.input }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredClientProfileMutationAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredClientProfileMutationAttempt>;
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

export async function getOrCreateClientProfileMutationAttempt(
  intent: ClientProfileMutationIntent,
): Promise<StoredClientProfileMutationAttempt> {
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
      const idempotencyKey = `client-profile:${current.operation}:${secureRandomId()}`;
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

export async function clearClientProfileMutationAttempt(
  intent: ClientProfileMutationIntent,
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
