import type {
  DshNotification,
  DshNotificationsState,
  DshNotificationConfigState,
  DshPlatformNotificationConfig,
} from "./notifications.types";

export function notifIdle(): DshNotificationsState { return { kind: "idle" }; }
export function notifLoading(): DshNotificationsState { return { kind: "loading" }; }
export function notifSuccess(notifications: DshNotification[], unreadCount: number): DshNotificationsState {
  return { kind: "success", notifications, unreadCount };
}
export function notifError(message: string): DshNotificationsState { return { kind: "error", message }; }

export function configIdle(): DshNotificationConfigState { return { kind: "idle" }; }
export function configLoading(): DshNotificationConfigState { return { kind: "loading" }; }
export function configSuccess(configs: DshPlatformNotificationConfig[]): DshNotificationConfigState {
  return { kind: "success", configs };
}
export function configError(message: string): DshNotificationConfigState { return { kind: "error", message }; }
