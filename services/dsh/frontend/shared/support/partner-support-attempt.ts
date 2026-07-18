import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DshCreateTicketInput } from "./support.types";
import type { PartnerSupportMutationContext } from "./partner-support.api";

const CREATE_ATTEMPT_KEY = "@bthwani/dsh/partner-support/create-attempt/v1";
const MESSAGE_ATTEMPT_PREFIX = "@bthwani/dsh/partner-support/message-attempt/v1/";

let fallbackSequence = 0;

function uniquePart(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
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
};

function parseAttempt(raw: string | null): PersistedAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PersistedAttempt>;
    if (
      typeof value.fingerprint === "string" &&
      typeof value.context?.idempotencyKey === "string" &&
      typeof value.context?.correlationId === "string"
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

export async function getOrCreatePartnerTicketAttempt(
  input: DshCreateTicketInput,
): Promise<PersistedAttempt> {
  const fingerprint = createFingerprint(input);
  const stored = parseAttempt(await AsyncStorage.getItem(CREATE_ATTEMPT_KEY));
  if (stored?.fingerprint === fingerprint) return stored;
  const attempt = { fingerprint, context: newContext("partner-ticket-create") } as const;
  await AsyncStorage.setItem(CREATE_ATTEMPT_KEY, JSON.stringify(attempt));
  return attempt;
}

export async function clearPartnerTicketAttempt(fingerprint: string): Promise<void> {
  const stored = parseAttempt(await AsyncStorage.getItem(CREATE_ATTEMPT_KEY));
  if (stored?.fingerprint === fingerprint) {
    await AsyncStorage.removeItem(CREATE_ATTEMPT_KEY);
  }
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
  const stored = parseAttempt(await AsyncStorage.getItem(key));
  if (stored?.fingerprint === fingerprint) return stored;
  const attempt = { fingerprint, context: newContext(`partner-message:${ticketId}`) } as const;
  await AsyncStorage.setItem(key, JSON.stringify(attempt));
  return attempt;
}

export async function clearPartnerMessageAttempt(
  ticketId: string,
  fingerprint: string,
): Promise<void> {
  const key = messageAttemptKey(ticketId);
  const stored = parseAttempt(await AsyncStorage.getItem(key));
  if (stored?.fingerprint === fingerprint) {
    await AsyncStorage.removeItem(key);
  }
}
