import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  Card,
  Header,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import {
  toStoreRoleStatePresentation,
  useStoreRoleContextController,
} from "../../shared/store";

type Props = Readonly<{ storeId?: string }>;

export function FieldStoreVerificationScreen({ storeId }: Props) {
  const controller = useStoreRoleContextController({
    ...(storeId !== undefined ? { storeId } : {}),
    actorRole: "field",
    contextMode: "verification",
  });
  const state = controller.state;

  if (state.kind !== "success") {
    const { retryable, ...presentation } = toStoreRoleStatePresentation(state, {
      loading: "جاري تحميل سياق المتجر",
      empty: "لا يوجد متجر للتحقق",
      error: "تعذر تحميل التحقق الميداني",
    });
    return (
      <StateView
        {...presentation}
        {...(retryable
          ? { actionLabel: "إعادة المحاولة", onActionPress: controller.retry }
          : {})}
      />
    );
  }

  const { field } = state;
  return (
    <ScrollScreen>
      <Header
        title="مساحة التحقق الميداني"
        subtitle="مراجعة جاهزية بيانات المتجر قبل الزيارة والاعتماد"
        actions={
          <Badge
            label={`${field.readinessPercent}% مكتمل`}
            tone={field.attentionChecks.length === 0 ? "success" : "warning"}
          />
        }
      />
      <Card>
        <View style={styles.hero}>
          <Text role="titleLg">{field.store.displayName}</Text>
          <Text tone="secondary">
            {field.store.cityCode} / {field.store.serviceAreaCode}
          </Text>
          <View style={styles.badges}>
            <Badge label={field.verificationSummary} tone={field.attentionChecks.length === 0 ? "success" : "warning"} />
            <Badge label={field.store.isVisible ? "ظاهر للعملاء" : "غير ظاهر"} tone={field.store.isVisible ? "info" : "neutral"} />
          </View>
        </View>
      </Card>

      <View style={styles.metrics}>
        <Card>
          <View style={styles.metric}>
            <Text role="titleLg">{field.checks.length - field.attentionChecks.length}</Text>
            <Text role="caption" tone="muted">أدلة مثبتة</Text>
          </View>
        </Card>
        <Card>
          <View style={styles.metric}>
            <Text role="titleLg">{field.attentionChecks.length}</Text>
            <Text role="caption" tone="muted">ملاحظات مفتوحة</Text>
          </View>
        </Card>
      </View>

      <Text role="titleMd">قائمة التحقق</Text>
      <Card>
        {field.checks.map((check) => (
          <ListItem
            key={check.id}
            title={check.label}
            subtitle={check.detail}
            trailing={<Badge label={check.ready ? "مثبت" : "ناقص"} tone={check.ready ? "success" : "warning"} />}
          />
        ))}
      </Card>

      <Card>
        <View style={styles.cardContent}>
          <Text role="titleSm">توصية التحقق</Text>
          <Text tone="secondary">{field.recommendation}</Text>
          <Text role="caption" tone="muted">
            رفع الوثائق والاعتماد الميداني الفعلي يظل ضمن DSH-008 بعد اعتماده.
          </Text>
        </View>
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: spacing[4],
    gap: spacing[2],
  },
  hero: {
    padding: spacing[4],
    gap: spacing[2],
  },
  badges: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  metrics: {
    flexDirection: "row-reverse",
    gap: spacing[3],
  },
  metric: {
    minWidth: 128,
    padding: spacing[4],
    alignItems: "center",
    gap: spacing[1],
  },
});
