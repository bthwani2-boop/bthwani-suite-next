import React from "react";
import { Badge, Box, Button, ListItem, StateView, Surface, Text } from "@bthwani/ui-kit";
import { useNotificationsController } from "./use-notifications-controller";
import type {
  DshNotificationChannel,
  DshNotificationPreference,
  DshUpdateNotificationPreferenceInput,
} from "./notifications.types";

export type ActorNotificationsPanelProps = {
  readonly authKind: string;
  readonly title?: string;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly maxItems?: number;
  readonly onOpenActionUrl?: (actionUrl: string) => void;
};

function preferenceInput(
  preference: DshNotificationPreference,
  patch: Partial<DshUpdateNotificationPreferenceInput>,
): DshUpdateNotificationPreferenceInput {
  return {
    topic: preference.topic,
    enabled: preference.enabled,
    channels: preference.channels,
    quietHoursStart: preference.quietHoursStart,
    quietHoursEnd: preference.quietHoursEnd,
    locale: preference.locale,
    timezone: preference.timezone || "Asia/Aden",
    ...patch,
  };
}

function toggledChannels(
  current: readonly DshNotificationChannel[],
  channel: DshNotificationChannel,
): readonly DshNotificationChannel[] {
  if (current.includes(channel)) {
    const next = current.filter((item) => item !== channel);
    return next.length > 0 ? next : ["in_app"];
  }
  return [...current, channel];
}

function channelLabel(channel: DshNotificationChannel): string {
  return channel === "push" ? "Push" : "داخل التطبيق";
}

export function ActorNotificationsPanel({
  authKind,
  title = "الإشعارات",
  emptyTitle = "لا توجد إشعارات",
  emptyDescription = "ستظهر هنا إشعارات هذا الممثل عند وصولها.",
  maxItems,
  onOpenActionUrl,
}: ActorNotificationsPanelProps) {
  const {
    state,
    preferenceState,
    markRead,
    markAllRead,
    reload,
    savePreference,
  } = useNotificationsController(authKind);

  if (authKind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الإشعارات مرتبطة بالممثل الحالي فقط." />;
  }

  if (state.kind === "idle" || state.kind === "loading") {
    return <StateView loading title="جارٍ تحميل الإشعارات" description="نزامن آخر إشعارات الممثل الحالي." />;
  }

  if (state.kind === "error") {
    return <StateView tone="danger" title="تعذر تحميل الإشعارات" description={state.message} actionLabel="إعادة المحاولة" onActionPress={reload} />;
  }

  const notifications = maxItems ? state.notifications.slice(0, maxItems) : state.notifications;

  return (
    <Surface tone="raised" padding={3} gap={4}>
      <Box layoutDirection="row" align="center" justify="space-between" gap={2}>
        <Box gap={1}>
          <Text role="label" align="start">{title}</Text>
          <Text role="bodySm" tone="muted" align="start">
            {state.unreadCount > 0 ? `${state.unreadCount} غير مقروءة` : "كل الإشعارات مقروءة"}
          </Text>
        </Box>
        <Button label="تحديد الكل مقروءاً" tone="secondary" size="sm" fullWidth={false} onPress={() => { void markAllRead(); }} />
      </Box>

      {notifications.length === 0 ? (
        <StateView title={emptyTitle} description={emptyDescription} actionLabel="تحديث" onActionPress={reload} />
      ) : (
        <Box gap={2}>
          {notifications.map((notification) => (
            <ListItem
              key={notification.id}
              title={notification.title}
              subtitle={notification.body}
              meta={new Date(notification.createdAt).toLocaleString("ar-YE")}
              trailing={<Badge label={notification.isRead ? notification.topic : "جديد"} tone={notification.isRead ? "neutral" : "action"} />}
              onPress={() => {
                void markRead(notification.id);
                if (notification.actionUrl) onOpenActionUrl?.(notification.actionUrl);
              }}
            />
          ))}
        </Box>
      )}

      <Box gap={2}>
        <Text role="titleSm" align="start">تفضيلات الإشعارات</Text>
        {preferenceState.kind === "idle" || preferenceState.kind === "loading" ? (
          <StateView loading title="جارٍ تحميل التفضيلات" />
        ) : preferenceState.kind === "error" ? (
          <StateView tone="warning" title="تعذر تحميل التفضيلات" description={preferenceState.message} actionLabel="إعادة المحاولة" onActionPress={reload} />
        ) : preferenceState.preferences.length === 0 ? (
          <StateView title="لا توجد تفضيلات مخصصة" description="تستخدم الإشعارات إعدادات المنصة الافتراضية لهذا الممثل." />
        ) : (
          preferenceState.preferences.map((preference) => (
            <Surface key={preference.topic} tone="subtle" padding={3} gap={2}>
              <Box layoutDirection="row" align="center" justify="space-between" gap={2}>
                <Box gap={1}>
                  <Text role="label" align="start">{preference.topic}</Text>
                  <Text role="bodySm" tone="muted" align="start">
                    {preference.enabled ? "مفعّل لهذا الممثل" : "متوقف لهذا الممثل"}
                  </Text>
                </Box>
                <Button
                  label={preference.enabled ? "إيقاف" : "تفعيل"}
                  tone={preference.enabled ? "secondary" : "primary"}
                  size="sm"
                  fullWidth={false}
                  onPress={() => { void savePreference(preferenceInput(preference, { enabled: !preference.enabled })); }}
                />
              </Box>

              <Box layoutDirection="row" gap={2}>
                {(["in_app", "push"] as const).map((channel) => (
                  <Button
                    key={channel}
                    label={`${preference.channels.includes(channel) ? "✓ " : ""}${channelLabel(channel)}`}
                    tone={preference.channels.includes(channel) ? "primary" : "secondary"}
                    size="sm"
                    fullWidth={false}
                    onPress={() => {
                      void savePreference(preferenceInput(preference, {
                        channels: toggledChannels(preference.channels, channel),
                      }));
                    }}
                  />
                ))}
              </Box>

              <Box layoutDirection="row" gap={2}>
                <Button
                  label={preference.quietHoursStart ? "إلغاء وقت الهدوء" : "هدوء 22:00–07:00"}
                  tone="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => {
                    void savePreference(preferenceInput(preference, preference.quietHoursStart
                      ? { quietHoursStart: undefined, quietHoursEnd: undefined }
                      : { quietHoursStart: "22:00", quietHoursEnd: "07:00" }));
                  }}
                />
                <Button
                  label={preference.locale === "ar" ? "العربية" : "English"}
                  tone="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => {
                    void savePreference(preferenceInput(preference, {
                      locale: preference.locale === "ar" ? "en" : "ar",
                    }));
                  }}
                />
              </Box>

              <Text role="caption" tone="muted" align="start">
                {preference.quietHoursStart && preference.quietHoursEnd
                  ? `وقت الهدوء: ${preference.quietHoursStart}–${preference.quietHoursEnd} (${preference.timezone})`
                  : `لا يوجد وقت هدوء (${preference.timezone})`}
              </Text>
            </Surface>
          ))
        )}
      </Box>
    </Surface>
  );
}
