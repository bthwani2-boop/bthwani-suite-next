import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DshAddressMutationContext, DshClientAddressDraft } from "./client-address.types";

const STORAGE_KEY = "@bthwani/client-address-create-attempt:v1";
let fallbackSequence = 0;

type StoredAttempt = {
  readonly fingerprint: string;
  readonly context: DshAddressMutationContext;
};

function uniquePart(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
}

export function fingerprintClientAddressDraft(input: DshClientAddressDraft): string {
  return JSON.stringify({
    label: input.label.trim(),
    recipientName: input.recipientName.trim(),
    phoneE164: input.phoneE164.trim(),
    addressLine: input.addressLine.trim(),
    serviceAreaCode: input.serviceAreaCode.trim(),
    building: input.building?.trim() ?? "",
    floor: input.floor?.trim() ?? "",
    unit: input.unit?.trim() ?? "",
    deliveryInstructions: input.deliveryInstructions?.trim() ?? "",
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    makeDefault: input.makeDefault === true,
  });
}

function newAttempt(fingerprint: string): StoredAttempt {
  const part = uniquePart();
  return {
    fingerprint,
    context: {
      idempotencyKey: `address-create:${part}`,
      correlationId: `client-address:${part}`,
    },
  };
}

function isStoredAttempt(value: unknown): value is StoredAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredAttempt>;
  return typeof candidate.fingerprint === "string" &&
    typeof candidate.context?.idempotencyKey === "string" &&
    candidate.context.idempotencyKey.length >= 8 &&
    typeof candidate.context.correlationId === "string" &&
    candidate.context.correlationId.length > 0;
}

export async function getOrCreateClientAddressAttempt(
  input: DshClientAddressDraft,
): Promise<StoredAttempt> {
  const fingerprint = fingerprintClientAddressDraft(input);
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredAttempt(parsed) && parsed.fingerprint === fingerprint) return parsed;
    } catch {
      await AsyncStorage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, raw);
    }
  }
  const attempt = newAttempt(fingerprint);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  return attempt;
}

export async function clearClientAddressAttempt(fingerprint: string): Promise<void> {
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
