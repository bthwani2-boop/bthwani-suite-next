"use client";

import { useMemo } from "react";
import { Badge, Card, Text, spacing } from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import {
  CpButton,
  CpKpiCard,
  CpKpiStrip,
  CpStatePanel,
} from "@bthwani/control-panel/components";
import {
  usePlatformChangeWorkflowController,
  type PlatformChangeSet,
} from "../../shared/platform";
import { hasControlPanelPermission } from "../../shared/session/control-panel-permissions";
import { useControlPanelSession } from "../../shared/session/control-panel-session";

type LifecycleStage = {
  readonly status: PlatformChangeSet["status"];
  readonly label: string;
  readonly description: string;
};

const LIFECYCLE: readonly LifecycleStage[] = [
  { status: "draft", label: "مسودة", description: "صياغة التغيير وأثره وخطة التراجع" },
  { status: "validated", label: "متحقق", description: "لقطة شروط مسبقة وحجز للهدف" },
  { status: "submitted", label: "للمراجعة", description: "انتظار قرار مستقل" },
  { status: "approved", label: "معتمد", description: "جاهز للتطبيق الذري" },
  { status: "applied", label: "مطبق", description: "القيمة الفعلية محدثة" },
  { status: "rolled_back", label: "متراجع", description: "استعادة النسخة الآمنة" },
];

function stageTone(
  status: PlatformChangeSet["status"],
): "neutral" | "warning" | "success" | "danger" | "info" {
  if (status === "applied") return "success";
  if (status === "submitted" || status === "approved") return "warning";
  if (status === "validated") return "info";
  return "neutral";
}

function stageCount(
  changeSets: readonly PlatformChangeSet[],
  status: PlatformChangeSet["status"],
): number {
  return changeSets.filter((changeSet) => changeSet.status === status).length;
}

export function PlatformGovernanceVisual() {
  const { state: sessionState } = useControlPanelSession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canRead = hasControlPanelPermission(identity, "platform:read");
  const workflow = usePlatformChangeWorkflowController(canRead);
  const tenantId = identity?.tenantId.trim() ?? "";
  const changeSets = workflow.state.kind === "success" ? workflow.state.changeSets : [];

  const metrics = useMemo(() => {
    const active = changeSets.filter((changeSet) =>
      ["draft", "validated", "submitted", "approved"].includes(changeSet.status),
    ).length;
    const pendingReview = stageCount(changeSets, "submitted");
    const applied = stageCount(changeSets, "applied");
    const stopped = changeSets.filter((changeSet) =>
      ["rejected", "failed", "rolled_back"].includes(changeSet.status),
    ).length;
    return { active, pendingReview, applied, stopped };
  }, [changeSets]);

  return (
    <View style={styles.root} aria-label="المسار التنفيذي لتغييرات المنصة السيادية">
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text role="titleSm">المسار التنفيذي للفول ستاك SaaS</Text>
          <Text role="caption">
            قراءة حية لدورة JRN-040 من الجلسة الموثوقة إلى platform-control ثم PostgreSQL؛ لا توجد قيم تجريبية أو مستأجر محلي مفروض من الواجهة.
          </Text>
        </View>
        <Badge
          label={tenantId ? `المستأجر: ${tenantId}` : "سياق المستأجر غير متاح"}
          tone={tenantId ? "info" : "danger"}
        />
      </View>

      {!canRead ? (
        <CpStatePanel
          role="alert"
          title="صلاحية قراءة المنصة مطلوبة"
          description="لا تُقرأ دورة التغيير ولا أرقامها قبل تحقق platform:read ضمن جلسة المستأجر."
          code="PLATFORM_PERMISSION_REQUIRED"
        />
      ) : workflow.state.kind === "loading" || workflow.state.kind === "idle" ? (
        <CpStatePanel role="status" title="جاري تحميل دورة التغيير الحية…" />
      ) : workflow.state.kind === "error" ? (
        <CpStatePanel
          role="alert"
          title="تعذر تحميل دورة التغيير"
          code={workflow.state.message}
        >
          <CpButton onClick={() => void workflow.reload()}>إعادة المحاولة</CpButton>
        </CpStatePanel>
      ) : (
        <>
          <CpKpiStrip>
            <CpKpiCard label="طلبات نشطة" value={metrics.active} />
            <CpKpiCard label="بانتظار المراجعة" value={metrics.pendingReview} />
            <CpKpiCard label="مطبقة" value={metrics.applied} />
            <CpKpiCard label="موقوفة أو متراجعة" value={metrics.stopped} />
          </CpKpiStrip>

          <View style={styles.lifecycle}>
            {LIFECYCLE.map((stage, index) => (
              <View key={stage.status} style={styles.stageGroup}>
                <Card>
                  <View style={styles.stageCard}>
                    <View style={styles.stageHeader}>
                      <Text role="titleSm">{index + 1}. {stage.label}</Text>
                      <Badge
                        label={String(stageCount(changeSets, stage.status))}
                        tone={stageTone(stage.status)}
                      />
                    </View>
                    <Text role="caption">{stage.description}</Text>
                  </View>
                </Card>
                {index < LIFECYCLE.length - 1 ? (
                  <Text role="caption" aria-hidden="true">←</Text>
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.boundaryGrid}>
            <Card>
              <View style={styles.boundaryCard}>
                <Text role="titleSm">1. هوية المستأجر</Text>
                <Text role="caption">tenantId من ActorIdentity الموثوق</Text>
              </View>
            </Card>
            <Card>
              <View style={styles.boundaryCard}>
                <Text role="titleSm">2. حد الصلاحيات</Text>
                <Text role="caption">صلاحيات منفصلة للاقتراح والاعتماد والتطبيق والتراجع</Text>
              </View>
            </Card>
            <Card>
              <View style={styles.boundaryCard}>
                <Text role="titleSm">3. خدمة السيادة</Text>
                <Text role="caption">platform-control يفرض الانتقالات وmaker-checker</Text>
              </View>
            </Card>
            <Card>
              <View style={styles.boundaryCard}>
                <Text role="titleSm">4. الحقيقة المخزنة</Text>
                <Text role="caption">PostgreSQL مع اللقطات والتدقيق والتطبيق الذري</Text>
              </View>
            </Card>
          </View>

          <View style={styles.footerRow}>
            <Text role="caption">
              المصدر: GET /platform/v1/change-sets عبر جلسة لوحة التحكم وحد SaaS الموثوق.
            </Text>
            <CpButton onClick={() => void workflow.reload()}>تحديث القراءة</CpButton>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    direction: "rtl",
    gap: spacing[4],
    padding: spacing[4],
  },
  headingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
  },
  headingCopy: {
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing[1],
  },
  lifecycle: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing[2],
  },
  stageGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  stageCard: {
    width: 176,
    minHeight: 96,
    justifyContent: "space-between",
    gap: spacing[2],
    padding: spacing[3],
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
  },
  boundaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  boundaryCard: {
    width: 220,
    minHeight: 88,
    gap: spacing[2],
    padding: spacing[3],
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
  },
});
