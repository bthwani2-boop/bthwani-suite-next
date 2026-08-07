import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Box,
  Divider,
  Icon,
  StateView,
  Text,
  TopBar,
  colorRoles,
  radius,
  spacing,
} from "@bthwani/ui-kit";
import { usePartnerCommercialSummaryController } from "../../shared/partner";

export type PartnerCommercialSummaryScreenProps = {
  readonly storeId: string | null;
  readonly onBack: () => void;
};

export function PartnerCommercialSummaryScreen({
  storeId,
  onBack,
}: PartnerCommercialSummaryScreenProps) {
  const { state, reload } = usePartnerCommercialSummaryController(storeId);

  return (
    <View style={styles.root}>
      <TopBar title="النموذج التجاري" onBack={onBack} />
      {state.kind === "loading" || state.kind === "idle" ? (
        <StateView loading title="جاري تحميل النموذج التجاري…" />
      ) : state.kind === "error" ? (
        <StateView
          tone="danger"
          title="تعذر التحميل"
          description={state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={reload}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Box gap={spacing[4]} padding={spacing[6]} style={styles.section}>
            <View style={styles.sectionTitle}>
              <Icon name="storefront" size={24} tone="brand" />
              <Text role="headingSm">تفاصيل النموذج التجاري</Text>
            </View>
            <Divider />
            <View style={styles.row}>
              <Text role="body" tone="muted">نوع النموذج</Text>
              <Text role="body">{state.summary.modelType}</Text>
            </View>
            <View style={styles.row}>
              <Text role="body" tone="muted">الرسوم / النسبة</Text>
              <Text role="body">{state.summary.value} {state.summary.currency}</Text>
            </View>
            <View style={styles.row}>
              <Text role="body" tone="muted">تاريخ البدء</Text>
              <Text role="body">
                {state.summary.effectiveAt
                  ? new Date(state.summary.effectiveAt).toLocaleDateString("ar-SA")
                  : "غير محدد"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text role="body" tone="muted">تاريخ الانتهاء</Text>
              <Text role="body">
                {state.summary.endsAt
                  ? new Date(state.summary.endsAt).toLocaleDateString("ar-SA")
                  : "مستمر"}
              </Text>
            </View>
          </Box>

          <Box gap={spacing[4]} padding={spacing[6]} style={styles.section}>
            <View style={styles.sectionTitle}>
              <Icon name="wallet-outline" size={24} tone="brand" />
              <Text role="headingSm">الملخص المالي (WLT)</Text>
            </View>
            <Divider />
            <Text role="body" tone="muted" style={styles.explanation}>
              تُحتسب الرسوم والعمولات والفواتير والتسويات من خلال النظام المالي الموحد WLT.
              ويمكن قراءة كشف الحساب والالتزامات من واجهة المحفظة المخولة.
            </Text>
          </Box>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceBase,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
  },
  section: {
    backgroundColor: colorRoles.surfaceMuted,
    borderRadius: radius.md,
  },
  sectionTitle: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[2],
  },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[2],
    gap: spacing[3],
  },
  explanation: {
    lineHeight: 22,
    textAlign: "right",
  },
});
