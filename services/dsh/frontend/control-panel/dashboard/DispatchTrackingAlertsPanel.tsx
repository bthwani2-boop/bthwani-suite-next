"use client";

import { CpBadge, CpButton, CpMutedInline, CpRetryButton, CpStatePanel, CpStateView } from "@bthwani/control-panel/components";
import { WebCompactSurfaceHeader } from "@bthwani/ui-kit/web";
import { useOperatorDispatchTrackingAlerts } from "../../shared/dispatch/use-operator-dispatch-tracking-alerts";
import { GoogleMapsWebCanvas } from "../maps/GoogleMapsWebCanvas";
import styles from "../shared/control-panel-surface.module.css";

function alertLabel(code: string): string {
  if (code === "LOCATION_NOT_RECEIVED") return "لم يصل موقع مصدق";
  if (code === "LOCATION_stale") return "تحديث الموقع متأخر";
  if (code === "LOCATION_lost") return "فُقد تحديث الموقع";
  return code;
}

function freshnessLabel(value: string): string {
  if (value === "fresh") return "حديث";
  if (value === "stale") return "متأخر";
  if (value === "lost") return "مفقود";
  return value;
}

export function DispatchTrackingAlertsPanel() {
  const { state, reload } = useOperatorDispatchTrackingAlerts();

  return (
    <section aria-label="تنبيهات وتتبع الكابتن الحي">
      <WebCompactSurfaceHeader
        title="خريطة العمليات والتتبع الحي"
        description="تعرض مواقع المهام النشطة المصرح بها وحالة حداثة كل عينة GPS، مع تنبيهات الانقطاع والتأخر."
      />

      {state.kind === "loading" ? (
        <CpStateView kind="loading" title="جارٍ تحميل خريطة التتبع…" />
      ) : state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل التتبع" description={state.message}>
          <CpRetryButton onClick={() => void reload()}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : (
        <>
          <GoogleMapsWebCanvas
            points={state.locations.map((location) => ({
              id: location.assignmentId,
              latitude: location.latitude,
              longitude: location.longitude,
              title: `الكابتن ${location.captainId}`,
              description: `الطلب ${location.orderId} · ${freshnessLabel(location.freshnessState)} · منذ ${location.ageSeconds} ثانية`,
            }))}
            height={480}
            ariaLabel="خريطة مواقع الكباتن والمهام النشطة"
          />

          <div className={styles.surfaceInfoCard}>
            <div>
              <span className={styles.surfaceInfoCardTitle}>حالة الخريطة التشغيلية</span>
              <span className={styles.surfaceInfoCardDescription}>
                {state.locations.length === 0
                  ? "لم تصل مواقع مصدقة لمهام نشطة حتى الآن."
                  : `تُعرض ${state.locations.length} مهمة ذات موقع مصدق.`}
              </span>
            </div>
            <CpBadge tone={state.locations.length > 0 ? "success" : "neutral"}>
              {`${state.locations.length} موقع`}
            </CpBadge>
          </div>

          {state.alerts.length === 0 ? (
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
            </div>
          )}

          <CpButton variant="secondary" onClick={() => void reload()}>تحديث الخريطة والتنبيهات</CpButton>
          <CpMutedInline>
            مواقع العمليات لا تُنشئ حقيقة بديلة؛ المصدر هو آخر عينة GPS قبلها DSH من المهمة النشطة.
          </CpMutedInline>
        </>
      )}
    </section>
  );
}
