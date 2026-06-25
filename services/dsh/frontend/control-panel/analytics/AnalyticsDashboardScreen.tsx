"use client";

import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
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
  useOperatorAnalyticsDashboardController,
  buildPlatformKpisViewModel,
  buildOrderAnalyticsViewModel,
  buildDeliveryAnalyticsViewModel,
  buildStoreAnalyticsViewModel,
  type DshAnalyticsPeriod,
} from "../../shared/analytics";

const PERIOD_LABELS: Record<DshAnalyticsPeriod, string> = {
  today: "اليوم",
  week: "الأسبوع",
  month: "الشهر",
};

export function AnalyticsDashboardScreen() {
  const identity = useIdentitySession();
  const [period, setPeriod] = React.useState<DshAnalyticsPeriod>("today");

  const { platformState, orderState, deliveryState, supportState, storeState, reload } =
    useOperatorAnalyticsDashboardController(identity.state.kind, period);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }

  const isLoading =
    platformState.kind === "loading" ||
    orderState.kind === "loading" ||
    deliveryState.kind === "loading" ||
    storeState.kind === "loading";

  const platformVm = platformState.kind === "success" ? buildPlatformKpisViewModel(platformState.kpis) : null;
  const orderVm = orderState.kind === "success" ? buildOrderAnalyticsViewModel(orderState.data) : null;
  const deliveryVm = deliveryState.kind === "success" ? buildDeliveryAnalyticsViewModel(deliveryState.data) : null;
  const storeVm = storeState.kind === "success" ? buildStoreAnalyticsViewModel(storeState.data) : null;

  return (
    <ScrollScreen>
      <Header
        title="التحليلات التشغيلية"
        subtitle="لوحة مؤشرات الأداء الرئيسية لمنصة DSH"
      />

      {/* Period selector */}
      <Card>
        <View style={styles.periodRow}>
          <Text role="titleSm">الفترة الزمنية</Text>
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

      {isLoading && <StateView title="جاري تحميل البيانات…" />}

      {/* Platform KPIs */}
      {platformState.kind === "error" && (
        <StateView
          title="تعذّر تحميل مؤشرات المنصة"
          description={platformState.message}
          actionLabel="إعادة المحاولة"
          onActionPress={reload}
        />
      )}
      {platformState.kind === "success" && platformVm && (
        <Card>
          <View style={styles.sectionHeader}>
            <Text role="titleSm">مؤشرات المنصة</Text>
            <Badge label={`معدل التنفيذ: ${platformVm.fulfillmentRate}`} tone={platformVm.healthTone} />
          </View>
          <View style={styles.kpiGrid}>
            <KpiCard label="إجمالي الطلبات" value={String(platformState.kpis.totalOrders)} tone="info" />
            <KpiCard label="طلبات مكتملة" value={String(platformState.kpis.deliveredOrders)} tone="success" />
            <KpiCard label="طلبات ملغاة" value={String(platformState.kpis.cancelledOrders)} tone="danger" />
            <KpiCard label="متاجر نشطة" value={String(platformState.kpis.activeStores)} tone="success" />
            <KpiCard label="تذاكر مفتوحة" value={String(platformState.kpis.openTickets)} tone={platformState.kpis.openTickets > 0 ? "warning" : "success"} />
            <KpiCard label="زيارات ميدانية مكتملة" value={String(platformState.kpis.fieldVisitsCompleted)} tone="info" />
            <KpiCard label="تصعيدات مفتوحة" value={String(platformState.kpis.openEscalations)} tone={platformState.kpis.openEscalations > 0 ? "warning" : "success"} />
            <KpiCard label="حوادث مفتوحة" value={String(platformState.kpis.openIncidents)} tone={platformState.kpis.openIncidents > 0 ? "danger" : "success"} />
          </View>
        </Card>
      )}

      {/* Order Analytics */}
      {orderState.kind === "success" && orderVm && (
        <Card>
          <View style={styles.sectionHeader}>
            <Text role="titleSm">تحليلات الطلبات</Text>
            <Badge label={`معدل الإتمام: ${orderVm.fulfillmentRate}`} tone="info" />
          </View>
          {orderVm.statusRows.map((row) => (
            <View key={row.label} style={styles.statusRow}>
              <Text role="body">{row.label}</Text>
              <Badge label={String(row.count)} tone={row.tone} />
            </View>
          ))}
          {orderVm.statusRows.length === 0 && (
            <Text role="body" tone="muted" style={styles.emptyNote}>لا توجد طلبات في هذه الفترة</Text>
          )}
        </Card>
      )}

      {/* Delivery Analytics */}
      {deliveryState.kind === "success" && deliveryVm && (
        <Card>
          <View style={styles.sectionHeader}>
            <Text role="titleSm">تحليلات التوصيل</Text>
            <Badge label={`إتمام: ${deliveryVm.completionRate}`} tone={deliveryVm.healthTone} />
          </View>
          <View style={styles.kpiGrid}>
            <KpiCard label="إجمالي الإسنادات" value={String(deliveryState.data.totalAssignments)} tone="info" />
            <KpiCard label="مقبولة" value={String(deliveryState.data.acceptedAssignments)} tone="success" />
            <KpiCard label="مكتملة" value={String(deliveryState.data.completedAssignments)} tone="success" />
            <KpiCard label="مرفوضة" value={String(deliveryState.data.declinedAssignments)} tone="danger" />
          </View>
          <View style={styles.deliveryRates}>
            <Text role="caption" tone="muted">معدل القبول: {deliveryVm.acceptanceRate}</Text>
            <Text role="caption" tone="muted">معدل الإتمام: {deliveryVm.completionRate}</Text>
          </View>
        </Card>
      )}

      {/* Support Analytics */}
      {supportState.kind === "success" && (
        <Card>
          <View style={styles.sectionHeader}>
            <Text role="titleSm">تحليلات الدعم</Text>
            <Badge label={`${supportState.data.openTickets} مفتوحة`} tone={supportState.data.openTickets > 5 ? "warning" : "success"} />
          </View>
          <View style={styles.kpiGrid}>
            <KpiCard label="إجمالي التذاكر" value={String(supportState.data.totalTickets)} tone="info" />
            <KpiCard label="مفتوحة" value={String(supportState.data.openTickets)} tone={supportState.data.openTickets > 0 ? "warning" : "success"} />
            <KpiCard label="محلولة" value={String(supportState.data.resolvedTickets)} tone="success" />
          </View>
          {supportState.data.byCategory.length > 0 && (
            <>
              <Text role="caption" tone="muted" style={styles.categoryTitle}>التوزيع حسب الفئة</Text>
              {supportState.data.byCategory.map((c) => (
                <View key={c.category} style={styles.statusRow}>
                  <Text role="body">{c.category}</Text>
                  <Badge label={String(c.count)} tone="info" />
                </View>
              ))}
            </>
          )}
        </Card>
      )}

      {/* Store Analytics */}
      {storeState.kind === "success" && storeVm && (
        <Card>
          <View style={styles.sectionHeader}>
            <Text role="titleSm">تحليلات المتاجر</Text>
            <Badge label={`جاهزية: ${storeVm.readinessRate}`} tone={storeVm.healthTone} />
          </View>
          <View style={styles.kpiGrid}>
            <KpiCard label="إجمالي المتاجر" value={String(storeState.data.totalStores)} tone="info" />
            <KpiCard label="نشطة" value={String(storeState.data.activeStores)} tone="success" />
            <KpiCard label="موقوفة" value={String(storeState.data.suspendedStores)} tone="danger" />
            <KpiCard label="تحتاج زيارة ميدانية" value={String(storeState.data.pendingReadiness)} tone="warning" />
            <KpiCard label="اكتملت جاهزيتها" value={String(storeState.data.readinessComplete)} tone="success" />
          </View>
        </Card>
      )}
    </ScrollScreen>
  );
}

type KpiCardProps = {
  readonly label: string;
  readonly value: string;
  readonly tone: "success" | "warning" | "danger" | "info";
};

function KpiCard({ label, value, tone }: KpiCardProps) {
  return (
    <View style={styles.kpiCard}>
      <Text role="caption" tone="muted">{label}</Text>
      <Badge label={value} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  periodRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  periodChips: { flexDirection: "row-reverse", gap: spacing[2] },
  sectionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  kpiGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[3], padding: spacing[3] },
  kpiCard: { alignItems: "center", gap: spacing[1], minWidth: 80 },
  statusRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  emptyNote: { padding: spacing[3] },
  deliveryRates: { flexDirection: "row-reverse", justifyContent: "space-around", paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
  categoryTitle: { paddingHorizontal: spacing[3], paddingTop: spacing[2] },
});
