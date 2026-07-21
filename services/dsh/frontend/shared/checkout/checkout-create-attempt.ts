import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DshCreateIntentInput } from "./checkout.types";

const STORAGE_KEY = "@bthwani/checkout-create-attempt:v1";
let fallbackSequence = 0;

export type DshCheckoutMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

type StoredCheckoutAttempt = {
  readonly fingerprint: string;
  readonly context: DshCheckoutMutationContext;
};

function uniquePart(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
}

export function fingerprintCheckoutInput(input: DshCreateIntentInput): string {
  return JSON.stringify({
    cartId: input.cartId.trim(),
    storeId: input.storeId.trim(),
    fulfillmentMode: input.fulfillmentMode ?? "bthwani_delivery",
    paymentMethod: input.paymentMethod ?? "cod",
    deliveryAddressId: input.deliveryAddressId?.trim() ?? "",
    note: input.note?.trim() ?? "",
    couponCode: input.couponCode?.trim().toUpperCase() ?? "",
  });
}

function newAttempt(fingerprint: string): StoredCheckoutAttempt {
  const part = uniquePart();
  return {
    fingerprint,
    context: {
      idempotencyKey: `checkout-create:${part}`,
      correlationId: `checkout:${part}`,
    },
  };
}

function isStoredAttempt(value: unknown): value is StoredCheckoutAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCheckoutAttempt>;
  return typeof candidate.fingerprint === "string" &&
    typeof candidate.context?.idempotencyKey === "string" &&
    candidate.context.idempotencyKey.length >= 16 &&
    typeof candidate.context.correlationId === "string" &&
    candidate.context.correlationId.length > 0;
}

export async function getOrCreateCheckoutAttempt(
  input: DshCreateIntentInput,
): Promise<StoredCheckoutAttempt> {
  const fingerprint = fingerprintCheckoutInput(input);
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredAttempt(parsed) && parsed.fingerprint === fingerprint) return parsed;
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }

  const attempt = newAttempt(fingerprint);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  return attempt;
}

export async function clearCheckoutAttempt(fingerprint: string): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isStoredAttempt(parsed) && parsed.fingerprint === fingerprint) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
