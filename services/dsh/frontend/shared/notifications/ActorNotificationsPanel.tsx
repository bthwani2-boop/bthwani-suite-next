import React from "react";
import { Badge, Box, Button, ListItem, StateView, Surface, Text, spacing } from "@bthwani/ui-kit";
import { useNotificationsController } from "./use-notifications-controller";

export type ActorNotificationsPanelProps = {
  readonly authKind: string;
  readonly title?: string;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly maxItems?: number;
  readonly onOpenActionUrl?: (actionUrl: string) => void;
};

export function ActorNotificationsPanel({
  authKind,
  title = "الإشعارات",
  emptyTitle = "لا توجد إشعارات",
  emptyDescription = "ستظهر هنا إشعارات هذا الممثل عند وصولها.",
  maxItems,
  onOpenActionUrl,
}: ActorNotificationsPanelProps) {
  const { state, markRead, markAllRead, reload } = useNotificationsController(authKind);

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

  if (notifications.length === 0) {
    return <StateView title={emptyTitle} description={emptyDescription} actionLabel="تحديث" onActionPress={reload} />;
  }

  return (
    <Surface tone="raised" padding={3} gap={3}>
      <Box layoutDirection="row" align="center" gap={2} style={{ flexDirection: "row-reverse", justifyContent: "space-between", flexWrap: "wrap" }}>
        <Box gap={1} style={{ alignItems: "flex-end", flex: 1, minWidth: 180 }}>
          <Text role="label" style={{ textAlign: "right" }}>{title}</Text>
          <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>
            {state.unreadCount > 0 ? `${state.unreadCount} غير مقروءة` : "كل الإشعارات مقروءة"}
          </Text>
        </Box>
        <Button label="تحديد الكل مقروءاً" tone="secondary" size="sm" fullWidth={false} onPress={() => { void markAllRead(); }} />
      </Box>

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
    </Surface>
  );
}

