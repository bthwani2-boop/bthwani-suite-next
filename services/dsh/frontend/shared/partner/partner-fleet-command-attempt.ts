import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  findDurableMutationAttempts,
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureCorrelationId, secureRandomId } from "../_kernel/secure-random.ts";
import type { DshPartnerFleetMutationContext } from "./partner-fleet.api";

const OPERATION = "captain-partner-fleet-command";

export type CaptainPartnerFleetCommandIntent =
  | {
      readonly actorId: string;
      readonly command: "connect";
      readonly code: string;
    }
  | {
      readonly actorId: string;
      readonly command: "disconnect";
      readonly teamMemberId: string;
      readonly storeId: string;
      readonly expectedVersion: number;
    };

export type StoredCaptainPartnerFleetCommandAttempt = DurableMutationAttemptEnvelope<DshPartnerFleetMutationContext> & {
  readonly signature: string;
  readonly command: CaptainPartnerFleetCommandIntent["command"];
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly code?: string;
  readonly createdAtMs: number;
};

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function normalizeIntent(intent: CaptainPartnerFleetCommandIntent): CaptainPartnerFleetCommandIntent {
  const actorId = intent.actorId.trim();
  if (!actorId) throw new Error("Captain partner fleet actor id is required");
  if (intent.command === "connect") {
    const code = intent.code.replace(/-/g, "").trim().toUpperCase();
    if (code.length < 8 || code.length > 16 || !/^[A-Z0-9]+$/.test(code)) {
      throw new Error("Captain partner fleet connection code is invalid");
    }
    return { actorId, command: "connect", code };
  }
  const teamMemberId = intent.teamMemberId.trim();
  const storeId = intent.storeId.trim();
  if (!teamMemberId || !storeId) throw new Error("Captain partner fleet membership identity is incomplete");
  if (!Number.isInteger(intent.expectedVersion) || intent.expectedVersion < 1) {
    throw new Error("Captain partner fleet membership version is invalid");
  }
  return { actorId, command: "disconnect", teamMemberId, storeId, expectedVersion: intent.expectedVersion };
}

function attemptIdentity(intent: CaptainPartnerFleetCommandIntent) {
  const normalized = normalizeIntent(intent);
  const signature = normalized.command === "connect"
    ? JSON.stringify({ command: normalized.command, code: normalized.code })
    : JSON.stringify({
        command: normalized.command,
        teamMemberId: normalized.teamMemberId,
        storeId: normalized.storeId,
        expectedVersion: normalized.expectedVersion,
      });
  return {
    entityId: normalized.command === "connect"
      ? "connect"
      : `disconnect:${normalized.teamMemberId}`,
    signature,
    fingerprint: stableHash(signature),
  };
}

function parseStoredAttempt(value: unknown): value is StoredCaptainPartnerFleetCommandAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredCaptainPartnerFleetCommandAttempt>;
  return typeof parsed.signature === "string"
    && typeof parsed.fingerprint === "string"
    && typeof parsed.command === "string"
    && (parsed.command === "connect" || parsed.command === "disconnect")
    && typeof parsed.idempotencyKey === "string"
    && parsed.idempotencyKey === parsed.context?.idempotencyKey
    && typeof parsed.correlationId === "string"
    && parsed.correlationId === parsed.context?.correlationId
    && typeof parsed.createdAtMs === "number"
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string"
    && (parsed.command !== "connect" || typeof parsed.code === "string");
}

export async function getOrCreateCaptainPartnerFleetCommandAttempt(
  intent: CaptainPartnerFleetCommandIntent,
): Promise<StoredCaptainPartnerFleetCommandAttempt> {
  const normalized = normalizeIntent(intent);
  const { entityId, signature, fingerprint } = attemptIdentity(normalized);
  const identity = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope,
    fingerprint,
    create: () => {
      const idempotencyKey = `captain-partner-fleet:${secureRandomId()}`;
      const correlationId = secureCorrelationId("captain-partner-fleet");
      return {
        signature,
        fingerprint,
        command: normalized.command,
        idempotencyKey,
        correlationId,
        ...(normalized.command === "connect" ? { code: normalized.code } : {}),
        createdAtMs: Date.now(),
        scope,
        context: { idempotencyKey, correlationId },
      };
    },
    parse: parseStoredAttempt,
  });
}

export async function findPendingCaptainPartnerFleetConnectAttempt(
  actorId: string,
): Promise<StoredCaptainPartnerFleetCommandAttempt | null> {
  const normalizedActorId = actorId.trim();
  if (!normalizedActorId) throw new Error("Captain partner fleet actor id is required");
  const entityId = "connect";
  const identity = await resolveMutationIdentityScope(normalizedActorId, { entityId });
  const scope = { actorId: identity.actorId, installationId: identity.installationId, entityId };
  const attempts = await findDurableMutationAttempts(OPERATION, scope, parseStoredAttempt);
  if (attempts.length > 1) {
    throw new Error("Multiple unresolved Captain partner fleet connection commands exist");
  }
  return attempts[0] ?? null;
}

export async function clearCaptainPartnerFleetCommandAttempt(
  intent: CaptainPartnerFleetCommandIntent,
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
