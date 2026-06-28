import React from "react";
import { StyleSheet, View } from "react-native";
import { devBypassLogin, useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { AuthLoginCard } from "../../shared/auth/AuthLoginCard";
import {
  toStoreRoleStatePresentation,
  useStoreRoleContextController,
} from "../../shared/store";

export function PartnerStoreScreen() {
  const identity = useIdentitySession();
  const controller = useStoreRoleContextController("partner", identity.state.kind);
  const state = controller.state;

  if (identity.state.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <AuthLoginCard
          title="تسجيل دخول الشريك"
          subtitle="ستظهر لوحة المتجر المرتبطة بهويتك فقط."
          loading={identity.state.kind === "authenticating"}
          {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
          onSubmit={(username, password) => void identity.login(username, password)}
          onDevBypass={() => devBypassLogin("partner")}
        />
      </ScrollScreen>
    );
  }

  if (state.kind !== "success") {
    const { retryable, ...presentation } = toStoreRoleStatePresentation(state, {
      loading: "جاري تحميل لوحة المتجر",
      empty: "لا يوجد متجر مرتبط بهذا الشريك",
      error: "تعذر تحميل لوحة المتجر",
    });
    return (
      <StateView
        {...presentation}
        {...(retryable ? { actionLabel: "إعادة المحاولة", onActionPress: controller.retry } : {})}
      />
    );
  }

  const partner = controller.experience?.partner;
  if (!partner) return null;

  return (
    <ScrollScreen>
      <Card>
        <View style={styles.hero}>
          <View style={styles.headerRow}>
            <Text role="titleLg" align="start">{partner.store.displayName}</Text>
            <Badge
              label={`${partner.readinessPercent}% جاهزية`}
              tone={partner.attentionCount === 0 ? "success" : "warning"}
            />
          </View>
          <Text tone="secondary" align="start">{partner.serviceModesLabel}</Text>
          <View style={styles.badges}>
            <Badge label={partner.operatingLabel} tone={partner.store.isOpen ? "success" : "neutral"} />
            <Badge label={partner.visibilityLabel} tone={partner.store.isVisible ? "info" : "warning"} />
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.section}>
          <Text role="titleMd" align="start">جاهزية المتجر</Text>
          <Text tone="secondary" align="start">{partner.catalogReadinessSummary}</Text>
          <Text tone={partner.attentionCount === 0 ? "success" : "warning"} align="start">
            {partner.nextAction}
          </Text>
        </View>
      </Card>

      <Text role="titleMd" align="start">عناصر الجاهزية</Text>
      <Card>
        {partner.checks.map((check) => (
          <ListItem
            key={check.id}
            title={check.label}
            subtitle={check.detail}
            trailing={<Badge label={check.ready ? "جاهز" : "مراجعة"} tone={check.ready ? "success" : "warning"} />}
          />
        ))}
      </Card>

      <Button label="تحديث بيانات المتجر" tone="secondary" onPress={controller.retry} />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing[4],
    gap: spacing[2],
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  badges: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  section: {
    padding: spacing[4],
    gap: spacing[2],
  },
});

export default PartnerStoreScreen;
