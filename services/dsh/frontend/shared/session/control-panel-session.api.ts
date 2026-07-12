import type { ActorIdentity } from "@bthwani/core-identity";
import { createDshSessionHttpClient } from "../_kernel/dsh-http-request";

export type SessionApiResult<T> = {
  readonly ok: boolean;
  readonly status: number;
  readonly body: T | null;
};

const { request } = createDshSessionHttpClient();

export function fetchControlPanelSession(): Promise<SessionApiResult<{ identity: ActorIdentity }>> {
  return request<{ identity: ActorIdentity }>("/api/auth/session", { method: "GET" });
}

export function loginControlPanelSession(
  username: string,
  password: string,
): Promise<SessionApiResult<{ identity: ActorIdentity; code?: string }>> {
  return request<{ identity: ActorIdentity; code?: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logoutControlPanelSession(): Promise<SessionApiResult<unknown>> {
  return request("/api/auth/logout", { method: "POST" });
}
