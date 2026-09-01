import { bthwaniSensitiveStorage } from "@bthwani/data-runtime/sensitive-storage-adapter";
import {
  MutationIdentityScopeError,
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";
import type { DshCreateTicketInput } from "./support.types";
import type { PartnerSupportMutationContext } from "./partner-support.api";
import { secureRandomId } from "../_kernel/secure-random.ts";
import {
  ensureSensitiveSupportAttemptsMigrated,
  opaqueSupportFingerprint,
  SENSITIVE_PARTNER_CREATE_ATTEMPT_PREFIX,
  SENSITIVE_PARTNER_MESSAGE_ATTEMPT_PREFIX,
} from "./sensitive-support-attempt-storage.ts";

const CREATE_ATTEMPT_PREFIX = SENSITIVE_PARTNER_CREATE_ATTEMPT_PREFIX;
const MESSAGE_ATTEMPT_PREFIX = SENSITIVE_PARTNER_MESSAGE_ATTEMPT_PREFIX;

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
  return opaqueSupportFingerprint(JSON.stringify({
    subject: input.subject.trim(),
    description: input.description.trim(),
    category: input.category,
    priority: input.priority ?? "normal",
    storeId: input.storeId?.trim() ?? "",
    orderId: input.orderId?.trim() ?? "",
  }));
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

  await ensureSensitiveSupportAttemptsMigrated();
  const stored = parseAttempt(await bthwaniSensitiveStorage.getItem(key));
  if (stored?.fingerprint === fingerprint) {
    assertScopeMatchesStored(stored, scoped);
    if (stored.scope.entityId !== entityId) {
      await bthwaniSensitiveStorage.removeItem(key);
    } else {
      return stored;
    }
  }
  const attempt = {
    fingerprint,
    context: newContext("partner-ticket-create"),
    scope: scoped,
  } as const;
  await bthwaniSensitiveStorage.setItem(key, JSON.stringify(attempt));
  return attempt;
}

export async function clearPartnerTicketAttempt(actorId: string): Promise<void> {
  await ensureSensitiveSupportAttemptsMigrated();
  const scope = await resolveMutationIdentityScope(actorId, { entityId: "partner-ticket-create-cleanup" });
  await bthwaniSensitiveStorage.removeItem(createAttemptKey(scope));
}

export async function getOrCreatePartnerMessageAttempt(
  actorId: string,
  ticketId: string,
  body: string,
): Promise<PersistedAttempt> {
  const fingerprint = opaqueSupportFingerprint(JSON.stringify({ ticketId, body: body.trim() }));
  const entityId = `${ticketId}:${fingerprint.slice(0, 16)}`;
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  const key = messageAttemptKey(scoped, ticketId);

  await ensureSensitiveSupportAttemptsMigrated();
  const stored = parseAttempt(await bthwaniSensitiveStorage.getItem(key));
  if (stored?.fingerprint === fingerprint) {
    assertScopeMatchesStored(stored, scoped);
    if (stored.scope.entityId !== entityId) {
      await bthwaniSensitiveStorage.removeItem(key);
    } else {
      return stored;
    }
  }
  const attempt = {
    fingerprint,
    context: newContext(`partner-message:${ticketId}`),
    scope: scoped,
  } as const;
  await bthwaniSensitiveStorage.setItem(key, JSON.stringify(attempt));
  return attempt;
}

export async function clearPartnerMessageAttempt(actorId: string, ticketId: string): Promise<void> {
  await ensureSensitiveSupportAttemptsMigrated();
  const scope = await resolveMutationIdentityScope(actorId, { entityId: `${ticketId}:cleanup` });
  await bthwaniSensitiveStorage.removeItem(messageAttemptKey(scope, ticketId));
}
