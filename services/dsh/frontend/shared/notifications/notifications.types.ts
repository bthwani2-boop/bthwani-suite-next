export type DshNotification = {
  readonly id: string;
  readonly actorId: string;
  readonly actorType: string;
  readonly topic: string;
  readonly title: string;
  readonly body: string;
  readonly actionUrl: string;
  readonly isRead: boolean;
  readonly createdAt: string;
  readonly readAt?: string;
};

export type DshNotificationPreference = {
  readonly actorId: string;
  readonly actorType: string;
  readonly topic: string;
  readonly enabled: boolean;
  readonly updatedAt: string;
};

export type DshPlatformNotificationConfig = {
  readonly id: string;
  readonly topic: string;
  readonly actorTypes: readonly string[];
  readonly isEnabled: boolean;
  readonly description: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

export type DshNotificationsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly notifications: readonly DshNotification[]; readonly unreadCount: number }
  | { readonly kind: "error"; readonly message: string };

export type DshNotificationConfigState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly configs: readonly DshPlatformNotificationConfig[] }
  | { readonly kind: "error"; readonly message: string };
