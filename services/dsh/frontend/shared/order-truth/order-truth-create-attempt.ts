import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  CreateOrderTruthInput,
  OrderTruthMutationContext,
} from "./order-truth.types";

const STORAGE_KEY = "@bthwani/order-truth-create-attempt:v1";
let fallbackSequence = 0;

type StoredOrderTruthAttempt = {
  readonly fingerprint: string;
  readonly context: OrderTruthMutationContext;
};

function uniquePart(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
}

export function fingerprintOrderTruthInput(input: CreateOrderTruthInput): string {
  return JSON.stringify({ checkoutIntentId: input.checkoutIntentId.trim() });
}

function newAttempt(fingerprint: string): StoredOrderTruthAttempt {
  const idempotencyPart = uniquePart();
  const correlationPart = uniquePart();
  return {
    fingerprint,
    context: {
      idempotencyKey: `order-create-key:${idempotencyPart}`,
      correlationId: `order-create-correlation:${correlationPart}`,
    },
  };
}

function isStoredAttempt(value: unknown): value is StoredOrderTruthAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredOrderTruthAttempt>;
  return typeof candidate.fingerprint === "string" &&
    typeof candidate.context?.idempotencyKey === "string" &&
    candidate.context.idempotencyKey.length >= 16 &&
    typeof candidate.context.correlationId === "string" &&
    candidate.context.correlationId.length >= 8 &&
    candidate.context.correlationId !== candidate.context.idempotencyKey;
}

export async function getOrCreateOrderTruthAttempt(
  input: CreateOrderTruthInput,
): Promise<StoredOrderTruthAttempt> {
  const fingerprint = fingerprintOrderTruthInput(input);
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

export async function clearOrderTruthAttempt(fingerprint: string): Promise<void> {
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
