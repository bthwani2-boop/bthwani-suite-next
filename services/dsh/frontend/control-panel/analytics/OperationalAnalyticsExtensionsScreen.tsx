"use client";

import React from "react";
import { Box, Text, spacing } from "@bthwani/ui-kit";
import {
  CpBadge,
  CpButton,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpStateView,
  CpTabs,
} from "@bthwani/control-panel/components";
import { MetricsPageFrame } from "@bthwani/control-panel/shell";
import {
  fetchCaptainPerformanceAnalytics,
  fetchFieldPerformanceAnalytics,
  fetchFinancialAnalyticsSnapshot,
  fetchOperationalAnalyticsExport,
  fetchOrderAnalyticsDrilldown,
  fetchPreparationSlaAnalytics,
  type DshAnalyticsPeriod,
  type DshAnalyticsWindowInput,
  type DshCaptainPerformanceAnalytics,
  type DshFieldPerformanceAnalytics,
  type DshOperationalAnalyticsDrilldown,
  type DshPreparationSlaAnalytics,
  type WltAnalyticsFinancialSnapshot,
} from "../../shared/analytics";

const periodLabels: Record<DshAnalyticsPeriod, string> = {
  today: "اليوم",
  week: "7 أيام",
  month: "شهر",
};

const PERIOD_TABS = (["today", "week", "month"] as DshAnalyticsPeriod[]).map((value) => ({
  value,
  label: periodLabels[value],
}));

// CpTextInput has no date-picker mode; a native <input type="date"> is kept here
// (structural styling only, no hardcoded color) since a Cp* replacement would
// drop the browser's native date picker.
const dateInputStyle: React.CSSProperties = {
  minHeight: 42,
  minWidth: 170,
  padding: "0.5rem 0.75rem",
  border: "1px solid currentColor",
  borderRadius: 8,
  background: "transparent",
};

type State =
  | { kind: "loading" }
  | {
      kind: "success";
      preparation: DshPreparationSlaAnalytics;
      captains: DshCaptainPerformanceAnalytics;
      field: DshFieldPerformanceAnalytics;
      drilldown: DshOperationalAnalyticsDrilldown;
      finance: WltAnalyticsFinancialSnapshot | null;
      financeUnavailable: boolean;
    }
  | { kind: "error"; message: string };

