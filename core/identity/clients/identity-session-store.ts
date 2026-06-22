import {
  createIdentityClient,
  type ActorIdentity,
  type IdentityClient,
  type IdentityClientError,
} from "./identity-client.js";

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

export function configureIdentitySession(baseUrl: string): void {
  if (!baseUrl || client !== null) return;
  client = createIdentityClient(baseUrl);
  state = { kind: "signed_out" };
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
  state = { kind: "signed_out" };
  emit();
  if (client !== null && accessToken !== undefined) {
    await client.logout(accessToken).catch(() => undefined);
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}
