import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Header,
  ScrollScreen,
  StateView,
  Text,
  lightThemeColors,
  spacing,
} from "@bthwani/ui-kit";
import { useNotificationsController } from "../../shared/notifications";

export function NotificationCenterScreen() {
  const identity = useIdentitySession();
  const { state, markRead, markAllRead, reload } = useNotificationsController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" />;
  }
  if (state.kind === "loading" || state.kind === "idle") return <StateView title="جارٍ التحميل…" />;
  if (state.kind === "error") {
    return <StateView title="خطأ" description={state.message} actionLabel="إعادة المحاولة" onActionPress={reload} />;
  }

  const unreadBadge = state.unreadCount > 0 ? (
    <Badge label={String(state.unreadCount)} tone="info" />
  ) : undefined;

  if (state.notifications.length === 0) {
    return (
      <ScrollScreen>
        <Header title="الإشعارات" actions={unreadBadge} />
        <StateView title="لا توجد إشعارات" description="ستظهر هنا إشعاراتك عند وصولها." />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <Header title="الإشعارات" actions={unreadBadge} />
      <View style={styles.markAllRow}>
        <Button label="تحديد الكل مقروءاً" tone="ghost" size="sm" onPress={() => { void markAllRead(); }} />
      </View>
      <View style={styles.list}>
        {state.notifications.map((n) => (
          <TouchableOpacity
            key={n.id}
            style={[styles.item, !n.isRead && styles.unread]}
            onPress={() => markRead(n.id)}
          >
            <Text role="label">{n.title}</Text>
            <Text role="body">{n.body}</Text>
            <Text role="caption">{new Date(n.createdAt).toLocaleString("ar")}</Text>
            {!n.isRead && <Badge label="جديد" tone="action" />}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  markAllRow: { padding: spacing[4], alignItems: "flex-end" },
  list: { padding: spacing[4], gap: spacing[2] },
  item: { padding: spacing[4], backgroundColor: lightThemeColors.surfaceRaised, borderRadius: 8, gap: spacing[1] },
  unread: { backgroundColor: lightThemeColors.infoSoft },
});
