"use client";

import { useMemo } from "react";
import { Box, spacing } from "@bthwani/ui-kit";
import { WebControlPanelKpiStrip, WebCompactSurfaceHeader } from "@bthwani/ui-kit/web";
import { CpMutedInline, CpRetryButton, CpStatePanel } from "@bthwani/control-panel/components";
import { OverviewPageFrame } from "@bthwani/control-panel/shell";
import { useOperatorAnalyticsDashboardController, buildPlatformKpisViewModel } from "../../shared/analytics";
import { usePartnerAdminController } from "../../shared/partner";
import { DispatchTrackingAlertsPanel } from "./DispatchTrackingAlertsPanel";
// surfaceInfoCard is a shared, token-driven layout primitive (CSS custom
// properties, no hardcoded colors) reused across dozens of control-panel
// screens; there is no Cp* list-item equivalent yet, so it is kept here.
import styles from "../shared/control-panel-surface.module.css";

type KpiTone = "success" | "warning" | "danger" | "neutral";

function toneForOpenCount(count: number): KpiTone {
  return count > 0 ? "warning" : "success";
}

export function DshOperationalDashboardScreen() {
  const { platformState, reload } = useOperatorAnalyticsDashboardController("authenticated", "today");
  const partnerAdmin = usePartnerAdminController("authenticated");

  const pendingPartnerCount = useMemo(() => {
    if (partnerAdmin.listState.kind !== "success") return null;
    return partnerAdmin.listState.partners.filter((p) => p.activationStatus === "submitted").length;
  }, [partnerAdmin.listState]);

  if (platformState.kind === "loading" || platformState.kind === "idle") {
    return <CpStatePanel role="status" title="جارٍ تحميل مؤشرات المنصة…" />;
  }

  if (platformState.kind === "error") {
    return (
      <CpStatePanel role="alert" title="تعذر تحميل مؤشرات المنصة" description={platformState.message}>
        <CpRetryButton onClick={() => void reload()}>إعادة المحاولة</CpRetryButton>
      </CpStatePanel>
    );
  }

  const kpis = platformState.kpis;
  const vm = buildPlatformKpisViewModel(kpis);

  return (
    <OverviewPageFrame
      header={
        <WebCompactSurfaceHeader
          title="نظرة عامة تشغيلية"
          description={`آخر تحديث: ${new Date(kpis.generatedAt).toLocaleString("ar-SA")} — الفترة: اليوم`}
        />
      }
    >
      <Box style={styles_content}>
        <WebControlPanelKpiStrip
          items={[
            { id: "orders", label: "إجمالي الطلبات", value: String(kpis.totalOrders), tone: "success" },
            { id: "delivered", label: "معدل التسليم", value: vm.fulfillmentRate, tone: vm.healthTone },
            { id: "active-stores", label: "متاجر نشطة", value: String(kpis.activeStores), tone: "success" },
            {
              id: "open-tickets",
              label: "تذاكر دعم مفتوحة",
              value: String(kpis.openTickets),
              tone: toneForOpenCount(kpis.openTickets),
            },
            {
              id: "open-escalations",
              label: "تصعيدات ميدانية مفتوحة",
              value: String(kpis.openEscalations),
              tone: toneForOpenCount(kpis.openEscalations),
            },
            {
              id: "open-incidents",
              label: "حوادث مفتوحة",
              value: String(kpis.openIncidents),
              tone: toneForOpenCount(kpis.openIncidents),
            },
            {
              id: "pending-partners",
              label: "طلبات شراكة معلقة",
              value: pendingPartnerCount === null ? "…" : String(pendingPartnerCount),
              tone: pendingPartnerCount ? toneForOpenCount(pendingPartnerCount) : "neutral",
            },
          ]}
        />

        <div className={styles.surfaceInfoCard}>
          <div style={styles_infoCardText}>
            <span className={styles.surfaceInfoCardTitle}>حالة الصحة العامة</span>
            <span className={styles.surfaceInfoCardDescription}>
              نسبة الإلغاء: {vm.cancellationRate} · {vm.platformLabel}
            </span>
          </div>
        </div>

        <DispatchTrackingAlertsPanel />

        {kpis.totalOrders === 0 ? <CpMutedInline>لا توجد طلبات مسجلة اليوم بعد.</CpMutedInline> : null}
      </Box>
    </OverviewPageFrame>
  );
}

const styles_content = { display: "flex", flexDirection: "column", gap: spacing[3], padding: `0 ${spacing[3]}px ${spacing[3]}px` } as const;
const styles_infoCardText = { display: "flex", flexDirection: "column", gap: spacing[1], minWidth: 0 } as const;

export default DshOperationalDashboardScreen;
