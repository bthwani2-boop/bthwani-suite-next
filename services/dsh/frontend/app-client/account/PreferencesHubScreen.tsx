import React from "react";
import { StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Header,
  ScrollScreen,
  StateView,
  Text,
  colorRoles,
  radius,
  spacing,
} from "@bthwani/ui-kit";
import {
  useNotificationsController,
  type DshNotificationPreference,
} from "../../shared/notifications";

export type PreferencesHubScreenProps = {
  onBack?: () => void;
};

function topicLabel(topic: string): string {
  if (topic.startsWith("order.")) return "تحديثات الطلب";
  if (topic.startsWith("partner_delivery_")) return "تحديثات التوصيل";
  if (topic.startsWith("pickup_")) return "تحديثات الاستلام من المتجر";
  if (topic.startsWith("special_request_")) return "تحديثات الطلبات الخاصة";
  return topic.replaceAll("_", " ").replaceAll(".", " ");
}

function channelsLabel(preference: DshNotificationPreference): string {
  const labels = preference.channels.map((channel) =>
    channel === "push" ? "إشعار الهاتف" : "داخل التطبيق",
  );
  return labels.join(" · ");
}

export function PreferencesHubScreen({ onBack }: PreferencesHubScreenProps) {
  const identity = useIdentitySession();
  const authKind = identity.state.kind === "authenticated" ? "authenticated" : "unauthenticated";
  const controller = useNotificationsController(authKind);
  const [savingTopic, setSavingTopic] = React.useState<string | null>(null);
  const [localActionError, setLocalActionError] = React.useState<string | null>(null);

  const handleToggle = React.useCallback(
    async (preference: DshNotificationPreference, enabled: boolean) => {
      if (savingTopic !== null || controller.busyAction !== null) return;
      setSavingTopic(preference.topic);
      setLocalActionError(null);
      const accepted = await controller.savePreference({
        topic: preference.topic,
        enabled,
        channels: preference.channels,
        quietHoursStart: preference.quietHoursStart,
        quietHoursEnd: preference.quietHoursEnd,
        locale: preference.locale,
        timezone: preference.timezone,
      });
      if (!accepted) {
        setLocalActionError("تعذر حفظ التفضيل في DSH. لم يُعرض نجاح قبل القراءة الراجعة.");
      }
      setSavingTopic(null);
    },
    [controller, savingTopic],
  );

  const preferenceState = controller.preferenceState;
  const actionError = controller.actionError ?? localActionError;

  return (
    <ScrollScreen>
      <Header
        title="تفضيلات الإشعارات"
        subtitle="إعدادات حساب محفوظة في DSH ومقروءة بعد كل تعديل"
      />

      <View style={styles.content}>
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="العودة"
            style={styles.backButton}
            onPress={onBack}
          >
            <Text style={styles.backText}>العودة</Text>
          </TouchableOpacity>
        ) : null}

        {preferenceState.kind === "idle" ? (
          <StateView
            tone="warning"
            title="يلزم تسجيل الدخول"
            description="لا يمكن قراءة تفضيلات حساب دون جلسة عميل موثوقة."
          />
        ) : null}

        {preferenceState.kind === "loading" ? (
          <StateView tone="neutral" title="جارٍ تحميل التفضيلات…" />
        ) : null}

        {preferenceState.kind === "error" ? (
          <>
            <StateView
              tone="danger"
              title="تعذر تحميل التفضيلات"
              description={preferenceState.message}
            />
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.retryButton}
              onPress={() => void controller.reload()}
            >
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {actionError ? (
          <StateView tone="danger" title="تعذر حفظ التغيير" description={actionError} />
        ) : null}

        {preferenceState.kind === "success" && preferenceState.preferences.length === 0 ? (
          <StateView
            tone="neutral"
            title="لا توجد تفضيلات مخصصة"
            description="تُطبق إعدادات الإشعارات الافتراضية للمنصة. لن تُعرض مفاتيح وهمية قبل وجود موضوعات محفوظة للحساب."
          />
        ) : null}

        {preferenceState.kind === "success"
          ? preferenceState.preferences.map((preference) => {
              const saving = savingTopic === preference.topic;
              return (
                <View key={preference.topic} style={styles.preferenceCard}>
                  <View style={styles.preferenceText}>
                    <Text role="bodyStrong" style={styles.preferenceTitle}>
                      {topicLabel(preference.topic)}
                    </Text>
                    <Text role="bodySm" tone="muted" style={styles.preferenceDescription}>
                      {channelsLabel(preference)} · {preference.locale === "ar" ? "العربية" : "English"}
                    </Text>
                    <Text role="caption" tone="muted" style={styles.topicCode}>
                      {preference.topic}
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel={`تفعيل ${topicLabel(preference.topic)}`}
                    disabled={savingTopic !== null || controller.busyAction !== null}
                    value={preference.enabled}
                    onValueChange={(enabled) => void handleToggle(preference, enabled)}
                    trackColor={{ false: colorRoles.borderSubtle, true: colorRoles.brandAction }}
                    thumbColor={colorRoles.surfaceBase}
                  />
                  {saving ? <Text style={styles.savingText}>جارٍ الحفظ…</Text> : null}
                </View>
              );
            })
          : null}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing[4],
    gap: spacing[3],
  },
  backButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  backText: {
    color: colorRoles.brandAction,
    fontWeight: "700",
  },
  retryButton: {
    alignSelf: "center",
    borderRadius: radius.round,
    backgroundColor: colorRoles.brandAction,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  retryText: {
    color: colorRoles.surfaceBase,
    fontWeight: "700",
  },
  preferenceCard: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.lg,
    backgroundColor: colorRoles.surfaceBase,
    padding: spacing[4],
    gap: spacing[2],
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  preferenceText: {
    flex: 1,
    alignItems: "flex-end",
    gap: spacing[1],
  },
  preferenceTitle: {
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  preferenceDescription: {
    textAlign: "right",
  },
  topicCode: {
    textAlign: "right",
  },
  savingText: {
    color: colorRoles.brandAction,
    fontSize: 11,
  },
});
