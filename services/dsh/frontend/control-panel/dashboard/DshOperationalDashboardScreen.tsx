"use client";

import { useMemo } from "react";
import { Box, Text, StateView, colorRoles } from "@bthwani/ui-kit";
import { WebControlPanelKpiStrip, WebCompactSurfaceHeader } from "@bthwani/ui-kit/web";
import { useOperatorAnalyticsDashboardController, buildPlatformKpisViewModel } from "../../shared/analytics";
import { usePartnerAdminController } from "../../shared/partner";
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
    return <StateView title="جارٍ تحميل مؤشرات المنصة…" />;
  }

  if (platformState.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل مؤشرات المنصة"
        description={platformState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void reload()}
      />
    );
  }

  const kpis = platformState.kpis;
  const vm = buildPlatformKpisViewModel(kpis);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <WebCompactSurfaceHeader
        title="نظرة عامة تشغيلية"
        description={`آخر تحديث: ${new Date(kpis.generatedAt).toLocaleString("ar-SA")} — الفترة: اليوم`}
      />

      <div style={{ padding: "0 14px" }}>
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
      </div>

      <div style={{ padding: "0 14px 8px" }}>
        <div className={styles.surfaceInfoCard}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
            <span className={styles.surfaceInfoCardTitle}>حالة الصحة العامة</span>
            <span className={styles.surfaceInfoCardDescription}>
              نسبة الإلغاء: {vm.cancellationRate} · {vm.platformLabel}
            </span>
          </div>
        </div>
      </div>

      {kpis.totalOrders === 0 && (
        <Box style={{ padding: "0 14px" }}>
          <Text role="body" tone="muted" style={{ color: colorRoles.textMuted }}>
            لا توجد طلبات مسجلة اليوم بعد.
          </Text>
        </Box>
      )}
    </div>
  );
}

export default DshOperationalDashboardScreen;
