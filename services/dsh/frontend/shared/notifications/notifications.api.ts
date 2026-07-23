import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshRawHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshNotification,
  DshNotificationDeliveryAttempt,
  DshNotificationDeliveryAuditSummary,
  DshNotificationDeliveryOutcome,
  DshNotificationPreference,
  DshNotificationPushEndpoint,
  DshPlatformNotificationConfig,
  DshPushDeliveryAudit,
  DshUpdateNotificationPreferenceInput,
  DshUpsertNotificationPushEndpointInput,
  DshUpsertPlatformNotificationConfigInput,
} from "./notifications.types";

const { req: request } = createDshRawHttpClient(resolveDshApiBaseUrl(), "notif");

export async function fetchNotifications(): Promise<{ notifications: DshNotification[]; unreadCount: number }> {
  return request("/dsh/notifications");
}

export async function markNotificationRead(id: string): Promise<{ notification: DshNotification }> {
  return request(`/dsh/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<{ markedCount: number }> {
  return request("/dsh/notifications/read-all", { method: "POST" });
}

export async function fetchNotificationPreferences(): Promise<{ preferences: DshNotificationPreference[] }> {
  return request("/dsh/notifications/preferences");
}

export function updateNotificationPreferences(
  input: DshUpdateNotificationPreferenceInput,
): Promise<{ preference: DshNotificationPreference }>;
export function updateNotificationPreferences(
  topic: string,
  enabled: boolean,
): Promise<{ preference: DshNotificationPreference }>;
export async function updateNotificationPreferences(
  inputOrTopic: DshUpdateNotificationPreferenceInput | string,
  enabled?: boolean,
): Promise<{ preference: DshNotificationPreference }> {
  const input: DshUpdateNotificationPreferenceInput = typeof inputOrTopic === "string"
    ? {
        topic: inputOrTopic,
        enabled: enabled === true,
        channels: ["in_app"],
        locale: "ar",
        timezone: "Asia/Aden",
      }
    : inputOrTopic;

  return request("/dsh/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function upsertNotificationPushEndpoint(
  input: DshUpsertNotificationPushEndpointInput,
): Promise<{ endpoint: DshNotificationPushEndpoint }> {
  return request("/dsh/notifications/push-endpoints", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deactivateNotificationPushEndpoint(deviceId: string): Promise<{ deactivated: true }> {
  return request(`/dsh/notifications/push-endpoints/${encodeURIComponent(deviceId)}`, {
    method: "DELETE",
  });
}

export async function fetchPlatformNotificationConfigs(): Promise<{ configs: DshPlatformNotificationConfig[] }> {
  return request("/dsh/operator/notifications/config");
}

export async function upsertPlatformNotificationConfig(
  input: DshUpsertPlatformNotificationConfigInput,
): Promise<{ config: DshPlatformNotificationConfig }> {
  return request("/dsh/operator/notifications/config", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function fetchNotificationDeliveryAttempts(
  outcome?: DshNotificationDeliveryOutcome,
  limit = 100,
): Promise<{
  attempts: DshNotificationDeliveryAttempt[];
  pushDeliveries: DshPushDeliveryAudit[];
  summary: DshNotificationDeliveryAuditSummary;
}> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (outcome) query.set("outcome", outcome);
  return request(`/dsh/operator/notifications/delivery-attempts?${query.toString()}`);
}
