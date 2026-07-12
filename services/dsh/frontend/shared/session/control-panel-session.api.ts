import type { ActorIdentity } from "@bthwani/core-identity";

export type SessionApiResult<T> = {
  readonly ok: boolean;
  readonly status: number;
  readonly body: T | null;
};

async function fetchSessionJson<T>(input: string, init?: RequestInit): Promise<SessionApiResult<T>> {
  const response = await fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

export function fetchControlPanelSession(): Promise<SessionApiResult<{ identity: ActorIdentity }>> {
  return fetchSessionJson<{ identity: ActorIdentity }>("/api/auth/session", { method: "GET" });
}

export function loginControlPanelSession(
  username: string,
  password: string,
): Promise<SessionApiResult<{ identity: ActorIdentity; code?: string }>> {
  return fetchSessionJson<{ identity: ActorIdentity; code?: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logoutControlPanelSession(): Promise<SessionApiResult<unknown>> {
  return fetchSessionJson("/api/auth/logout", { method: "POST" });
}
