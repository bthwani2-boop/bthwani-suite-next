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

export function PartnerStoreScreen({ storeId }: Props) {
  const controller = useStoreRoleContextController({
    ...(storeId !== undefined ? { storeId } : {}),
    actorRole: "partner",
    contextMode: "readiness",
  });
  const state = controller.state;

  if (state.kind !== "success") {
    const { retryable, ...presentation } = toStoreRoleStatePresentation(state, {
      loading: "جاري تحميل المتجر",
      empty: "لا يوجد متجر متاح",
      error: "تعذر تحميل متجر الشريك",
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

  const { partner } = state;
  return (
    <ScrollScreen>
      <Header
        title="مركز تشغيل المتجر"
        subtitle="ملخص جاهزية متجرك وظهوره للعملاء"
        actions={
          <Badge
            label={partner.store.isOpen ? "نشط الآن" : "متوقف"}
            tone={partner.store.isOpen ? "success" : "warning"}
          />
        }
      />

      <Card>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text role="titleLg">{partner.store.displayName}</Text>
            <Text tone="secondary">
              {partner.store.categoryLabel} · {partner.store.cityCode} / {partner.store.serviceAreaCode}
            </Text>
            <View style={styles.badges}>
              <Badge label={partner.operatingLabel} tone={partner.store.isOpen ? "success" : "warning"} />
              <Badge label={partner.visibilityLabel} tone={partner.store.isVisible ? "info" : "neutral"} />
            </View>
          </View>
          <View style={styles.score}>
            <Text role="display">{partner.readinessPercent}%</Text>
            <Text role="caption" tone="muted">جاهزية البيانات</Text>
          </View>
        </View>
      </Card>

      <View style={styles.metrics}>
        <Card>
          <View style={styles.metric}>
            <Text role="titleLg">{partner.checks.length - partner.attentionCount}</Text>
            <Text role="caption" tone="muted">عناصر جاهزة</Text>
          </View>
        </Card>
        <Card>
          <View style={styles.metric}>
            <Text role="titleLg">{partner.attentionCount}</Text>
            <Text role="caption" tone="muted">تحتاج مراجعة</Text>
          </View>
        </Card>
      </View>

      <Text role="titleMd">حالة التشغيل</Text>
      <Card>
        <ListItem title="طرق الخدمة" subtitle={partner.serviceModesLabel} />
        <ListItem title="الرؤية للعملاء" subtitle={partner.visibilityLabel} />
        <ListItem title="جاهزية الكتالوج" subtitle={partner.catalogReadinessSummary} />
      </Card>

      <Text role="titleMd">قائمة الجاهزية</Text>
      <Card>
        {partner.checks.map((check) => (
          <ListItem
            key={check.id}
            title={check.label}
            subtitle={check.detail}
            trailing={
              <Badge
                label={check.ready ? "جاهز" : "يحتاج إجراء"}
                tone={check.ready ? "success" : "warning"}
              />
            }
          />
        ))}
      </Card>

      <Card>
        <View style={styles.cardContent}>
          <Text role="titleSm">الإجراء التالي</Text>
          <Text tone="secondary">{partner.nextAction}</Text>
          <Text role="caption" tone="muted">
            إدارة المنتجات والطلبات ليست ضمن DSH-001، وتبقى مرتبطة بمواضيعها المعتمدة.
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
  badges: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  hero: {
    padding: spacing[4],
    gap: spacing[4],
  },
  heroCopy: {
    gap: spacing[2],
  },
  score: {
    alignItems: "flex-end",
    gap: spacing[1],
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
