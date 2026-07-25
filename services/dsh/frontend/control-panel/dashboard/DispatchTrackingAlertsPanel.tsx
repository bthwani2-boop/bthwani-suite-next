"use client";

import { CpBadge, CpButton, CpMutedInline, CpRetryButton, CpStatePanel } from "@bthwani/control-panel/components";
import { WebCompactSurfaceHeader } from "@bthwani/ui-kit/web";
import { useOperatorDispatchTrackingAlerts } from "../../shared/dispatch/use-operator-dispatch-tracking-alerts";
// surfaceInfoCard is a shared, token-driven layout primitive (CSS custom
// properties, no hardcoded colors) reused across dozens of control-panel
// screens; there is no Cp* list-item equivalent yet, so it is kept here.
import styles from "../shared/control-panel-surface.module.css";

function alertLabel(code: string): string {
  if (code === "LOCATION_NOT_RECEIVED") return "لم يصل موقع مصدق";
  if (code === "LOCATION_stale") return "تحديث الموقع متأخر";
  if (code === "LOCATION_lost") return "فُقد تحديث الموقع";
  return code;
}

export function DispatchTrackingAlertsPanel() {
  const { state, reload } = useOperatorDispatchTrackingAlerts();

  return (
    <section aria-label="تنبيهات تتبع الكابتن">
      <WebCompactSurfaceHeader
        title="تنبيهات التتبع الحي"
        description="مهام مقبولة لم يصل موقعها أو تأخر أو انقطع تحديثه. لا ينشئ هذا العرض حقيقة تشغيلية بديلة."
      />

      {state.kind === "loading" ? (
        <CpStatePanel role="status" title="جارٍ تحميل تنبيهات التتبع…" />
      ) : state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل تنبيهات التتبع" description={state.message}>
          <CpRetryButton onClick={() => void reload()}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : state.alerts.length === 0 ? (
        <div className={styles.surfaceInfoCard}>
          <div>
            <span className={styles.surfaceInfoCardTitle}>لا توجد تنبيهات موقع نشطة</span>
            <span className={styles.surfaceInfoCardDescription}>
              جميع المهام النشطة الملتقطة ضمن نافذة الموقع المصدق الحالية.
            </span>
          </div>
        </div>
      ) : (
        <div aria-live="polite">
          {state.alerts.map((alert) => (
            <div key={`${alert.assignmentId}-${alert.code}`} className={styles.surfaceInfoCard}>
              <div>
                <span className={styles.surfaceInfoCardTitle}>
                  {`${alertLabel(alert.code)} · الطلب ${alert.orderId}`}
                </span>
                <span className={styles.surfaceInfoCardDescription}>
                  {`الإسناد ${alert.assignmentId} · الكابتن ${alert.captainId}${alert.ageSeconds == null ? "" : ` · منذ ${alert.ageSeconds} ثانية`}`}
                </span>
              </div>
              <CpBadge tone={alert.severity === "critical" ? "danger" : "warning"}>
                {alert.severity === "critical" ? "حرج" : "تحذير"}
              </CpBadge>
            </div>
          ))}
          <CpButton variant="secondary" onClick={() => void reload()}>تحديث التنبيهات</CpButton>
          <CpMutedInline>
            تظهر الإحداثيات الكاملة في الباك إند المصرح فقط؛ هذه القائمة تعرض حالة الاتصال والمرجع التشغيلي.
          </CpMutedInline>
        </div>
      )}
    </section>
  );
}
