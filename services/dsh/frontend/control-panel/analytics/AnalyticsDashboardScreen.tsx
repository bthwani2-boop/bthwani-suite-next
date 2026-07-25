"use client";

import React from "react";
import { useControlPanelSession } from "../../shared/session/control-panel-session";
import { Box, Card, Text, spacing } from "@bthwani/ui-kit";
import {
  CpBadge,
  CpKpiCard,
  CpKpiStrip,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpTabs,
} from "@bthwani/control-panel/components";
import { MetricsPageFrame } from "@bthwani/control-panel/shell";
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

const PERIOD_TABS = (["today", "week", "month"] as DshAnalyticsPeriod[]).map((value) => ({
  value,
  label: PERIOD_LABELS[value],
}));

export function AnalyticsDashboardScreen() {
  const { state } = useControlPanelSession();
  const [period, setPeriod] = React.useState<DshAnalyticsPeriod>("today");

  const { platformState, orderState, deliveryState, supportState, storeState, reload } =
    useOperatorAnalyticsDashboardController(state.kind, period);

  const isLoading =
    platformState.kind === "loading" ||
    orderState.kind === "loading" ||
    deliveryState.kind === "loading" ||
    supportState.kind === "loading" ||
    storeState.kind === "loading";

  const platformVm = platformState.kind === "success" ? buildPlatformKpisViewModel(platformState.kpis) : null;
  const orderVm = orderState.kind === "success" ? buildOrderAnalyticsViewModel(orderState.data) : null;
  const deliveryVm = deliveryState.kind === "success" ? buildDeliveryAnalyticsViewModel(deliveryState.data) : null;
  const storeVm = storeState.kind === "success" ? buildStoreAnalyticsViewModel(storeState.data) : null;

  return (
    <MetricsPageFrame
      header={<CpPageHeader title="التحليلات التشغيلية">
        <CpMutedInline tight>لوحة مؤشرات الأداء الرئيسية لمنصة DSH</CpMutedInline>
      </CpPageHeader>}
      toolbar={<CpTabs items={PERIOD_TABS} value={period} onChange={(value) => setPeriod(value as DshAnalyticsPeriod)} aria-label="الفترة الزمنية" />}
    >
      {isLoading ? <CpStatePanel role="status" title="جاري تحميل البيانات من DSH…" /> : null}

      {platformState.kind === "error" ? (
        <AnalyticsError title="تعذّر تحميل مؤشرات المنصة" message={platformState.message} reload={reload} />
      ) : null}
      {platformState.kind === "success" && platformVm ? (
        <Card>
          <Box style={styles.sectionHeader}>
            <Text role="titleSm">مؤشرات المنصة</Text>
            <CpBadge tone={platformVm.healthTone}>{`معدل التنفيذ: ${platformVm.fulfillmentRate}`}</CpBadge>
          </Box>
          <CpKpiStrip>
            <CpKpiCard label="إجمالي الطلبات" value={platformState.kpis.totalOrders} />
            <CpKpiCard label="طلبات مكتملة" value={platformState.kpis.deliveredOrders} />
            <CpKpiCard label="طلبات ملغاة" value={platformState.kpis.cancelledOrders} />
            <CpKpiCard label="متاجر نشطة" value={platformState.kpis.activeStores} />
            <CpKpiCard label="تذاكر مفتوحة" value={platformState.kpis.openTickets} />
            <CpKpiCard label="زيارات ميدانية مكتملة" value={platformState.kpis.fieldVisitsCompleted} />
            <CpKpiCard label="تصعيدات مفتوحة" value={platformState.kpis.openEscalations} />
            <CpKpiCard label="حوادث مفتوحة" value={platformState.kpis.openIncidents} />
          </CpKpiStrip>
          <Freshness generatedAt={platformState.kpis.generatedAt} />
        </Card>
      ) : null}

      {orderState.kind === "error" ? (
        <AnalyticsError title="تعذّر تحميل تحليلات الطلبات" message={orderState.message} reload={reload} />
      ) : null}
      {orderState.kind === "success" && orderVm ? (
        <Card>
          <Box style={styles.sectionHeader}>
            <Text role="titleSm">تحليلات الطلبات</Text>
            <CpBadge tone="info">{`معدل الإتمام: ${orderVm.fulfillmentRate}`}</CpBadge>
          </Box>
          {orderVm.statusRows.map((row) => (
            <Box key={row.label} style={styles.statusRow}>
              <Text role="body">{row.label}</Text>
              <CpBadge tone={row.tone}>{String(row.count)}</CpBadge>
            </Box>
          ))}
          {orderVm.statusRows.length === 0 ? (
            <CpMutedInline>لا توجد طلبات في هذه الفترة، ولم تُنشأ أرقام بديلة.</CpMutedInline>
          ) : null}
          <Freshness generatedAt={orderState.data.generatedAt} />
        </Card>
      ) : null}

      {deliveryState.kind === "error" ? (
        <AnalyticsError title="تعذّر تحميل تحليلات التوصيل" message={deliveryState.message} reload={reload} />
      ) : null}
      {deliveryState.kind === "success" && deliveryVm ? (
        <Card>
          <Box style={styles.sectionHeader}>
            <Text role="titleSm">تحليلات التوصيل</Text>
            <CpBadge tone={deliveryVm.healthTone}>{`إتمام: ${deliveryVm.completionRate}`}</CpBadge>
          </Box>
          <CpKpiStrip>
            <CpKpiCard label="إجمالي الإسنادات" value={deliveryState.data.totalAssignments} />
            <CpKpiCard label="مقبولة" value={deliveryState.data.acceptedAssignments} />
            <CpKpiCard label="مكتملة" value={deliveryState.data.completedAssignments} />
            <CpKpiCard label="مرفوضة" value={deliveryState.data.declinedAssignments} />
          </CpKpiStrip>
          <Box style={styles.deliveryRates}>
            <CpMutedInline tight>معدل القبول: {deliveryVm.acceptanceRate}</CpMutedInline>
            <CpMutedInline tight>معدل الإتمام: {deliveryVm.completionRate}</CpMutedInline>
          </Box>
          <Freshness generatedAt={deliveryState.data.generatedAt} />
        </Card>
      ) : null}

      {supportState.kind === "error" ? (
        <AnalyticsError title="تعذّر تحميل تحليلات الدعم" message={supportState.message} reload={reload} />
      ) : null}
      {supportState.kind === "success" ? (
        <Card>
          <Box style={styles.sectionHeader}>
            <Text role="titleSm">تحليلات الدعم</Text>
            <CpBadge tone={supportState.data.openTickets > 5 ? "warning" : "success"}>{`${supportState.data.openTickets} مفتوحة`}</CpBadge>
          </Box>
          <CpKpiStrip>
            <CpKpiCard label="إجمالي التذاكر" value={supportState.data.totalTickets} />
            <CpKpiCard label="مفتوحة" value={supportState.data.openTickets} />
            <CpKpiCard label="محلولة" value={supportState.data.resolvedTickets} />
          </CpKpiStrip>
          {supportState.data.byCategory.length > 0 ? (
            <>
              <CpMutedInline tight>التوزيع حسب الفئة</CpMutedInline>
              {supportState.data.byCategory.map((category) => (
                <Box key={category.category} style={styles.statusRow}>
                  <Text role="body">{category.category}</Text>
                  <CpBadge tone="info">{String(category.count)}</CpBadge>
                </Box>
              ))}
            </>
          ) : (
            <CpMutedInline>لا توجد تذاكر في هذه الفترة.</CpMutedInline>
          )}
          <Freshness generatedAt={supportState.data.generatedAt} />
        </Card>
      ) : null}

      {storeState.kind === "error" ? (
        <AnalyticsError title="تعذّر تحميل تحليلات المتاجر" message={storeState.message} reload={reload} />
      ) : null}
      {storeState.kind === "success" && storeVm ? (
        <Card>
          <Box style={styles.sectionHeader}>
            <Text role="titleSm">تحليلات المتاجر</Text>
            <CpBadge tone={storeVm.healthTone}>{`جاهزية: ${storeVm.readinessRate}`}</CpBadge>
          </Box>
          <CpKpiStrip>
            <CpKpiCard label="إجمالي المتاجر" value={storeState.data.totalStores} />
            <CpKpiCard label="نشطة ومرئية" value={storeState.data.activeStores} />
            <CpKpiCard label="غير متاحة أو مخفية" value={storeState.data.suspendedStores} />
            <CpKpiCard label="تحتاج زيارة ميدانية" value={storeState.data.pendingReadiness} />
            <CpKpiCard label="اكتملت جاهزيتها" value={storeState.data.readinessComplete} />
          </CpKpiStrip>
          <Freshness generatedAt={storeState.data.generatedAt} />
        </Card>
      ) : null}
    </MetricsPageFrame>
  );
}

function AnalyticsError({ title, message, reload }: { title: string; message: string; reload: () => void }) {
  return (
    <CpStatePanel role="alert" title={title} description={message}>
      <CpRetryButton onClick={reload}>إعادة المحاولة</CpRetryButton>
    </CpStatePanel>
  );
}

function Freshness({ generatedAt }: { generatedAt: string }) {
  return (
    <CpMutedInline tight>
      المصدر DSH • آخر تحديث {new Date(generatedAt).toLocaleString("ar")}
    </CpMutedInline>
  );
}

const styles = {
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  deliveryRates: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
} as const;
