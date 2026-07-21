import {
  createIdentityClient,
  type ActivationActorType,
  type ActorIdentity,
  type IdentityClient,
  type IdentityClientError,
  type IssueActivationResponse,
  type SessionInfo,
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

const STORAGE_KEY = "bthwani-identity-session";
const DEVICE_FINGERPRINT = "bthwani-runtime-session";
const ACTOR_ROLES = new Set([
  "client",
  "partner",
  "captain",
  "field",
  "operator",
  "system",
]);

let client: IdentityClient | null = null;
let state: IdentitySessionState = { kind: "unconfigured" };
let stored: StoredSession | null = null;
let storageAdapter: SessionStorageAdapter = defaultSessionStorageAdapter();
const listeners = new Set<() => void>();

export function configureIdentitySessionStorage(adapter: SessionStorageAdapter): void {
  if (client !== null) return;
  storageAdapter = adapter;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBooleanRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "boolean");
}

function isValidPermission(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.service)
    && isNonEmptyString(value.surface)
    && isNonEmptyString(value.action)
    && isNonEmptyString(value.scope);
}

function isValidActorIdentity(value: unknown): value is ActorIdentity {
  if (!isRecord(value)) return false;
  if (
    !isNonEmptyString(value.subject)
    || !isNonEmptyString(value.tenantId)
    || !isNonEmptyString(value.phoneE164)
    || value.authState !== "authenticated"
    || !isNonEmptyString(value.sessionId)
    || !isNonEmptyString(value.expiresAt)
  ) {
    return false;
  }

  const expiresAtMs = Date.parse(value.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return false;

  if (
    !Array.isArray(value.roles)
    || value.roles.length === 0
    || !value.roles.every((role) => typeof role === "string" && ACTOR_ROLES.has(role))
  ) {
    return false;
  }

  return Array.isArray(value.permissions)
    && value.permissions.every(isValidPermission)
    && isBooleanRecord(value.surfaceAccess)
    && isBooleanRecord(value.serviceAccess);
}

function parseStoredSession(raw: string): StoredSession | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed)
      || !isNonEmptyString(parsed.accessToken)
      || !isNonEmptyString(parsed.refreshToken)
      || !isValidActorIdentity(parsed.identity)
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
  if (!session) await storageAdapter.removeItem(STORAGE_KEY);
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

function setState(next: IdentitySessionState): void {
  state = next;
  emit();
}

function identityErrorCode(error: unknown): string {
  const typed = error as Partial<IdentityClientError>;
  return typed.kind === "http" && typeof typed.code === "string"
    ? typed.code
    : "IDENTITY_UNAVAILABLE";
}

function clearSession(message?: string): void {
  stored = null;
  void saveStoredSession(null);
  setState(message ? { kind: "error", message } : { kind: "signed_out" });
}

function commitAuthenticatedSession(session: StoredSession, persist: boolean): void {
  if (!isValidActorIdentity(session.identity)) {
    clearSession("IDENTITY_SESSION_INVALID");
    return;
  }
  stored = session;
  if (persist) void saveStoredSession(session);
  setState({
    kind: "authenticated",
    identity: session.identity,
    accessToken: session.accessToken,
  });
}

async function restoreStoredSession(identityClient: IdentityClient, session: StoredSession): Promise<void> {
  setState({ kind: "authenticating" });
  try {
    const identity = await identityClient.session(session.accessToken);
    commitAuthenticatedSession({ ...session, identity }, true);
    return;
  } catch {
    // Continue with governed refresh-token rotation.
  }

  try {
    const refreshed = await identityClient.refresh(session.refreshToken);
    commitAuthenticatedSession({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      identity: refreshed.identity,
    }, true);
  } catch {
    clearSession("IDENTITY_SESSION_INVALID");
  }
}

export function configureIdentitySession(baseUrl: string): void {
  if (!baseUrl || client !== null) return;
  const configuredClient = createIdentityClient(baseUrl);
  client = configuredClient;
  setState({ kind: "restoring" });

  void (async () => {
    const saved = await loadStoredSession();
    if (!saved) {
      setState({ kind: "signed_out" });
      return;
    }
    await restoreStoredSession(configuredClient, saved);
  })();
}

export function getIdentityAccessToken(): string | null {
  return state.kind === "authenticated" ? stored?.accessToken ?? null : null;
}

export function getIdentityState(): IdentitySessionState {
  return state;
}

export function subscribeIdentityState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loginIdentity(username: string, password: string): Promise<void> {
  if (client === null) {
    setState({ kind: "error", message: "IDENTITY_NOT_CONFIGURED" });
    return;
  }
  setState({ kind: "authenticating" });
  try {
    const response = await client.login({
      username,
      password,
      deviceFingerprint: DEVICE_FINGERPRINT,
    });
    commitAuthenticatedSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      identity: response.identity,
    }, true);
  } catch (error) {
    clearSession(identityErrorCode(error));
  }
}

export async function requestOtpIdentity(
  actorType: ActivationActorType,
  phone: string,
): Promise<IssueActivationResponse> {
  if (client === null) throw new Error("IDENTITY_NOT_CONFIGURED");
  return client.requestOtp({ actorType, phone });
}

export async function activateIdentity(
  actorType: ActivationActorType,
  phone: string,
  code: string,
): Promise<void> {
  if (client === null) {
    setState({ kind: "error", message: "IDENTITY_NOT_CONFIGURED" });
    return;
  }
  setState({ kind: "authenticating" });
  try {
    const response = await client.activate({
      actorType,
      phone,
      code,
      deviceFingerprint: DEVICE_FINGERPRINT,
    });
    commitAuthenticatedSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      identity: response.identity,
    }, true);
  } catch (error) {
    clearSession(identityErrorCode(error));
  }
}

export async function listIdentitySessions(): Promise<SessionInfo[]> {
  const token = getIdentityAccessToken();
  if (!token) throw new Error("UNAUTHENTICATED");
  if (client === null) throw new Error("IDENTITY_NOT_CONFIGURED");
  return client.listSessions(token);
}

export async function revokeIdentitySession(sessionId: string): Promise<void> {
  const token = getIdentityAccessToken();
  if (!token) throw new Error("UNAUTHENTICATED");
  if (client === null) throw new Error("IDENTITY_NOT_CONFIGURED");
  await client.revokeSession(token, sessionId);
  if (stored?.identity.sessionId === sessionId) clearSession();
}

export async function logoutIdentity(): Promise<void> {
  const accessToken = stored?.accessToken;
  clearSession();
  if (client !== null && accessToken !== undefined) {
    await client.logout(accessToken).catch(() => undefined);
  }
}

export async function changePasswordIdentity(password: string): Promise<void> {
  const token = getIdentityAccessToken();
  if (!token) throw new Error("UNAUTHENTICATED");
  if (client === null) throw new Error("IDENTITY_NOT_CONFIGURED");
  await client.changePassword(token, password);
}

export async function deleteAccountIdentity(): Promise<void> {
  const token = getIdentityAccessToken();
  if (!token) throw new Error("UNAUTHENTICATED");
  if (client === null) throw new Error("IDENTITY_NOT_CONFIGURED");
  await client.deleteAccount(token);
  clearSession();
}

// Compliance marker: IDENTITY_SESSION_INVALID
