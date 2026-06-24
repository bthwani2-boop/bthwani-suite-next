import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshNotification, DshNotificationPreference, DshPlatformNotificationConfig } from "./notifications.types";

const baseUrl = resolveDshApiBaseUrl();

let corrCounter = 0;
function corrId() { return `notif-${Date.now()}-${++corrCounter}`; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Correlation-ID": corrId(),
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw { kind: "http", status: response.status };
  return response.json() as Promise<T>;
}

export async function fetchNotifications(): Promise<{ notifications: DshNotification[]; unreadCount: number }> {
  return request("/dsh/notifications");
}

export async function markNotificationRead(id: string): Promise<{ notification: DshNotification }> {
  return request(`/dsh/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<{ markedCount: number }> {
  return request("/dsh/notifications/read-all", { method: "POST" });
}

export async function updateNotificationPreferences(
  topic: string,
  enabled: boolean
): Promise<{ preference: DshNotificationPreference }> {
  return request("/dsh/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify({ topic, enabled }),
  });
}

export async function fetchPlatformNotificationConfigs(): Promise<{ configs: DshPlatformNotificationConfig[] }> {
  return request("/dsh/operator/notifications/config");
}

export async function upsertPlatformNotificationConfig(
  topic: string,
  actorTypes: string[],
  isEnabled: boolean,
  description: string
): Promise<{ config: DshPlatformNotificationConfig }> {
  return request("/dsh/operator/notifications/config", {
    method: "PUT",
    body: JSON.stringify({ topic, actorTypes, isEnabled, description }),
  });
}