export function OperationalAnalyticsExtensionsScreen(): React.ReactElement {
  const [analyticsWindow, setAnalyticsWindow] = React.useState<DshAnalyticsWindowInput>({ period: "today" });
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [filterError, setFilterError] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [state, setState] = React.useState<State>({ kind: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    void Promise.all([
      fetchPreparationSlaAnalytics(analyticsWindow),
      fetchCaptainPerformanceAnalytics(analyticsWindow),
      fetchFieldPerformanceAnalytics(analyticsWindow),
      fetchOrderAnalyticsDrilldown(analyticsWindow, { limit: 20 }),
      fetchFinancialAnalyticsSnapshot().then(
        (value) => ({ value, unavailable: false }),
        () => ({ value: null, unavailable: true }),
      ),
    ])
      .then(([preparation, captains, field, drilldown, finance]) => {
        if (!cancelled) {
          setState({
            kind: "success",
            preparation,
            captains,
            field,
            drilldown,
            finance: finance.value,
            financeUnavailable: finance.unavailable,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "تعذر تحميل التحليلات التشغيلية الممتدة.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [analyticsWindow, reloadToken]);

  const applyNamedPeriod = React.useCallback((period: DshAnalyticsPeriod) => {
    setFilterError(null);
    setExportError(null);
    setAnalyticsWindow({ period });
  }, []);

  const applyCustomRange = React.useCallback(() => {
    if (!customFrom || !customTo) {
      setFilterError("حدد تاريخ البداية والنهاية معًا.");
      return;
    }
    const from = new Date(`${customFrom}T00:00:00Z`);
    const to = new Date(`${customTo}T00:00:00Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      setFilterError("نطاق التاريخ غير صالح أو معكوس.");
      return;
    }
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    if (customTo > todayKey) {
      setFilterError("لا يمكن أن تنتهي التحليلات في تاريخ مستقبلي.");
      return;
    }
    const inclusiveDays = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
    if (inclusiveDays > 366) {
      setFilterError("الحد الأقصى للنطاق المخصص هو 366 يومًا.");
      return;
    }
    setFilterError(null);
    setExportError(null);
    setAnalyticsWindow({ from: customFrom, to: customTo });
  }, [customFrom, customTo]);

  const openExport = React.useCallback(async () => {
    if (exporting || typeof document === "undefined") return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await fetchOperationalAnalyticsExport(analyticsWindow);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "jrn-032-operational-analytics.csv";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "تعذر تصدير ملف CSV بالمصادقة الحالية.");
    } finally {
      setExporting(false);
    }
  }, [analyticsWindow, exporting]);

  const activeWindowLabel = analyticsWindow.period
    ? periodLabels[analyticsWindow.period]
    : `${analyticsWindow.from} — ${analyticsWindow.to}`;

  const activePeriodValue = analyticsWindow.period ?? "";

  return (
    <MetricsPageFrame
      header={
        <CpPageHeader title="تحليلات التشغيل وSLA">
          <CpMutedInline tight>مؤشرات التحضير والكباتن والميدانيين والسجلات المصدر ولقطة WLT للقراءة فقط</CpMutedInline>
        </CpPageHeader>
      }
      toolbar={
        <Box style={styles.toolbar}>
          <CpTabs items={PERIOD_TABS} value={activePeriodValue} onChange={(value) => applyNamedPeriod(value as DshAnalyticsPeriod)} aria-label="الفترة الزمنية" />
          <CpButton variant="secondary" onClick={() => void openExport()} disabled={exporting}>
            {exporting ? "جاري التصدير…" : "تصدير CSV"}
          </CpButton>
        </Box>
      }
      summary={
        <Box style={styles.summary}>
          <Box style={styles.customRange}>
            <label>
              <Text role="caption">من</Text>
              <input
                aria-label="بداية نطاق التحليلات"
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                style={dateInputStyle}
              />
            </label>
            <label>
              <Text role="caption">إلى</Text>
              <input
                aria-label="نهاية نطاق التحليلات"
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                style={dateInputStyle}
              />
            </label>
            <CpButton variant="secondary" onClick={applyCustomRange}>تطبيق النطاق</CpButton>
            <CpBadge tone="info">{`الفترة النشطة: ${activeWindowLabel}`}</CpBadge>
          </Box>
          {filterError ? <CpMutedInline>{filterError}</CpMutedInline> : null}
          {exportError ? <CpMutedInline>{exportError}</CpMutedInline> : null}
        </Box>
      }
    >
      {state.kind === "loading" ? <CpStateView kind="loading" title="جاري احتساب المؤشرات من السجلات التشغيلية…" /> : null}
      {state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل التحليلات الممتدة" description={state.message}>
          <CpRetryButton onClick={() => setReloadToken((value) => value + 1)}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : null}

      {state.kind === "success" ? (
        <>
          <Box style={styles.card}>
            <Box style={styles.sectionHeader}>
              <Text role="titleSm">SLA التحضير</Text>
              <CpBadge tone="info">{`المصدر ${state.preparation.metadata.sourceSystem}`}</CpBadge>
            </Box>
            <Box style={styles.grid}>
              <Metric label="طلبات مقاسة" value={state.preparation.totalMeasured} />
              <Metric label="ضمن SLA" value={state.preparation.withinSla} />
              <Metric label="متجاوزة SLA" value={state.preparation.breachedSla} danger={state.preparation.breachedSla > 0} />
              <Metric label="مفتوحة بعد الموعد" value={state.preparation.openPastEstimate} danger={state.preparation.openPastEstimate > 0} />
              <Metric label="متوسط التحضير بالدقائق" value={state.preparation.averagePreparationMinutes.toFixed(1)} />
            </Box>
            <CpMutedInline tight>
              آخر تحديث {new Date(state.preparation.metadata.generatedAt).toLocaleString("ar")} • من {new Date(state.preparation.metadata.windowFrom).toLocaleString("ar")} إلى {new Date(state.preparation.metadata.windowTo).toLocaleString("ar")}
            </CpMutedInline>
            <CpMutedInline tight>lineage: {state.preparation.metadata.lineage.join("، ")}</CpMutedInline>
          </Box>

          <Box style={styles.card}>
            <Text role="titleSm">أداء الكباتن</Text>
            {state.captains.rows.length === 0 ? (
              <CpStatePanel role="status" title="لا توجد إسنادات في الفترة" description="لم تُنشأ صفوف أو نسب بديلة." />
            ) : (
              <Box style={styles.rows}>
                {state.captains.rows.map((row) => (
                  <Box key={row.captainId} style={styles.row}>
                    <Text role="bodyStrong">{row.captainId}</Text>
                    <Text role="bodySm">الإسنادات {row.assignments} • المكتملة {row.completed} • القبول {row.acceptanceRate.toFixed(1)}%</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Box style={styles.card}>
            <Text role="titleSm">أداء الميدانيين</Text>
            {state.field.rows.length === 0 ? (
              <CpStatePanel role="status" title="لا توجد زيارات في الفترة" description="تعرض الحالة الفارغة بدل أرقام مصطنعة." />
            ) : (
              <Box style={styles.rows}>
                {state.field.rows.map((row) => (
                  <Box key={row.fieldAgentId} style={styles.row}>
                    <Text role="bodyStrong">{row.fieldAgentId}</Text>
                    <Text role="bodySm">الزيارات {row.visits} • المكتملة {row.completed} • التصعيدات {row.escalated} • الإنجاز {row.completionRate.toFixed(1)}%</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Box style={styles.card}>
            <Text role="titleSm">النزول إلى السجل التشغيلي</Text>
            {state.drilldown.records.length === 0 ? (
              <CpStatePanel role="status" title="لا توجد سجلات طلبات في الفترة" />
            ) : (
              <Box style={styles.rows}>
                {state.drilldown.records.map((record) => (
                  <Box key={record.id} style={styles.row}>
                    <Text role="bodyStrong">{record.id}</Text>
                    <Text role="bodySm">{record.status} • المتجر {record.storeId} • {new Date(record.updatedAt).toLocaleString("ar")}</Text>
                    <CpButton
                      variant="ghost"
                      onClick={() => {
                        if (typeof window !== "undefined") window.location.assign(record.detailUrl);
                      }}
                    >
                      فتح السجل
                    </CpButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Box style={styles.card}>
            <Box style={styles.sectionHeader}>
              <Text role="titleSm">اللقطة المالية المرجعية</Text>
              <CpBadge tone="warning">WLT • قراءة فقط</CpBadge>
            </Box>
            {state.financeUnavailable || !state.finance || state.finance.readState !== "available" ? (
              <CpStatePanel
                role="status"
                title="WLT غير متاح"
                description="لم تُحوّل الحالة إلى أصفار مالية؛ تبقى الحقيقة المالية غير متاحة صراحة."
              />
            ) : state.finance.summary?.currencies.length ? (
              <Box style={styles.rows}>
                {state.finance.summary.currencies.map((currency) => (
                  <Box key={currency.currency} style={styles.row}>
                    <Text role="bodyStrong">{currency.currency}</Text>
                    <Text role="bodySm">الأصول {currency.assetsMinorUnits} • الالتزامات {currency.liabilitiesMinorUnits} • صافي المركز {currency.netPositionMinorUnits}</Text>
                  </Box>
                ))}
              </Box>
            ) : (
              <CpStatePanel role="status" title="لا توجد قيود مالية" description="أعاد WLT لقطة متاحة بلا عملات أو أرصدة." />
            )}
          </Box>
        </>
      ) : null}
    </MetricsPageFrame>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }): React.ReactElement {
  return (
    <Box style={styles.metric}>
      <CpMutedInline tight>{label}</CpMutedInline>
      <Text role="titleMd" {...(danger ? { tone: "danger" as const } : {})}>{String(value)}</Text>
    </Box>
  );
}

const styles = {
  toolbar: { display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: spacing[3] },
  summary: { display: "flex", flexDirection: "column", gap: spacing[2] },
  customRange: { display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: spacing[3] },
  sectionHeader: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  card: { display: "flex", flexDirection: "column", gap: spacing[2], padding: spacing[3] },
  grid: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: spacing[3], marginTop: spacing[3], marginBottom: spacing[3] },
  metric: { minWidth: 150, flex: 1, gap: spacing[1] },
  rows: { gap: spacing[2], marginTop: spacing[3] },
  row: { gap: spacing[1], paddingBottom: spacing[2], borderBottomWidth: 1 },
} as const;
