"use client";

import { useState } from "react";
import { useIdentitySession } from "@bthwani/app-shell";
import {
  Badge,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  View,
  StyleSheet,
  spacing,
  lightThemeColors,
} from "@bthwani/ui-kit";
import {
  useOperatorAnalyticsDashboardController,
  buildPlatformKpisViewModel,
  type DshAnalyticsPeriod,
} from "../../shared/analytics";

const PERIOD_LABELS: Record<DshAnalyticsPeriod, string> = {
  today: "اليوم",
  week: "الأسبوع",
  month: "الشهر",
};

export function FinanceDashboardScreen() {
  const identity = useIdentitySession();
  const [period, setPeriod] = useState<DshAnalyticsPeriod>("today");

  const { platformState, reload } = useOperatorAnalyticsDashboardController(
    identity.state.kind,
    period
  );

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }

  if (platformState.kind === "loading") {
    return <StateView title="جارٍ التحميل…" />;
  }

  if (platformState.kind === "error") {
    return (
      <StateView
        title="تعذّر تحميل البيانات"
        description={platformState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={reload}
      />
    );
  }

  const vm =
    platformState.kind === "success"
      ? buildPlatformKpisViewModel(platformState.kpis)
      : null;

  return (
    <ScrollScreen>
      <Header title="لوحة المالية" />
      <View style={styles.periodRow}>
        {(["today", "week", "month"] as DshAnalyticsPeriod[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              border: "1px solid",
              borderColor: period === p ? lightThemeColors.info : "rgba(0,0,0,0.12)",
              background: period === p ? lightThemeColors.infoSoft : "transparent",
              color: period === p ? lightThemeColors.info : "inherit",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </View>

      <View style={styles.notice}>
        <Text role="caption">
          البيانات المالية مقدَّمة بصلاحية قراءة فقط من خدمة WLT. لا يتم تنفيذ أي عملية مالية داخل DSH.
        </Text>
      </View>

      {vm ? (
        <View style={styles.grid}>
          <Card style={styles.kpiCard}>
            <Text role="caption">معدّل التوصيل</Text>
            <Text role="titleMd">{vm.fulfillmentRate}</Text>
            <Badge label={vm.healthTone === "success" ? "جيد" : vm.healthTone === "warning" ? "تحذير" : "تنبيه"} tone={vm.healthTone} />
          </Card>
          <Card style={styles.kpiCard}>
            <Text role="caption">معدّل الإلغاء</Text>
            <Text role="titleMd">{vm.cancellationRate}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text role="caption">المتاجر</Text>
            <Text role="titleMd">{vm.platformLabel}</Text>
          </Card>
        </View>
      ) : (
        <StateView title="لا توجد بيانات" description="لم يُعثر على بيانات للفترة المحددة." />
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  periodRow: {
    flexDirection: "row",
    gap: spacing[2],
    padding: `${spacing[2]}px ${spacing[4]}px`,
  },
  notice: {
    margin: `${spacing[2]}px ${spacing[4]}px`,
    padding: spacing[2],
    background: lightThemeColors.infoSoft,
    borderRadius: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    padding: spacing[4],
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    padding: spacing[4],
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gap: spacing[1],
  },
});
