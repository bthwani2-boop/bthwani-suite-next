import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";
import type { DshCreateTicketInput } from "./support.types";
import type { PartnerSupportMutationContext } from "./partner-support.api";
import { secureRandomId } from "../_kernel/secure-random.ts";

const CREATE_ATTEMPT_KEY = "@bthwani/dsh/partner-support/create-attempt/v2";
const CREATE_ATTEMPT_KEY_LEGACY = "@bthwani/dsh/partner-support/create-attempt/v1";
const MESSAGE_ATTEMPT_PREFIX = "@bthwani/dsh/partner-support/message-attempt/v2/";
const MESSAGE_ATTEMPT_PREFIX_LEGACY = "@bthwani/dsh/partner-support/message-attempt/v1/";

function uniquePart(): string {
  return secureRandomId();
}

function newContext(prefix: string): PartnerSupportMutationContext {
  const part = uniquePart();
  return {
    idempotencyKey: `${prefix}:${part}`,
    correlationId: `partner-support:${part}`,
  };
}

type PersistedAttempt = {
  readonly fingerprint: string;
  readonly context: PartnerSupportMutationContext;
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
  };
};

function parseAttempt(raw: string | null): PersistedAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PersistedAttempt>;
    if (
      typeof value.fingerprint === "string"
      && typeof value.context?.idempotencyKey === "string"
      && typeof value.context?.correlationId === "string"
      && typeof value.scope?.actorId === "string"
      && typeof value.scope?.installationId === "string"
      && typeof value.scope?.entityId === "string"
    ) {
      return value as PersistedAttempt;
    }
  } catch {
    return null;
  }
  return null;
}

function createFingerprint(input: DshCreateTicketInput): string {
  return JSON.stringify({
    subject: input.subject.trim(),
    description: input.description.trim(),
    category: input.category,
    priority: input.priority ?? "normal",
    storeId: input.storeId?.trim() ?? "",
    orderId: input.orderId?.trim() ?? "",
  });
}

function assertScopeMatchesStored(stored: PersistedAttempt, scope: { readonly actorId: string; readonly installationId: string; readonly entityId: string }): void {
  if (stored.scope.actorId !== scope.actorId) {
    throw new MutationIdentityScopeError(
      "actor_mismatch",
      `partner-support attempt belongs to a different actor (${stored.scope.actorId}); refusing to reuse it for ${scope.actorId}`,
    );
  }
  if (stored.scope.installationId !== scope.installationId) {
    throw new MutationIdentityScopeError(
      "installation_mismatch",
      `partner-support attempt belongs to a different installation (${stored.scope.installationId}); refusing to reuse it for ${scope.installationId}`,
    );
  }
}

export async function getOrCreatePartnerTicketAttempt(
  input: DshCreateTicketInput,
): Promise<PersistedAttempt> {
  const fingerprint = createFingerprint(input);
  const entityId = fingerprint.slice(0, 32);
  const scope = await resolveMutationIdentityScope("", { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };

  const stored = parseAttempt(await bthwaniDurableStorage.getItem(CREATE_ATTEMPT_KEY));
  if (stored?.fingerprint === fingerprint) {
    assertScopeMatchesStored(stored, scoped);
    if (stored.scope.entityId !== entityId) {
      await bthwaniDurableStorage.removeItem(CREATE_ATTEMPT_KEY);
    } else {
      return stored;
    }
  }
  const attempt = {
    fingerprint,
    context: newContext("partner-ticket-create"),
    scope: scoped,
  } as const;
  await bthwaniDurableStorage.setItem(CREATE_ATTEMPT_KEY, JSON.stringify(attempt));
  const legacy = await bthwaniDurableStorage.getItem(CREATE_ATTEMPT_KEY_LEGACY);
  if (legacy) {
    await bthwaniDurableStorage.setItem(`${CREATE_ATTEMPT_KEY_LEGACY}:quarantine:${Date.now()}`, legacy);
    await bthwaniDurableStorage.removeItem(CREATE_ATTEMPT_KEY_LEGACY);
  }
  return attempt;
}

export async function clearPartnerTicketAttempt(): Promise<void> {
  await bthwaniDurableStorage.removeItem(CREATE_ATTEMPT_KEY);
}

function messageAttemptKey(ticketId: string): string {
  return `${MESSAGE_ATTEMPT_PREFIX}${ticketId}`;
}

export async function getOrCreatePartnerMessageAttempt(
  ticketId: string,
  body: string,
): Promise<PersistedAttempt> {
  const fingerprint = JSON.stringify({ ticketId, body: body.trim() });
  const key = messageAttemptKey(ticketId);
  const entityId = `${ticketId}:${fingerprint.slice(0, 16)}`;
  const scope = await resolveMutationIdentityScope("", { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };

  const stored = parseAttempt(await bthwaniDurableStorage.getItem(key));
  if (stored?.fingerprint === fingerprint) {
    assertScopeMatchesStored(stored, scoped);
    if (stored.scope.entityId !== entityId) {
      await bthwaniDurableStorage.removeItem(key);
    } else {
      return stored;
    }
  }
  const attempt = {
    fingerprint,
    context: newContext(`partner-message:${ticketId}`),
    scope: scoped,
  } as const;
  await bthwaniDurableStorage.setItem(key, JSON.stringify(attempt));
  const legacyKey = `${MESSAGE_ATTEMPT_PREFIX_LEGACY}${ticketId}`;
  const legacy = await bthwaniDurableStorage.getItem(legacyKey);
  if (legacy) {
    await bthwaniDurableStorage.setItem(`${legacyKey}:quarantine:${Date.now()}`, legacy);
    await bthwaniDurableStorage.removeItem(legacyKey);
  }
  return attempt;
}

export async function clearPartnerMessageAttempt(ticketId: string): Promise<void> {
  await bthwaniDurableStorage.removeItem(messageAttemptKey(ticketId));
}
