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

export function PartnerStoreScreen() {
  const controller = useStoreRoleContextController({
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
          title="متجر الشريك"
          subtitle="ملف المتجر وجاهزيته التشغيلية"
          actions={
            <Badge
              label={partner.store.isOpen ? "يعمل" : "متوقف"}
              tone={partner.store.isOpen ? "success" : "warning"}
            />
          }
        />
        <Card>
          <View style={styles.cardContent}>
            <Text role="titleLg">{partner.store.displayName}</Text>
            <Text tone="secondary">
              {partner.store.categoryLabel} · {partner.store.serviceAreaCode} /{" "}
              {partner.store.cityCode}
            </Text>
            <View style={styles.badges}>
              <Badge label={partner.operatingLabel} tone={partner.store.isOpen ? "success" : "warning"} />
              <Badge label={partner.visibilityLabel} tone={partner.store.isVisible ? "info" : "neutral"} />
            </View>
          </View>
        </Card>

        <Text role="titleMd">جاهزية المتجر</Text>
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
            <Text role="titleSm">ملخص جاهزية الكتالوج</Text>
            <Text tone="secondary">{partner.catalogReadinessSummary}</Text>
            <Text role="caption" tone="muted">
              هذا ملخص جاهزية بيانات المتجر فقط، ولا يتضمن إدارة المنتجات.
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
});
