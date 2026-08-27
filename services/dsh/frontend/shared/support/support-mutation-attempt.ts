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
  };
};

type SupportMutationScope = "actor" | "client" | "operator" | "partner";

const PREFIX = "@bthwani/dsh/support-mutation/v2/";
function nextPart(): string {
  return secureRandomId();
}

function keyFor(scope: SupportMutationScope, operation: string, entityId?: string): string {
  return `${PREFIX}${scope}/${operation}/${entityId ?? "root"}`;
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

export async function getOrCreateSupportMutationAttempt(input: {
  readonly scope: SupportMutationScope;
  readonly operation: string;
  readonly entityId?: string;
  readonly fingerprint: string;
}): Promise<StoredAttempt> {
  const storageKey = keyFor(input.scope, input.operation, input.entityId);
  const entityId = `${input.scope}/${input.operation}/${input.entityId ?? "root"}`;
  const scope = await resolveMutationIdentityScope("", { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };

  const existing = parseStored(await bthwaniDurableStorage.getItem(storageKey));
  if (existing?.fingerprint === input.fingerprint) {
    if (existing.scope.actorId !== scoped.actorId) {
      throw new MutationIdentityScopeError(
        "actor_mismatch",
        `support attempt belongs to a different actor (${existing.scope.actorId}); refusing to reuse it for ${scoped.actorId}`,
      );
    }
    if (existing.scope.installationId !== scoped.installationId) {
      throw new MutationIdentityScopeError(
        "installation_mismatch",
        `support attempt belongs to a different installation (${existing.scope.installationId}); refusing to reuse it for ${scoped.installationId}`,
      );
    }
    if (existing.scope.entityId !== entityId) {
      await bthwaniDurableStorage.removeItem(storageKey);
    } else {
      return existing;
    }
  }

  const part = nextPart();
  const created: StoredAttempt = {
    fingerprint: input.fingerprint,
    scope: scoped,
    context: {
      idempotencyKey: `${input.scope}:${input.operation}:${part}`,
      correlationId: `support:${input.scope}:${part}`,
    },
  };
  await bthwaniDurableStorage.setItem(storageKey, JSON.stringify(created));
  return created;
}

export async function clearSupportMutationAttempt(input: {
  readonly scope: SupportMutationScope;
  readonly operation: string;
  readonly entityId?: string;
  readonly fingerprint: string;
}): Promise<void> {
  const storageKey = keyFor(input.scope, input.operation, input.entityId);
  const existing = parseStored(await bthwaniDurableStorage.getItem(storageKey));
  if (!existing || existing.fingerprint !== input.fingerprint) return;
  await bthwaniDurableStorage.removeItem(storageKey);
}
