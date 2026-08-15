import { bthwaniKeyValueStorage as AsyncStorage } from "@bthwani/data-runtime";

import type { SubscriptionPaymentMethod } from "./subscription-lifecycle.types";

export type SubscriptionMutationOperation = "purchase" | "activate" | "renew" | "cancel";

export type SubscriptionMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

type StoredAttempt = {
  readonly fingerprint: string;
  readonly context: SubscriptionMutationContext;
  readonly operation: SubscriptionMutationOperation;
  readonly subject: string;
  readonly paymentMethod?: SubscriptionPaymentMethod;
};

const PREFIX = "@bthwani/dsh/subscription-mutation/v1/";
const LATEST_PURCHASE_KEY = `${PREFIX}purchase/latest`;
let fallbackSequence = 0;

function nextPart(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
}

function storageKey(operation: SubscriptionMutationOperation, subject: string): string {
  return `${PREFIX}${operation}/${subject}`;
}

function parseStored(raw: string | null): StoredAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredAttempt>;
    if (
      typeof value.fingerprint === "string" &&
      typeof value.operation === "string" &&
      typeof value.subject === "string" &&
      typeof value.context?.idempotencyKey === "string" &&
      typeof value.context?.correlationId === "string"
    ) {
      return value as StoredAttempt;
    }
  } catch {
    return null;
  }
  return null;
}

export async function getLatestSubscriptionPurchaseAttempt(): Promise<StoredAttempt | null> {
  return parseStored(await AsyncStorage.getItem(LATEST_PURCHASE_KEY));
}

export async function getOrCreateSubscriptionMutationAttempt(input: {
  readonly operation: SubscriptionMutationOperation;
  readonly subject: string;
  readonly fingerprint: string;
  readonly paymentMethod?: SubscriptionPaymentMethod;
}): Promise<StoredAttempt> {
  const key = storageKey(input.operation, input.subject);
  const existing = parseStored(await AsyncStorage.getItem(key));
  if (existing?.fingerprint === input.fingerprint) return existing;

  const part = nextPart();
  const created: StoredAttempt = {
    fingerprint: input.fingerprint,
    operation: input.operation,
    subject: input.subject,
    ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
    context: {
      idempotencyKey: `subscription:${input.operation}:${part}`,
      correlationId: `subscription:${input.operation}:${part}`,
    },
  };
  const encoded = JSON.stringify(created);
  await AsyncStorage.setItem(key, encoded);
  if (input.operation === "purchase") await AsyncStorage.setItem(LATEST_PURCHASE_KEY, encoded);
  return created;
}

export async function clearSubscriptionMutationAttempt(input: {
  readonly operation: SubscriptionMutationOperation;
  readonly subject: string;
  readonly fingerprint: string;
}): Promise<void> {
  const key = storageKey(input.operation, input.subject);
  const existing = parseStored(await AsyncStorage.getItem(key));
  if (existing?.fingerprint !== input.fingerprint) return;
  await AsyncStorage.removeItem(key);
  if (input.operation === "purchase") {
    const latest = parseStored(await AsyncStorage.getItem(LATEST_PURCHASE_KEY));
    if (latest?.fingerprint === input.fingerprint) await AsyncStorage.removeItem(LATEST_PURCHASE_KEY);
  }
}

export async function clearSubscriptionMutationAttempts(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
  if (keys.length > 0) await AsyncStorage.multiRemove(keys);
}
