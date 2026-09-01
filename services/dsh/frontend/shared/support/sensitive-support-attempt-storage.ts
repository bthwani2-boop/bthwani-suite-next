import { bthwaniSensitiveStorage } from "@bthwani/data-runtime/sensitive-storage-adapter";
import { bthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";

export const SENSITIVE_PARTNER_CREATE_ATTEMPT_PREFIX =
  "@bthwani/dsh/partner-support/create-attempt/v4/";
export const SENSITIVE_PARTNER_MESSAGE_ATTEMPT_PREFIX =
  "@bthwani/dsh/partner-support/message-attempt/v4/";
export const SENSITIVE_SUPPORT_MUTATION_PREFIX =
  "@bthwani/dsh/support-mutation/v4/";

const LEGACY_MIGRATIONS = [
  {
    currentPrefix: SENSITIVE_PARTNER_CREATE_ATTEMPT_PREFIX,
    legacyPrefix: "@bthwani/dsh/partner-support/create-attempt/v3/",
    kind: "partner-create",
  },
  {
    currentPrefix: SENSITIVE_PARTNER_MESSAGE_ATTEMPT_PREFIX,
    legacyPrefix: "@bthwani/dsh/partner-support/message-attempt/v3/",
    kind: "partner-message",
  },
  {
    currentPrefix: SENSITIVE_SUPPORT_MUTATION_PREFIX,
    legacyPrefix: "@bthwani/dsh/support-mutation/v3/",
    kind: "support-mutation",
  },
] as const;

const FNV_OFFSET = 14695981039346656037n;
const FNV_PRIME = 1099511628211n;
const FNV_MASK = 18446744073709551615n;

/**
 * Keeps support identity comparable without retaining ticket/message content.
 * The value is only an equality fingerprint; the attempt itself is encrypted
 * by the configured sensitive provider.
 */
export function opaqueSupportFingerprint(value: string): string {
  let hash = FNV_OFFSET;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * FNV_PRIME) & FNV_MASK;
  }
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}

type LegacyKind = (typeof LEGACY_MIGRATIONS)[number]["kind"];

function migratedKey(key: string, legacyPrefix: string, currentPrefix: string): string {
  return `${currentPrefix}${key.slice(legacyPrefix.length)}`;
}

function normalizeLegacyValue(raw: string, kind: LegacyKind): string | null {
  try {
    const value = JSON.parse(raw) as {
      fingerprint?: unknown;
      context?: unknown;
      scope?: { entityId?: unknown };
    };
    if (typeof value.fingerprint !== "string") return null;

    const fingerprint = opaqueSupportFingerprint(value.fingerprint);
    const scope = value.scope && typeof value.scope === "object"
      ? { ...value.scope }
      : undefined;
    if (scope && kind === "partner-create") {
      scope.entityId = fingerprint.slice(0, 32);
    } else if (scope && kind === "partner-message") {
      try {
        const messageInput = JSON.parse(value.fingerprint) as { ticketId?: unknown };
        if (typeof messageInput.ticketId === "string") {
          scope.entityId = `${messageInput.ticketId}:${fingerprint.slice(0, 16)}`;
        }
      } catch {
        return null;
      }
    }

    return JSON.stringify({ ...value, fingerprint, ...(scope ? { scope } : {}) });
  } catch {
    // An invalid legacy attempt cannot safely be replayed. Its content is not
    // copied anywhere; the old generic record is still removed below.
    return null;
  }
}

let activeMigration: Promise<void> | null = null;

async function migrateLegacySupportAttempts(): Promise<void> {
  const legacyKeys = (await bthwaniDurableStorage.getAllKeys()).filter((key) =>
    LEGACY_MIGRATIONS.some(({ legacyPrefix }) => key.startsWith(legacyPrefix))
  );

  for (const key of legacyKeys) {
    const migration = LEGACY_MIGRATIONS.find(({ legacyPrefix }) => key.startsWith(legacyPrefix));
    if (!migration) continue;

    const targetKey = migratedKey(key, migration.legacyPrefix, migration.currentPrefix);
    const current = await bthwaniSensitiveStorage.getItem(targetKey);
    if (current === null) {
      const raw = await bthwaniDurableStorage.getItem(key);
      if (raw !== null) {
        const migrated = normalizeLegacyValue(raw, migration.kind);
        if (migrated !== null) await bthwaniSensitiveStorage.setItem(targetKey, migrated);
      }
    }
    await bthwaniDurableStorage.removeItem(key);
  }

  const remaining = (await bthwaniDurableStorage.getAllKeys()).filter((key) =>
    LEGACY_MIGRATIONS.some(({ legacyPrefix }) => key.startsWith(legacyPrefix))
  );
  if (remaining.length > 0) {
    throw new Error(`SENSITIVE_SUPPORT_LEGACY_KEYS_REMAIN:${remaining.length}`);
  }
}

/**
 * One bounded migration pass. There is deliberately no durable-store
 * fallback: once the pass returns, support attempts are read only from the
 * sensitive authority. The pass is retried after a failed delete/write so a
 * transient storage failure cannot be mistaken for cleanup.
 */
export function ensureSensitiveSupportAttemptsMigrated(): Promise<void> {
  if (activeMigration) return activeMigration;
  activeMigration = migrateLegacySupportAttempts().finally(() => {
    activeMigration = null;
  });
  return activeMigration;
}
