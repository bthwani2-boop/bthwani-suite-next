import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  ScrollScreen,
  StateView,
  Text,
  TopBar,
  lightThemeColors,
  spacing,
  colorRoles,
} from "@bthwani/ui-kit";
import { useNotificationsController } from "../../shared/notifications";

type Props = {
  readonly onBack?: () => void;
};

export function NotificationCenterScreen({ onBack }: Props) {
  const identity = useIdentitySession();
  const { state, markRead, markAllRead, reload } = useNotificationsController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <View style={styles.container}>
        <TopBar title="الإشعارات" />
        <StateView title="تسجيل الدخول مطلوب" />
      </View>
    );
  }
  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <View style={styles.container}>
        <TopBar title="الإشعارات" />
        <StateView title="جارٍ التحميل…" />
      </View>
    );
  }
  if (state.kind === "error") {
    return (
      <View style={styles.container}>
        <TopBar title="الإشعارات" />
        <StateView title="خطأ" description={state.message} actionLabel="إعادة المحاولة" onActionPress={reload} />
      </View>
    );
  }

  const titleText = state.unreadCount > 0 ? `الإشعارات (${state.unreadCount})` : "الإشعارات";

  if (state.notifications.length === 0) {
    return (
      <View style={styles.container}>
        <TopBar title={titleText} />
        <StateView title="لا توجد إشعارات" description="ستظهر هنا إشعاراتك عند وصولها." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title={titleText} />
      
      <ScrollScreen>
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
              <Text role="label" style={styles.itemTitle}>{n.title}</Text>
              <Text role="body" style={styles.itemBody}>{n.body}</Text>
              <Text role="caption" style={styles.itemDate}>{new Date(n.createdAt).toLocaleString("ar-YE")}</Text>
              {!n.isRead && <Badge label="جديد" tone="action" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  markAllRow: { padding: spacing[4], alignItems: "flex-end" },
  list: { padding: spacing[4], gap: spacing[2] },
  item: { padding: spacing[4], backgroundColor: lightThemeColors.surfaceRaised, borderRadius: 12, gap: spacing[1], borderWidth: 1, borderColor: colorRoles.borderSubtle },
  unread: { backgroundColor: lightThemeColors.infoSoft },
  itemTitle: {
    textAlign: "right",
    color: colorRoles.textPrimary,
  },
  itemBody: {
    textAlign: "right",
  },
  itemDate: {
    textAlign: "right",
  },
});

export default NotificationCenterScreen;
