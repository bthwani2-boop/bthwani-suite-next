export type DshNotificationChannel = "in_app" | "push";
export type DshNotificationLocale = "ar" | "en";

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
  readonly readAt?: string | undefined;
};

export type DshNotificationPreference = {
  readonly actorId: string;
  readonly actorType: string;
  readonly topic: string;
  readonly enabled: boolean;
  readonly channels: readonly DshNotificationChannel[];
  readonly quietHoursStart?: string | undefined;
  readonly quietHoursEnd?: string | undefined;
  readonly locale: DshNotificationLocale;
  readonly timezone: string;
  readonly updatedAt: string;
};

export type DshUpdateNotificationPreferenceInput = {
  readonly topic: string;
  readonly enabled: boolean;
  readonly channels: readonly DshNotificationChannel[];
  readonly quietHoursStart?: string | undefined;
  readonly quietHoursEnd?: string | undefined;
  readonly locale: DshNotificationLocale;
  readonly timezone: string;
};

export type DshPlatformNotificationConfig = {
  readonly id: string;
  readonly topic: string;
  readonly actorTypes: readonly string[];
  readonly isEnabled: boolean;
  readonly description: string;
  readonly defaultChannels: readonly DshNotificationChannel[];
  readonly titleAr: string;
  readonly bodyAr: string;
  readonly titleEn: string;
  readonly bodyEn: string;
  readonly variables: readonly string[];
  readonly deepLinkPattern: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

export type DshUpsertPlatformNotificationConfigInput = {
  readonly topic: string;
  readonly actorTypes: readonly string[];
  readonly isEnabled: boolean;
  readonly description: string;
  readonly defaultChannels: readonly DshNotificationChannel[];
  readonly titleAr: string;
  readonly bodyAr: string;
  readonly titleEn: string;
  readonly bodyEn: string;
  readonly variables: readonly string[];
  readonly deepLinkPattern: string;
};

export type DshNotificationDeliveryOutcome = "sent" | "retry_scheduled" | "dead_letter";

export type DshNotificationDeliveryAttempt = {
  readonly id: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly attemptNumber: number;
  readonly outcome: DshNotificationDeliveryOutcome;
  readonly errorMessage: string;
  readonly nextRetryAt?: string | null | undefined;
  readonly createdAt: string;
  readonly outboxStatus: "pending" | "sent" | "failed";
  readonly correlationId: string;
};

export type DshNotificationDeliveryAuditSummary = {
  readonly sent: number;
  readonly retryScheduled: number;
  readonly deadLetter: number;
  readonly pendingOutbox: number;
  readonly failedOutbox: number;
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

export type DshNotificationDeliveryAuditState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "success";
      readonly attempts: readonly DshNotificationDeliveryAttempt[];
      readonly summary: DshNotificationDeliveryAuditSummary;
    }
  | { readonly kind: "error"; readonly message: string };
