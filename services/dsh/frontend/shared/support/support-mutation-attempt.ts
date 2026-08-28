import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";
import { secureRandomId } from "../_kernel/secure-random.ts";

export type SupportMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

type StoredAttempt = {
  readonly fingerprint: string;
  readonly context: SupportMutationContext;
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
    readonly scope: SupportMutationScope;
  };
};

type SupportMutationScope = "actor" | "client" | "operator" | "partner";

const PREFIX = "@bthwani/dsh/support-mutation/v3/";

function encode(value: string): string {
  return encodeURIComponent(value.trim());
}

function nextPart(): string {
  return secureRandomId();
}

function keyFor(
  scope: StoredAttempt["scope"],
  operation: string,
  entityId?: string,
): string {
  return `${PREFIX}${encode(scope.actorId)}/${encode(scope.installationId)}/${encode(scope.scope)}/${encode(operation)}/${encode(entityId ?? "root")}`;
}

function parseStored(raw: string | null): StoredAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredAttempt>;
    if (
      typeof value.fingerprint === "string"
      && typeof value.context?.idempotencyKey === "string"
      && typeof value.context?.correlationId === "string"
      && typeof value.scope?.actorId === "string"
      && typeof value.scope?.installationId === "string"
      && typeof value.scope?.entityId === "string"
    ) {
      return value as StoredAttempt;
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveScope(
  actorId: string,
  scope: SupportMutationScope,
  operation: string,
  entityId?: string,
): Promise<StoredAttempt["scope"]> {
  const normalizedEntityId = `${scope}/${operation}/${entityId ?? "root"}`;
  const identity = await resolveMutationIdentityScope(actorId, { entityId: normalizedEntityId });
  return {
    actorId: identity.actorId,
    installationId: identity.installationId,
    entityId: normalizedEntityId,
    scope,
  };
}

export async function getOrCreateSupportMutationAttempt(input: {
  readonly actorId: string;
  readonly scope: SupportMutationScope;
  readonly operation: string;
  readonly entityId?: string;
  readonly fingerprint: string;
}): Promise<StoredAttempt> {
  const resolvedScope = await resolveScope(input.actorId, input.scope, input.operation, input.entityId);
  const storageKey = keyFor(resolvedScope, input.operation, input.entityId);
  const existing = parseStored(await bthwaniDurableStorage.getItem(storageKey));
  if (existing?.fingerprint === input.fingerprint) {
    if (existing.scope.actorId !== resolvedScope.actorId) {
      throw new MutationIdentityScopeError(
        "actor_mismatch",
        `support attempt belongs to a different actor (${existing.scope.actorId}); refusing to reuse it for ${resolvedScope.actorId}`,
      );
    }
    if (existing.scope.installationId !== resolvedScope.installationId) {
      throw new MutationIdentityScopeError(
        "installation_mismatch",
        `support attempt belongs to a different installation (${existing.scope.installationId}); refusing to reuse it for ${resolvedScope.installationId}`,
      );
    }
    if (existing.scope.entityId !== resolvedScope.entityId) {
      throw new MutationIdentityScopeError(
        "entity_mismatch",
        `support attempt belongs to a different entity (${existing.scope.entityId}); refusing to reuse it for ${resolvedScope.entityId}`,
      );
    }
    return existing;
  }

  const part = nextPart();
  const created: StoredAttempt = {
    fingerprint: input.fingerprint,
    scope: resolvedScope,
    context: {
      idempotencyKey: `support:${input.scope}:${input.operation}:${part}`,
      correlationId: `support:${input.scope}:${input.operation}:${part}`,
    },
  };
  await bthwaniDurableStorage.setItem(storageKey, JSON.stringify(created));
  return created;
}

export async function clearSupportMutationAttempt(input: {
  readonly actorId: string;
  readonly scope: SupportMutationScope;
  readonly operation: string;
  readonly entityId?: string;
  readonly fingerprint: string;
}): Promise<void> {
  const resolvedScope = await resolveScope(input.actorId, input.scope, input.operation, input.entityId);
  const storageKey = keyFor(resolvedScope, input.operation, input.entityId);
  const existing = parseStored(await bthwaniDurableStorage.getItem(storageKey));
  if (!existing || existing.fingerprint !== input.fingerprint) return;
  await bthwaniDurableStorage.removeItem(storageKey);
}
