/**
 * Mutation identity scope key helper.
 *
 * Every persisted mutation-identity datum must be namespaced by the
 * live scope that owns it: actor (logged-in user), installation
 * (device + secure-store binding), and entity (the row the mutation
 * targets, e.g. orderId, ticketId, sessionId, addressId).
 *
 * Without this guard, an actor switch on the same device could
 * inherit the previous actor's idempotency key, a different
 * installation could replay a command that does not belong to it,
 * a different entity could share an identity with a previous one,
 * and a previous mutation could collide with a new one.
 */

import { BthwaniDurableWriteError } from "./storage-adapter.ts";
import { getBthwaniCurrentActor } from "./current-actor.ts";
import { getBthwaniInstallationId } from "./installation-id.ts";
import type { MutationIdentityScope } from "./mutation-identity-scope.types.ts";

export type { MutationIdentityScope } from "./mutation-identity-scope.types.ts";

export class MutationIdentityScopeError extends Error {
  readonly code = "MUTATION_IDENTITY_SCOPE_INVALID";
  readonly reason: "missing_actor" | "missing_installation" | "actor_mismatch" | "installation_mismatch" | "entity_mismatch";

  constructor(reason: MutationIdentityScopeError["reason"], message: string) {
    super(message);
    this.name = "MutationIdentityScopeError";
    this.reason = reason;
  }
}

export class MutationIdentityPersistenceError extends Error {
  readonly code = "MUTATION_IDENTITY_PERSISTENCE_FAILED";
  readonly key: string;
  readonly cause: unknown;

  constructor(key: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`mutation identity could not be persisted at key ${key}: ${reason}`);
    this.name = "MutationIdentityPersistenceError";
    this.key = key;
    this.cause = cause;
  }
}

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new MutationIdentityScopeError(
    label === "actor id" ? "missing_actor" : "missing_installation",
    `${label} is required for mutation identity scope`,
  );
  return normalized;
}

export function normalizeMutationIdentityScope(input: MutationIdentityScope): Required<Pick<MutationIdentityScope, "actorId" | "installationId">> & { readonly entityId?: string } {
  return {
    actorId: requireNonEmpty(input.actorId, "actor id"),
    installationId: requireNonEmpty(input.installationId, "installation id"),
    ...(input.entityId ? { entityId: input.entityId.trim() } : {}),
  };
}

export function mutationIdentityScopeKey(prefix: string, scope: MutationIdentityScope): string {
  const normalized = normalizeMutationIdentityScope(scope);
  const parts = [prefix, normalized.actorId, normalized.installationId];
  if (normalized.entityId) parts.push(normalized.entityId);
  return parts.join("/");
}

export function assertScopeMatches(
  stored: { readonly actorId?: string; readonly installationId?: string; readonly entityId?: string } | null | undefined,
  expected: MutationIdentityScope,
): void {
  if (!stored) return;
  const normalized = normalizeMutationIdentityScope(expected);
  if (typeof stored.actorId === "string" && stored.actorId !== normalized.actorId) {
    throw new MutationIdentityScopeError(
      "actor_mismatch",
      `mutation identity belongs to a different actor (${stored.actorId}); refusing to reuse it for ${normalized.actorId}`,
    );
  }
  if (typeof stored.installationId === "string" && stored.installationId !== normalized.installationId) {
    throw new MutationIdentityScopeError(
      "installation_mismatch",
      `mutation identity belongs to a different installation (${stored.installationId}); refusing to reuse it for ${normalized.installationId}`,
    );
  }
  if (
    normalized.entityId
    && typeof stored.entityId === "string"
    && stored.entityId !== normalized.entityId
  ) {
    throw new MutationIdentityScopeError(
      "entity_mismatch",
      `mutation identity belongs to a different entity (${stored.entityId}); refusing to reuse it for ${normalized.entityId}`,
    );
  }
}

/**
 * Resolve a mutation identity scope from the supplied actor id and
 * the runtime installation id.
 *
 * Callers must supply the actor id explicitly so the contract is
 * locally visible; the installation id is read from the durable
 * store so it survives reload, app restart, and the identity
 * session lifecycle. The current-actor binding is consulted only
 * as a last-resort safety net for legacy call sites.
 */
export async function resolveMutationIdentityScope(
  actorId: string,
  overrides?: { readonly installationId?: string; readonly entityId?: string },
): Promise<Required<Pick<MutationIdentityScope, "actorId" | "installationId">> & { readonly entityId?: string }> {
  const binding = getBthwaniCurrentActor();
  const trimmedActor = actorId.trim() || binding?.actorId.trim() || "";
  if (!trimmedActor) {
    throw new MutationIdentityScopeError(
      "missing_actor",
      "mutation identity scope requires an actor id",
    );
  }
  const trimmedInstallation = (overrides?.installationId ?? binding?.installationId ?? "").trim() || await getBthwaniInstallationId();
  if (!trimmedInstallation) {
    throw new MutationIdentityScopeError(
      "missing_installation",
      "mutation identity scope requires an installation id; durable storage is unavailable",
    );
  }
  return {
    actorId: trimmedActor,
    installationId: trimmedInstallation,
    ...(overrides?.entityId ? { entityId: overrides.entityId.trim() } : {}),
  };
}

export { BthwaniDurableWriteError };
