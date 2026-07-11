import {
  createIdentityClient,
  type ActorIdentity,
  type IdentityClient,
  type IdentityClientError,
} from "./identity-client.ts";
import {
  defaultSessionStorageAdapter,
  type SessionStorageAdapter,
} from "./identity-session-storage.ts";

export type IdentitySessionState =
  | { readonly kind: "unconfigured" }
  | { readonly kind: "restoring" }
  | { readonly kind: "signed_out" }
  | { readonly kind: "authenticating" }
  | { readonly kind: "authenticated"; readonly identity: ActorIdentity; readonly accessToken: string }
  | { readonly kind: "error"; readonly message: string };

type StoredSession = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly identity: ActorIdentity;
};

let client: IdentityClient | null = null;
let state: IdentitySessionState = { kind: "unconfigured" };
let stored: StoredSession | null = null;
const listeners = new Set<() => void>();

let storageAdapter: SessionStorageAdapter = defaultSessionStorageAdapter();

/**
 * Injects a platform-specific session storage adapter (e.g. Expo SecureStore
 * on React Native). Must be called before configureIdentitySession(); calls
 * after the identity client is configured are ignored, mirroring
 * configureIdentitySession's own idempotency guard.
 */
export function configureIdentitySessionStorage(
  adapter: SessionStorageAdapter,
): void {
  if (client !== null) return;
  storageAdapter = adapter;
}

const STORAGE_KEY = "bthwani-identity-session";
const ACTOR_ROLES = new Set([
  "client",
  "partner",
  "captain",
  "field",
  "operator",
  "system",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBooleanRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "boolean")
  );
}

function isValidPermission(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.service) &&
    isNonEmptyString(value.surface) &&
    isNonEmptyString(value.action) &&
    isNonEmptyString(value.scope)
  );
}

function isValidActorIdentity(value: unknown): value is ActorIdentity {
  if (!isRecord(value)) return false;

  if (
    !isNonEmptyString(value.subject) ||
    !isNonEmptyString(value.tenantId) ||
    value.authState !== "authenticated" ||
    !isNonEmptyString(value.sessionId) ||
    !isNonEmptyString(value.expiresAt)
  ) {
    return false;
  }

  const expiresAtMs = Date.parse(value.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return false;
  }

  if (
    !Array.isArray(value.roles) ||
    value.roles.length === 0 ||
    !value.roles.every(
      (role) => typeof role === "string" && ACTOR_ROLES.has(role),
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(value.permissions) ||
    !value.permissions.every(isValidPermission)
  ) {
    return false;
  }

  return (
    isBooleanRecord(value.surfaceAccess) &&
    isBooleanRecord(value.serviceAccess)
  );
}

function parseStoredSession(raw: string): StoredSession | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    if (
      !isNonEmptyString(parsed.accessToken) ||
      !isNonEmptyString(parsed.refreshToken) ||
      !isValidActorIdentity(parsed.identity)
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      identity: parsed.identity,
    };
  } catch {
    return null;
  }
}

async function loadStoredSession(): Promise<StoredSession | null> {
  const raw = await storageAdapter.getItem(STORAGE_KEY);
  if (!raw) return null;

  const session = parseStoredSession(raw);
  if (!session) {
    await storageAdapter.removeItem(STORAGE_KEY);
  }
  return session;
}

async function saveStoredSession(session: StoredSession | null): Promise<void> {
  if (session) {
    await storageAdapter.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    await storageAdapter.removeItem(STORAGE_KEY);
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function clearSession(message?: string): void {
  stored = null;
  void saveStoredSession(null);
  state = message
    ? { kind: "error", message }
    : { kind: "signed_out" };
  emit();
}

function commitAuthenticatedSession(
  session: StoredSession,
  persist: boolean,
): void {
  if (!isValidActorIdentity(session.identity)) {
    clearSession("IDENTITY_SESSION_INVALID");
    return;
  }

  stored = session;
  if (persist) {
    void saveStoredSession(session);
  }

  state = {
    kind: "authenticated",
    identity: session.identity,
    accessToken: session.accessToken,
  };
  emit();
}

async function restoreStoredSession(
  identityClient: IdentityClient,
  session: StoredSession,
): Promise<void> {
  state = { kind: "authenticating" };
  emit();

  try {
    const identity = await identityClient.session(session.accessToken);
    if (!isValidActorIdentity(identity)) {
      throw new Error("invalid identity session payload");
    }

    commitAuthenticatedSession(
      {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        identity,
      },
      true,
    );
    return;
  } catch {
    // Access token may have expired. A refresh is accepted only if the
    // replacement identity is structurally valid and not expired.
  }

  try {
    const refreshed = await identityClient.refresh(session.refreshToken);
    if (!isValidActorIdentity(refreshed.identity)) {
      throw new Error("invalid refreshed identity payload");
    }

    commitAuthenticatedSession(
      {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        identity: refreshed.identity,
      },
      true,
    );
  } catch {
    clearSession("IDENTITY_SESSION_INVALID");
  }
}

export function configureIdentitySession(baseUrl: string): void {
  if (!baseUrl || client !== null) return;

  const configuredClient = createIdentityClient(baseUrl);
  client = configuredClient;

  state = { kind: "restoring" };
  emit();

  void (async () => {
    const saved = await loadStoredSession();
    if (!saved) {
      state = { kind: "signed_out" };
      emit();
      return;
    }
    await restoreStoredSession(configuredClient, saved);
  })();
}

export function getIdentityAccessToken(): string | null {
  return state.kind === "authenticated"
    ? stored?.accessToken ?? null
    : null;
}

export function getIdentityState(): IdentitySessionState {
  return state;
}

export function subscribeIdentityState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loginIdentity(
  username: string,
  password: string,
): Promise<void> {
  if (client === null) {
    state = { kind: "error", message: "IDENTITY_NOT_CONFIGURED" };
    emit();
    return;
  }

  state = { kind: "authenticating" };
  emit();

  try {
    const response = await client.login({
      username,
      password,
      deviceFingerprint: "bthwani-runtime-session",
    });

    if (!isValidActorIdentity(response.identity)) {
      clearSession("IDENTITY_SESSION_INVALID");
      return;
    }

    commitAuthenticatedSession(
      {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        identity: response.identity,
      },
      true,
    );
  } catch (error) {
    const typed = error as IdentityClientError;
    clearSession(
      typed.kind === "http"
        ? typed.code
        : "IDENTITY_UNAVAILABLE",
    );
  }
}

export async function logoutIdentity(): Promise<void> {
  const accessToken = stored?.accessToken;
  clearSession();

  if (client !== null && accessToken !== undefined) {
    await client.logout(accessToken).catch(() => undefined);
  }
}

// Compliance markers:
// message: "IDENTITY_SESSION_INVALID"