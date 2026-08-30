import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureRandomId } from "../_kernel/secure-random.ts";
import { cancelOrder } from "./order-cancellation.api.ts";
import type {
  CancelOrderResponse,
  OrderCancellationReasonCode,
  OrderCancellationSurface,
} from "./order-cancellation.types.ts";

const OPERATION = "order-cancellation-create";

export type OrderCancellationAttemptIntent = {
  readonly surface: OrderCancellationSurface;
  readonly actorId: string;
  readonly orderId: string;
  readonly reasonCode: OrderCancellationReasonCode;
  readonly reasonNote?: string | undefined;
  readonly ticketReference?: string | undefined;
};

export type StoredOrderCancellationAttempt = DurableMutationAttemptEnvelope<{
  readonly commandId: string;
  readonly correlationId: string;
}> & {
  readonly signature: string;
  readonly commandId: string;
  readonly correlationId: string;
  readonly createdAtMs: number;
};

type NormalizedIntent = Omit<OrderCancellationAttemptIntent, "reasonNote" | "ticketReference"> & {
  readonly reasonNote: string;
  readonly ticketReference: string;
};

function normalizeIntent(input: OrderCancellationAttemptIntent): NormalizedIntent {
  const actorId = input.actorId.trim();
  const orderId = input.orderId.trim();
  const reasonNote = input.reasonNote?.trim() ?? "";
  const ticketReference = input.ticketReference?.trim() ?? "";
  if (!actorId) throw new Error("order cancellation actor id is required");
  if (!orderId) throw new Error("order cancellation order id is required");
  if (input.surface === "operator" && !ticketReference) {
    throw new Error("operator order cancellation ticket reference is required");
  }
  return { ...input, actorId, orderId, reasonNote, ticketReference };
}

function attemptIdentity(input: NormalizedIntent): { readonly entityId: string; readonly signature: string } {
  return {
    entityId: `${input.surface}|${input.orderId}`,
    signature: JSON.stringify({
      surface: input.surface,
      actorId: input.actorId,
      orderId: input.orderId,
      reasonCode: input.reasonCode,
      reasonNote: input.reasonNote,
      ticketReference: input.ticketReference,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredOrderCancellationAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredOrderCancellationAttempt>;
  return typeof parsed.signature === "string"
    && typeof parsed.fingerprint === "string"
    && parsed.signature === parsed.fingerprint
    && typeof parsed.commandId === "string"
    && typeof parsed.correlationId === "string"
    && parsed.commandId === parsed.correlationId
    && typeof parsed.context?.commandId === "string"
    && typeof parsed.context?.correlationId === "string"
    && parsed.commandId === parsed.context.commandId
    && parsed.correlationId === parsed.context.correlationId
    && typeof parsed.createdAtMs === "number"
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string";
}

export async function getOrCreateOrderCancellationAttempt(
  input: OrderCancellationAttemptIntent,
): Promise<StoredOrderCancellationAttempt> {
  const normalized = normalizeIntent(input);
  const { entityId, signature } = attemptIdentity(normalized);
  const scope = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint: signature,
    create: () => {
      const commandId = `${normalized.surface}:order-cancel:${secureRandomId()}`;
      return {
        signature,
        fingerprint: signature,
        commandId,
        correlationId: commandId,
        createdAtMs: Date.now(),
        scope: scoped,
        context: { commandId, correlationId: commandId },
      };
    },
    parse: parseStoredAttempt,
  });
}

export async function clearOrderCancellationAttempt(
  input: OrderCancellationAttemptIntent,
  signature: string,
): Promise<void> {
  const normalizedSignature = signature.trim();
  if (!normalizedSignature) return;
  const normalized = normalizeIntent(input);
  const { entityId } = attemptIdentity(normalized);
  const scope = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  await purgeExactDurableMutationAttempt(
    OPERATION,
    { actorId: scope.actorId, installationId: scope.installationId, entityId },
    normalizedSignature,
    parseStoredAttempt,
  );
}

export async function executeDurableOrderCancellation(
  input: OrderCancellationAttemptIntent,
  token?: string,
): Promise<CancelOrderResponse> {
  const normalized = normalizeIntent(input);
  const attempt = await getOrCreateOrderCancellationAttempt(normalized);
  const response = await cancelOrder(normalized.surface, normalized.orderId, {
    reasonCode: normalized.reasonCode,
    reasonNote: normalized.reasonNote,
    commandId: attempt.commandId,
    correlationId: attempt.correlationId,
    ...(normalized.ticketReference ? { ticketReference: normalized.ticketReference } : {}),
  }, token);
  if (response.cancellation.correlationId !== attempt.correlationId) {
    throw new Error("order cancellation canonical readback did not preserve the command identity");
  }
  await clearOrderCancellationAttempt(normalized, attempt.signature);
  return response;
}
