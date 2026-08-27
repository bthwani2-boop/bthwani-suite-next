import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";

export type DurableMutationIdentityScope = {
  readonly actorId: string;
  readonly installationId: string;
  readonly entityId: string;
};

export type DurableMutationAttemptEnvelope<TContext> = {
  readonly fingerprint: string;
  readonly scope: DurableMutationIdentityScope;
  readonly context: TContext;
};

type RegistryOptions<TAttempt extends DurableMutationAttemptEnvelope<unknown>> = {
  readonly operation: string;
  readonly scope: DurableMutationIdentityScope;
  readonly fingerprint: string;
  readonly create: () => TAttempt;
  readonly parse: (value: unknown) => value is TAttempt;
  readonly legacyKeys?: readonly string[];
  readonly legacyPrefixes?: readonly string[];
};

function encode(value: string): string {
  return encodeURIComponent(value.trim());
}

export function durableMutationAttemptKey(
  operation: string,
  scope: DurableMutationIdentityScope,
  fingerprint: string,
): string {
  if (!operation.trim() || !scope.actorId.trim() || !scope.installationId.trim() || !scope.entityId.trim() || !fingerprint.trim()) {
    throw new Error("durable mutation registry identity is incomplete");
  }
  return `@bthwani/mutation-attempt:v4/${encode(operation)}/${encode(scope.actorId)}/${encode(scope.installationId)}/${encode(scope.entityId)}/${encode(fingerprint)}`;
}

async function quarantineLegacy(keys: readonly string[], prefixes: readonly string[] = []): Promise<void> {
  const discovered = await bthwaniDurableStorage.getAllKeys();
  const allKeys = [...new Set([
    ...keys,
    ...discovered.filter((key) => prefixes.some((prefix) => key.startsWith(prefix))),
  ])];
  for (const key of allKeys) {
    const raw = await bthwaniDurableStorage.getItem(key);
    if (!raw) continue;
    await bthwaniDurableStorage.setItem(`${key}:quarantine:${Date.now()}`, raw);
    await bthwaniDurableStorage.removeItem(key);
  }
}

export async function getOrCreateDurableMutationAttempt<TAttempt extends DurableMutationAttemptEnvelope<unknown>>(
  options: RegistryOptions<TAttempt>,
): Promise<TAttempt> {
  const key = durableMutationAttemptKey(options.operation, options.scope, options.fingerprint);
  const raw = await bthwaniDurableStorage.getItem(key);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (options.parse(parsed)
        && parsed.fingerprint === options.fingerprint
        && parsed.scope.actorId === options.scope.actorId
        && parsed.scope.installationId === options.scope.installationId
        && parsed.scope.entityId === options.scope.entityId) {
        return parsed;
      }
      await bthwaniDurableStorage.setItem(`${key}:quarantine:${Date.now()}`, raw);
      await bthwaniDurableStorage.removeItem(key);
    } catch {
      // A corrupt v4 entry is quarantined, never silently replaced.
      await bthwaniDurableStorage.setItem(`${key}:quarantine:${Date.now()}`, raw);
      await bthwaniDurableStorage.removeItem(key);
    }
  }
  if (options.legacyKeys?.length || options.legacyPrefixes?.length) {
    await quarantineLegacy(options.legacyKeys ?? [], options.legacyPrefixes ?? []);
  }
  const attempt = options.create();
  if (!options.parse(attempt)) throw new Error("durable mutation registry create() returned an invalid attempt");
  await bthwaniDurableStorage.setItem(key, JSON.stringify(attempt));
  return attempt;
}

export async function purgeExactDurableMutationAttempt<TAttempt extends DurableMutationAttemptEnvelope<unknown>>(
  operation: string,
  scope: DurableMutationIdentityScope,
  fingerprint: string,
  parse: (value: unknown) => value is TAttempt,
): Promise<void> {
  const key = durableMutationAttemptKey(operation, scope, fingerprint);
  const raw = await bthwaniDurableStorage.getItem(key);
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parse(parsed)
      && parsed.fingerprint === fingerprint
      && parsed.scope.actorId === scope.actorId
      && parsed.scope.installationId === scope.installationId
      && parsed.scope.entityId === scope.entityId) {
      await bthwaniDurableStorage.removeItem(key);
    }
  } catch {
    // Do not delete an unresolved corrupt attempt on a terminal success path.
  }
}
