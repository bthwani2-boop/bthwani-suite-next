import {
  resolveMutationIdentityScope,
} from "@bthwani/data-runtime/mutation-identity-scope";
import type {
  CreateOrderTruthInput,
  OrderTruthMutationContext,
} from "./order-truth.types";
import { secureRandomId } from "../_kernel/secure-random.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";

const OPERATION = "order-truth-create";

type StoredOrderTruthAttempt = {
  readonly fingerprint: string;
  readonly context: OrderTruthMutationContext;
  readonly scope: {
    readonly actorId: string;
    readonly installationId: string;
    readonly entityId: string;
  };
};

function uniquePart(): string {
  return secureRandomId();
}

export function fingerprintOrderTruthInput(input: CreateOrderTruthInput): string {
  return JSON.stringify({ checkoutIntentId: input.checkoutIntentId.trim() });
}

function newAttempt(
  fingerprint: string,
  scope: { readonly actorId: string; readonly installationId: string; readonly entityId: string },
): StoredOrderTruthAttempt {
  const idempotencyPart = uniquePart();
  const correlationPart = uniquePart();
  return {
    fingerprint,
    scope,
    context: {
      idempotencyKey: `order-create-key:${idempotencyPart}`,
      correlationId: `order-create-correlation:${correlationPart}`,
    },
  };
}

function isStoredAttempt(value: unknown): value is StoredOrderTruthAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredOrderTruthAttempt>;
  return typeof candidate.fingerprint === "string"
    && typeof candidate.context?.idempotencyKey === "string"
    && candidate.context.idempotencyKey.length >= 16
    && typeof candidate.context?.correlationId === "string"
    && candidate.context.correlationId.length >= 8
    && candidate.context.correlationId !== candidate.context.idempotencyKey
    && typeof candidate.scope?.actorId === "string"
    && candidate.scope.actorId.length > 0
    && typeof candidate.scope?.installationId === "string"
    && candidate.scope.installationId.length > 0
    && typeof candidate.scope?.entityId === "string";
}

export async function getOrCreateOrderTruthAttempt(
  actorId: string,
  input: CreateOrderTruthInput,
): Promise<StoredOrderTruthAttempt> {
  const fingerprint = fingerprintOrderTruthInput(input);
  const entityId = input.checkoutIntentId.trim();
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint,
    create: () => newAttempt(fingerprint, scoped),
    parse: isStoredAttempt,
  });
}

export async function clearOrderTruthAttempt(actorId: string, fingerprint: string): Promise<void> {
  const normalizedFingerprint = fingerprint.trim();
  if (!normalizedFingerprint) return;
  const entityId = normalizedFingerprint.startsWith('{')
    ? (() => { try { return (JSON.parse(normalizedFingerprint) as { checkoutIntentId?: string }).checkoutIntentId?.trim() ?? ''; } catch { return ''; } })()
    : normalizedFingerprint;
  if (!entityId) return;
  const scope = await resolveMutationIdentityScope(actorId, { entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: scope.actorId, installationId: scope.installationId, entityId },
    normalizedFingerprint,
    isStoredAttempt,
  );
}
