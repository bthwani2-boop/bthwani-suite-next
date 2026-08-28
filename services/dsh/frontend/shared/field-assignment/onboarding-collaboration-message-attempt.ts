import { resolveMutationIdentityScope } from "@bthwani/data-runtime/mutation-identity-scope";
import type { DurableMutationAttemptEnvelope } from "../_kernel/durable-mutation-attempt-registry.ts";
import {
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../_kernel/durable-mutation-attempt-registry.ts";
import { secureRandomId } from "../_kernel/secure-random.ts";

const OPERATION = "onboarding-collaboration-message-create";

export type OnboardingCollaborationMessageAttemptIntent = {
  readonly surface: "app-field" | "control-panel";
  readonly actorId: string;
  readonly partnerId: string;
  readonly assignmentId?: string;
  readonly documentId?: string;
  readonly body: string;
};

export type StoredOnboardingCollaborationMessageAttempt = DurableMutationAttemptEnvelope<{
  readonly clientMessageId: string;
}> & {
  readonly signature: string;
  readonly clientMessageId: string;
  readonly createdAtMs: number;
};

type NormalizedIntent = Required<Omit<OnboardingCollaborationMessageAttemptIntent, "assignmentId" | "documentId">> & {
  readonly assignmentId: string;
  readonly documentId: string;
};

function normalizeIntent(input: OnboardingCollaborationMessageAttemptIntent): NormalizedIntent {
  const actorId = input.actorId.trim();
  const partnerId = input.partnerId.trim();
  const assignmentId = input.assignmentId?.trim() ?? "";
  const documentId = input.documentId?.trim() ?? "";
  const body = input.body.trim();
  if (!actorId) throw new Error("collaboration message actor id is required");
  if (!partnerId) throw new Error("collaboration message partner id is required");
  if (!assignmentId && !documentId) throw new Error("collaboration message object scope is required");
  if (!body || body.length > 4000) throw new Error("collaboration message body is invalid");
  return { ...input, actorId, partnerId, assignmentId, documentId, body };
}

function attemptIdentity(input: NormalizedIntent): {
  readonly entityId: string;
  readonly signature: string;
} {
  return {
    entityId: [input.surface, input.partnerId, input.assignmentId, input.documentId].join("|"),
    signature: JSON.stringify({
      surface: input.surface,
      actorId: input.actorId,
      partnerId: input.partnerId,
      assignmentId: input.assignmentId,
      documentId: input.documentId,
      body: input.body,
    }),
  };
}

function parseStoredAttempt(value: unknown): value is StoredOnboardingCollaborationMessageAttempt {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<StoredOnboardingCollaborationMessageAttempt>;
  return typeof parsed.signature === "string"
    && typeof parsed.fingerprint === "string"
    && parsed.signature === parsed.fingerprint
    && typeof parsed.clientMessageId === "string"
    && typeof parsed.context?.clientMessageId === "string"
    && parsed.clientMessageId === parsed.context.clientMessageId
    && typeof parsed.createdAtMs === "number"
    && typeof parsed.scope?.actorId === "string"
    && typeof parsed.scope?.installationId === "string"
    && typeof parsed.scope?.entityId === "string";
}

export async function getOrCreateOnboardingCollaborationMessageAttempt(
  input: OnboardingCollaborationMessageAttemptIntent,
): Promise<StoredOnboardingCollaborationMessageAttempt> {
  const normalized = normalizeIntent(input);
  const { entityId, signature } = attemptIdentity(normalized);
  const scope = await resolveMutationIdentityScope(normalized.actorId, { entityId });
  const scoped = { actorId: scope.actorId, installationId: scope.installationId, entityId };
  return getOrCreateDurableMutationAttempt({
    operation: OPERATION,
    scope: scoped,
    fingerprint: signature,
    create: () => {
      const clientMessageId = `onboarding-message:${normalized.surface}:${secureRandomId()}`;
      return {
        signature,
        fingerprint: signature,
        clientMessageId,
        createdAtMs: Date.now(),
        scope: scoped,
        context: { clientMessageId },
      };
    },
    parse: parseStoredAttempt,
  });
}

export async function clearOnboardingCollaborationMessageAttempt(
  input: OnboardingCollaborationMessageAttemptIntent,
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
