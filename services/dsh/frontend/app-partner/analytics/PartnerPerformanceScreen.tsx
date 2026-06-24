import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/app-shell";
import {
  Badge,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import {
  usePartnerPerformanceController,
  buildPartnerPerformanceViewModel,
  type DshAnalyticsPeriod,
} from "../../shared/analytics";

const PERIOD_LABELS: Record<DshAnalyticsPeriod, string> = {
  today: "اليوم",
  week: "الأسبوع",
  month: "الشهر",
};

export function PartnerPerformanceScreen() {
  const identity = useIdentitySession();
  const [period, setPeriod] = React.useState<DshAnalyticsPeriod>("today");

  const { state, reload } = usePartnerPerformanceController(identity.state.kind, period);

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يرجى تسجيل الدخول للاطلاع على بيانات المتجر."
      />
    );
  }

  const vm = state.kind === "success" ? buildPartnerPerformanceViewModel(state.data) : null;

  return (
    <ScrollScreen>
      <Header title="أداء متجري" subtitle="مؤشرات أداء متجرك التشغيلية" />

      <Card>
        <View style={styles.periodRow}>
          <Text role="titleSm">الفترة</Text>
          <View style={styles.periodChips}>
            {(["today", "week", "month"] as DshAnalyticsPeriod[]).map((p) => (
              <Button
                key={p}
                label={PERIOD_LABELS[p]}
                tone={period === p ? "primary" : "ghost"}
                onPress={() => setPeriod(p)}
              />
            ))}
          </View>
        </View>
      </Card>

      {state.kind === "loading" && <StateView title="جاري تحميل البيانات…" />}

      {state.kind === "error" && (
        <StateView
          title="تعذّر تحميل بيانات الأداء"
          description={state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={reload}
        />
      )}

      {state.kind === "success" && vm && (
        <>
          <Card>
            <View style={styles.headerRow}>
              <Text role="titleSm">ملخص الأداء</Text>
              <Badge label={`قبول: ${vm.acceptanceRate}`} tone={vm.healthTone} />
            </View>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCell}>
                <Text role="caption" tone="muted">إجمالي الطلبات</Text>
                <Text role="titleLg">{state.data.totalOrders}</Text>
              </View>
              <View style={styles.kpiCell}>
                <Text role="caption" tone="muted">طلبات مقبولة</Text>
                <Text role="titleLg">{state.data.acceptedOrders}</Text>
              </View>
              <View style={styles.kpiCell}>
                <Text role="caption" tone="muted">طلبات مرفوضة</Text>
                <Text role="titleLg">{state.data.rejectedOrders}</Text>
              </View>
            </View>
          </Card>

          <Card>
            <View style={styles.rateRow}>
              <View style={styles.rateCell}>
                <Text role="caption" tone="muted">معدل القبول</Text>
                <Badge label={vm.acceptanceRate} tone={vm.healthTone} />
              </View>
              <View style={styles.rateCell}>
                <Text role="caption" tone="muted">معدل الرفض</Text>
                <Badge label={vm.rejectionRate} tone={Number(vm.rejectionRate.replace("%", "")) > 20 ? "danger" : "success"} />
              </View>
            </View>
            <Text role="caption" tone="muted" style={styles.note}>
              {vm.healthTone === "success"
                ? "أداء ممتاز — استمر في الحفاظ على هذا المستوى."
                : vm.healthTone === "warning"
                  ? "الأداء متوسط — حاول تحسين معدل قبول الطلبات."
                  : "الأداء يحتاج تحسينًا — تواصل مع فريق الدعم إذا واجهت صعوبات."}
            </Text>
          </Card>

          <Card>
            <View style={styles.infoRow}>
              <Text role="caption" tone="muted">معرف المتجر</Text>
              <Text role="body">{state.data.storeId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text role="caption" tone="muted">آخر تحديث</Text>
              <Text role="body">{new Date(state.data.generatedAt).toLocaleString("ar-SA")}</Text>
            </View>
          </Card>
        </>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  periodRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  periodChips: { flexDirection: "row-reverse", gap: spacing[2] },
  headerRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  kpiGrid: { flexDirection: "row-reverse", justifyContent: "space-around", padding: spacing[3] },
  kpiCell: { alignItems: "center", gap: spacing[1] },
  rateRow: { flexDirection: "row-reverse", justifyContent: "space-around", padding: spacing[3] },
  rateCell: { alignItems: "center", gap: spacing[2] },
  note: { paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
  infoRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
});
