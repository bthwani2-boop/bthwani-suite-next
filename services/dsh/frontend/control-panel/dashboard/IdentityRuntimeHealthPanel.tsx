"use client";

import { useIdentityRuntimeStatus } from "@bthwani/core-identity";
import {
  CpRetryButton,
  CpStatePanel,
  CpStateView,
} from "@bthwani/control-panel/components";
import styles from "../shared/control-panel-surface.module.css";

function runtimeLabel(status: string): string {
  switch (status) {
    case "HEALTHY":
      return "سليم وجاهز";
    case "DEGRADED":
      return "حي مع تدهور جزئي";
    case "NOT_READY":
      return "غير جاهز للمصادقة والتفعيل";
    default:
      return "حالة غير معروفة";
  }
}

function checkLabel(name: string): string {
  const labels: Record<string, string> = {
    activation_signing_key: "مفتاح التوقيع",
    operator_context: "سياق المشغّل",
    workforce_service_auth: "اعتماد Workforce",
    dsh_service_auth: "اعتماد DSH",
    database: "قاعدة البيانات",
    migrations: "المهاجرات",
    required_relations: "الجداول الحرجة",
    clock: "الساعة",
    dependency_probe: "مهلة فحص الاعتماديات",
  };
  return labels[name] ?? name;
}

export function IdentityRuntimeHealthPanel() {
  const { state, refresh } = useIdentityRuntimeStatus();

  if (state.kind === "checking" && state.previous === undefined) {
    return <CpStateView kind="loading" title="جارٍ فحص جاهزية Identity…" />;
  }

  if (state.kind === "unavailable") {
    return (
      <CpStatePanel
        role="alert"
        title="تعذر قراءة صحة Identity"
        description="لم تُحوّل الحالة إلى سليمة، ولم تُمس الجلسات المحفوظة."
      >
        <CpRetryButton onClick={() => void refresh()}>إعادة الفحص</CpRetryButton>
      </CpStatePanel>
    );
  }

  const value = state.kind === "resolved" ? state.value : state.previous;
  if (value === undefined) return null;
  const checks = value.checks ?? [];

  return (
    <section className={styles.surfaceCompactPanel} aria-labelledby="identity-runtime-health-title">
      <div className={styles.surfaceFocusContextRow}>
        <div>
          <h2 id="identity-runtime-health-title" className={styles.surfacePanelTitle}>
            صحة وجاهزية Identity
          </h2>
          <p className={styles.surfaceSectionSubtitleCompact}>
            {runtimeLabel(value.status)} · آخر فحص: {value.checkedAt
              ? new Date(value.checkedAt).toLocaleString("ar-SA")
              : "غير متاح"}
          </p>
        </div>
        <CpRetryButton onClick={() => void refresh()}>إعادة الفحص</CpRetryButton>
      </div>

      <div className={styles.surfacePremiumKpiGrid}>
        {checks.map((check) => (
          <div
            className={`${styles.surfacePremiumKpiCard} ${
              check.status === "PASS"
                ? styles["surfacePremiumKpiCard--success"]
                : styles["surfacePremiumKpiCard--danger"]
            }`}
            key={check.name}
          >
            <div className={styles.surfacePremiumKpiText}>
              <span className={styles.surfacePremiumKpiLabel}>{checkLabel(check.name)}</span>
              <strong className={styles.surfacePremiumKpiValue}>
                {check.status === "PASS" ? "سليم" : "فشل"}
              </strong>
              <span className={styles.surfaceSectionSubtitleCompact}>
                {check.reasonCode ?? `${check.durationMs} ms`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.surfaceFocusContextCard}>
        <div className={styles.surfaceFocusContextList}>
          <span className={styles.surfaceFocusContextItem}>
            آخر نجاح: <strong>{value.lastSuccessAt
              ? new Date(value.lastSuccessAt).toLocaleString("ar-SA")
              : "غير مثبت"}</strong>
          </span>
          <span className={styles.surfaceFocusContextItem}>
            الارتباط: <strong>{value.correlationId ?? "غير متاح"}</strong>
          </span>
          <span className={styles.surfaceFocusContextItem}>
            زمن الفحص: <strong>{value.durationMs ?? 0} ms</strong>
          </span>
        </div>
      </div>

      {value.status === "NOT_READY" ? (
        <CpStatePanel
          role="alert"
          title="عمليات الهوية متوقفة مغلقًا"
          description={`الأسباب: ${(value.reasonCodes ?? ["IDENTITY_NOT_READY"]).join("، ")}`}
        />
      ) : null}
    </section>
  );
}
