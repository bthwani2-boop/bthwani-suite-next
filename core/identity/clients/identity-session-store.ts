import {
  createIdentityClient,
  type ActorIdentity,
  type IdentityClient,
  type IdentityClientError,
} from "./identity-client.ts";

declare const __DEV__: boolean | undefined;

type ActorRole = "client" | "partner" | "captain" | "field" | "operator";

export type IdentitySessionState =
  | { readonly kind: "unconfigured" }
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

const IS_BROWSER = typeof window !== "undefined" && typeof localStorage !== "undefined";
const STORAGE_KEY = "bthwani-identity-session";

function loadStoredSession(): StoredSession | null {
  if (!IS_BROWSER) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as StoredSession;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function saveStoredSession(session: StoredSession | null): void {
  if (!IS_BROWSER) return;
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    // ignore
  }
}

export function configureIdentitySession(baseUrl: string): void {
  if (!baseUrl || client !== null) return;
  client = createIdentityClient(baseUrl);
  
  const saved = loadStoredSession();
  if (saved) {
    stored = saved;
    state = {
      kind: "authenticated",
      identity: saved.identity,
      accessToken: saved.accessToken,
    };
  } else {
    state = { kind: "signed_out" };
  }
  emit();
}

export function getIdentityAccessToken(): string | null {
  return stored?.accessToken ?? null;
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
    stored = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      identity: response.identity,
    };
    saveStoredSession(stored);
    state = {
      kind: "authenticated",
      identity: response.identity,
      accessToken: response.accessToken,
    };
  } catch (error) {
    const typed = error as IdentityClientError;
    state = {
      kind: "error",
      message: typed.kind === "http" ? typed.code : "IDENTITY_UNAVAILABLE",
    };
  }
  emit();
}

export async function logoutIdentity(): Promise<void> {
  const accessToken = stored?.accessToken;
  stored = null;
  saveStoredSession(null);
  state = { kind: "signed_out" };
  emit();
  if (client !== null && accessToken !== undefined) {
    await client.logout(accessToken).catch(() => undefined);
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

// Dev-only: bypass identity service and auto-authenticate with a fake session.
// The check is enforced inside the privileged function, not only in the UI.
function isDevBypassAllowed(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__ === true;
}

export function devBypassLogin(role: ActorRole): void {
  if (!isDevBypassAllowed()) {
    stored = null;
    saveStoredSession(null);
    state = { kind: "error", message: "DEV_BYPASS_DISABLED" };
    emit();
    return;
  }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const surface = (role === "operator" ? "control-panel" : `app-${role}`) as ActorIdentity["surfaceAccess"] extends Record<string, boolean> ? string : never;
  const scope = role === "operator" ? "all" : (role === "client" || role === "partner" ? "own" : "assigned");
  const subject = `${role}-local-001`;
  const fakeIdentity: ActorIdentity = {
    subject,
    tenantId: "tenant-dev-001",
    roles: [role],
    permissions: [{ service: "dsh", surface: surface as ActorIdentity["permissions"][number]["surface"], action: "*", scope }],
    authState: "authenticated",
    surfaceAccess: { [surface]: true },
    serviceAccess: { dsh: true },
    sessionId: `dev-session-${Date.now()}`,
    expiresAt,
  };
  stored = {
    accessToken: `dev-bypass-${role}-${Date.now()}`,
    refreshToken: `dev-bypass-refresh-${role}`,
    identity: fakeIdentity,
  };
  saveStoredSession(stored);
  state = { kind: "authenticated", identity: fakeIdentity, accessToken: stored.accessToken };
  emit();
}
