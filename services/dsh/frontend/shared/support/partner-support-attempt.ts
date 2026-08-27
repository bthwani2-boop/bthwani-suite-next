import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";
import type { DshCreateTicketInput } from "./support.types";
import type { PartnerSupportMutationContext } from "./partner-support.api";
import { secureRandomId } from "../_kernel/secure-random.ts";

const CREATE_ATTEMPT_PREFIX = "@bthwani/dsh/partner-support/create-attempt/v3/";
const MESSAGE_ATTEMPT_PREFIX = "@bthwani/dsh/partner-support/message-attempt/v3/";

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

function createAttemptKey(scope: { readonly actorId: string; readonly installationId: string }): string {
  return `${CREATE_ATTEMPT_PREFIX}${encodeURIComponent(scope.actorId)}/${encodeURIComponent(scope.installationId)}`;
}

function messageAttemptKey(
  scope: { readonly actorId: string; readonly installationId: string },
  ticketId: string,
): string {
  return `${MESSAGE_ATTEMPT_PREFIX}${encodeURIComponent(scope.actorId)}/${encodeURIComponent(scope.installationId)}/${encodeURIComponent(ticketId)}`;
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
  actorId: string,
  input: DshCreateTicketInput,
): Promise<PersistedAttempt> {
  const fingerprint = createFingerprint(input);
  const entityId = fingerprint.slice(0, 32);
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  const key = createAttemptKey(scoped);

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
    context: newContext("partner-ticket-create"),
    scope: scoped,
  } as const;
  await bthwaniDurableStorage.setItem(key, JSON.stringify(attempt));
  return attempt;
}

export async function clearPartnerTicketAttempt(actorId: string): Promise<void> {
  const scope = await resolveMutationIdentityScope(actorId, { entityId: "partner-ticket-create-cleanup" });
  await bthwaniDurableStorage.removeItem(createAttemptKey(scope));
}

export async function getOrCreatePartnerMessageAttempt(
  actorId: string,
  ticketId: string,
  body: string,
): Promise<PersistedAttempt> {
  const fingerprint = JSON.stringify({ ticketId, body: body.trim() });
  const entityId = `${ticketId}:${fingerprint.slice(0, 16)}`;
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  const key = messageAttemptKey(scoped, ticketId);

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
  return attempt;
}

export async function clearPartnerMessageAttempt(actorId: string, ticketId: string): Promise<void> {
  const scope = await resolveMutationIdentityScope(actorId, { entityId: `${ticketId}:cleanup` });
  await bthwaniDurableStorage.removeItem(messageAttemptKey(scope, ticketId));
}
