"use client";

import React from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import {
  buildOperationalAnalyticsExportUrl,
  fetchCaptainPerformanceAnalytics,
  fetchFieldPerformanceAnalytics,
  fetchFinancialAnalyticsSnapshot,
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
    setAnalyticsWindow({ from: customFrom, to: customTo });
  }, [customFrom, customTo]);

  const openExport = React.useCallback(() => {
    const url = buildOperationalAnalyticsExportUrl(analyticsWindow);
    if (typeof window !== "undefined") window.location.assign(url);
  }, [analyticsWindow]);

  const activeWindowLabel = analyticsWindow.period
    ? periodLabels[analyticsWindow.period]
    : `${analyticsWindow.from} — ${analyticsWindow.to}`;

  return (
    <ScrollScreen>
      <Header
        title="تحليلات التشغيل وSLA"
        subtitle="مؤشرات التحضير والكباتن والميدانيين والسجلات المصدر ولقطة WLT للقراءة فقط"
      />
      <Card>
        <Box style={styles.toolbar}>
          <Box style={styles.periods}>
            {(["today", "week", "month"] as DshAnalyticsPeriod[]).map((item) => (
              <Button
                key={item}
                label={periodLabels[item]}
                tone={analyticsWindow.period === item ? "primary" : "ghost"}
                onPress={() => applyNamedPeriod(item)}
              />
            ))}
          </Box>
          <Button label="تصدير CSV" tone="secondary" onPress={openExport} />
        </Box>
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
          <Button label="تطبيق النطاق" tone="secondary" onPress={applyCustomRange} />
          <Badge label={`الفترة النشطة: ${activeWindowLabel}`} tone="info" />
        </Box>
        {filterError ? <Text role="bodySm" tone="danger">{filterError}</Text> : null}
      </Card>

      {state.kind === "loading" ? <StateView title="جاري احتساب المؤشرات من السجلات التشغيلية…" /> : null}
      {state.kind === "error" ? (
        <StateView
          title="تعذر تحميل التحليلات الممتدة"
          description={state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => setReloadToken((value) => value + 1)}
        />
      ) : null}

      {state.kind === "success" ? (
        <>
          <Card>
            <Box style={styles.sectionHeader}>
              <Text role="titleSm">SLA التحضير</Text>
              <Badge label={`المصدر ${state.preparation.metadata.sourceSystem}`} tone="info" />
            </Box>
            <Box style={styles.grid}>
              <Metric label="طلبات مقاسة" value={state.preparation.totalMeasured} />
              <Metric label="ضمن SLA" value={state.preparation.withinSla} />
              <Metric label="متجاوزة SLA" value={state.preparation.breachedSla} danger={state.preparation.breachedSla > 0} />
              <Metric label="مفتوحة بعد الموعد" value={state.preparation.openPastEstimate} danger={state.preparation.openPastEstimate > 0} />
              <Metric label="متوسط التحضير بالدقائق" value={state.preparation.averagePreparationMinutes.toFixed(1)} />
            </Box>
            <Text role="caption" tone="muted">
              آخر تحديث {new Date(state.preparation.metadata.generatedAt).toLocaleString("ar")} • من {new Date(state.preparation.metadata.windowFrom).toLocaleString("ar")} إلى {new Date(state.preparation.metadata.windowTo).toLocaleString("ar")}
            </Text>
            <Text role="caption" tone="muted">lineage: {state.preparation.metadata.lineage.join("، ")}</Text>
          </Card>

          <Card>
            <Text role="titleSm">أداء الكباتن</Text>
            {state.captains.rows.length === 0 ? (
              <StateView title="لا توجد إسنادات في الفترة" description="لم تُنشأ صفوف أو نسب بديلة." />
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
          </Card>

          <Card>
            <Text role="titleSm">أداء الميدانيين</Text>
            {state.field.rows.length === 0 ? (
              <StateView title="لا توجد زيارات في الفترة" description="تعرض الحالة الفارغة بدل أرقام مصطنعة." />
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
          </Card>

          <Card>
            <Text role="titleSm">النزول إلى السجل التشغيلي</Text>
            {state.drilldown.records.length === 0 ? (
              <StateView title="لا توجد سجلات طلبات في الفترة" />
            ) : (
              <Box style={styles.rows}>
                {state.drilldown.records.map((record) => (
                  <Box key={record.id} style={styles.row}>
                    <Text role="bodyStrong">{record.id}</Text>
                    <Text role="bodySm">{record.status} • المتجر {record.storeId} • {new Date(record.updatedAt).toLocaleString("ar")}</Text>
                    <Button
                      label="فتح السجل"
                      tone="ghost"
                      onPress={() => {
                        if (typeof window !== "undefined") window.location.assign(record.detailUrl);
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Card>

          <Card>
            <Box style={styles.sectionHeader}>
              <Text role="titleSm">اللقطة المالية المرجعية</Text>
              <Badge label="WLT • قراءة فقط" tone="warning" />
            </Box>
            {state.financeUnavailable || !state.finance || state.finance.readState !== "available" ? (
              <StateView
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
              <StateView title="لا توجد قيود مالية" description="أعاد WLT لقطة متاحة بلا عملات أو أرصدة." />
            )}
          </Card>
        </>
      ) : null}
    </ScrollScreen>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }): React.ReactElement {
  return (
    <Box style={styles.metric}>
      <Text role="caption" tone="muted">{label}</Text>
      <Text role="titleMd" {...(danger ? { tone: "danger" as const } : {})}>{String(value)}</Text>
    </Box>
  );
}

const styles = {
  toolbar: { display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing[3] },
  periods: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  customRange: { display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: spacing[3], marginTop: spacing[3] },
  sectionHeader: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  grid: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: spacing[3], marginTop: spacing[3], marginBottom: spacing[3] },
  metric: { minWidth: 150, flex: 1, gap: spacing[1] },
  rows: { gap: spacing[2], marginTop: spacing[3] },
  row: { gap: spacing[1], paddingBottom: spacing[2], borderBottomWidth: 1 },
} as const;
