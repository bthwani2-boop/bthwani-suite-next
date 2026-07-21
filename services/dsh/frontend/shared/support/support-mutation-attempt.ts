import AsyncStorage from "@react-native-async-storage/async-storage";

export type SupportMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

type StoredAttempt = {
  readonly fingerprint: string;
  readonly context: SupportMutationContext;
};

type SupportMutationScope = "actor" | "client" | "operator" | "partner";

const PREFIX = "@bthwani/dsh/support-mutation/v1/";
let fallbackSequence = 0;

function nextPart(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
}

function keyFor(scope: string, operation: string, entityId?: string): string {
  return `${PREFIX}${scope}/${operation}/${entityId ?? "root"}`;
}

function parseStored(raw: string | null): StoredAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredAttempt>;
    if (
      typeof value.fingerprint === "string" &&
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

export async function getOrCreateSupportMutationAttempt(input: {
  readonly scope: SupportMutationScope;
  readonly operation: string;
  readonly entityId?: string;
  readonly fingerprint: string;
}): Promise<StoredAttempt> {
  const storageKey = keyFor(input.scope, input.operation, input.entityId);
  const existing = parseStored(await AsyncStorage.getItem(storageKey));
  if (existing?.fingerprint === input.fingerprint) return existing;
  const part = nextPart();
  const created: StoredAttempt = {
    fingerprint: input.fingerprint,
    context: {
      idempotencyKey: `${input.scope}:${input.operation}:${part}`,
      correlationId: `support:${input.scope}:${part}`,
    },
  };
  await AsyncStorage.setItem(storageKey, JSON.stringify(created));
  return created;
}

export async function clearSupportMutationAttempt(input: {
  readonly scope: SupportMutationScope;
  readonly operation: string;
  readonly entityId?: string;
  readonly fingerprint: string;
}): Promise<void> {
  const storageKey = keyFor(input.scope, input.operation, input.entityId);
  const existing = parseStored(await AsyncStorage.getItem(storageKey));
  if (existing?.fingerprint === input.fingerprint) {
    await AsyncStorage.removeItem(storageKey);
  }
}
