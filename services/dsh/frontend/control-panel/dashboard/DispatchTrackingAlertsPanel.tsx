"use client";

import { Badge, Button, StateView, Text } from "@bthwani/ui-kit";
import { WebCompactSurfaceHeader } from "@bthwani/ui-kit/web";
import { useOperatorDispatchTrackingAlerts } from "../../shared/dispatch/use-operator-dispatch-tracking-alerts";
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
        <StateView title="جارٍ تحميل تنبيهات التتبع…" />
      ) : state.kind === "error" ? (
        <StateView
          title="تعذر تحميل تنبيهات التتبع"
          description={state.message}
          tone="danger"
          actionLabel="إعادة المحاولة"
          onActionPress={() => void reload()}
        />
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
              <Badge
                label={alert.severity === "critical" ? "حرج" : "تحذير"}
                tone={alert.severity === "critical" ? "danger" : "warning"}
              />
            </div>
          ))}
          <Button label="تحديث التنبيهات" tone="secondary" onPress={() => void reload()} />
          <Text role="caption" tone="muted">
            تظهر الإحداثيات الكاملة في الباك إند المصرح فقط؛ هذه القائمة تعرض حالة الاتصال والمرجع التشغيلي.
          </Text>
        </div>
      )}
    </section>
  );
}
