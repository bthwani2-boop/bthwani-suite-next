"use client";

import { type CSSProperties } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import type { CouponFundingLifecycleRecord } from "../../../shared/marketing";

type CouponFundingReconciliationPanelProps = {
  readonly records: readonly CouponFundingLifecycleRecord[];
  readonly loading: boolean;
  readonly error?: string | undefined;
  readonly onReload: () => void;
};

const statusLabel: Record<CouponFundingLifecycleRecord["reconciliationStatus"], string> = {
  reconciled: "متطابق",
  mismatch: "اختلاف مالي",
  wlt_unavailable: "تعذر التحقق من WLT",
  incomplete: "غير مكتمل",
  not_checked: "لم يُتحقق",
};

function formatMinorUnits(value: number, currency: string): string {
  return `${(value / 100).toLocaleString("ar")} ${currency || "YER"}`;
}

export function CouponFundingReconciliationPanel({
  records,
  loading,
  error,
  onReload,
}: CouponFundingReconciliationPanelProps) {
  return (
    <section dir="rtl" aria-labelledby="coupon-funding-reconciliation-title" style={styles.root}>
      <div style={styles.header}>
        <div>
          <h3 id="coupon-funding-reconciliation-title" style={styles.title}>مصالحة تمويل العروض</h3>
          <p style={styles.muted}>مقارنة فورية بين إسقاط DSH التشغيلي وحجز WLT المالي، مع حالة صندوق التسليم وإعادة المحاولة.</p>
        </div>
        <button type="button" disabled={loading} onClick={onReload} style={styles.button}>إعادة التحقق</button>
      </div>

      {loading ? <p aria-live="polite">جارٍ التحقق من DSH وWLT…</p> : null}
      {error ? <p role="alert" style={styles.error}>{error}</p> : null}
      {!loading && !error && records.length === 0 ? <p style={styles.muted}>لا توجد حجوزات تمويل حتى الآن.</p> : null}
      {!loading && !error && records.length > 0 ? (
        <div style={styles.list}>
          {records.map((record) => (
            <article key={record.redemptionId} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>Checkout {record.checkoutIntentId}</strong>
                <span style={record.reconciliationStatus === "reconciled" ? styles.okBadge : styles.alertBadge}>
                  {statusLabel[record.reconciliationStatus]}
                </span>
              </div>
              <p style={styles.muted}>DSH: {record.dshStatus} · WLT: {record.wltStatus || "غير متاح"}</p>
              <p style={styles.muted}>
                المنصة {formatMinorUnits(record.platformFundedMinorUnits, record.currency)} · الشريك {formatMinorUnits(record.partnerFundedMinorUnits, record.currency)} · الإجمالي {formatMinorUnits(record.totalDiscountMinorUnits, record.currency)}
              </p>
              <p style={styles.muted}>مرجع WLT: {record.wltReservationId || "لم يُرفق"}</p>
              {record.latestOutboxType ? (
                <p style={styles.muted}>الصندوق: {record.latestOutboxType} / {record.latestOutboxStatus || "غير معروف"} · المحاولات {record.latestOutboxAttempts}</p>
              ) : null}
              {record.reconciliationMessage ? <p style={styles.message}>{record.reconciliationMessage}</p> : null}
              {record.failureCode || record.latestOutboxError ? (
                <p role="alert" style={styles.error}>{record.failureCode || record.latestOutboxError}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  root: { marginTop: "1rem", padding: "1rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.75rem" },
  header: { display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" },
  title: { margin: 0 },
  muted: { margin: "0.35rem 0", opacity: 0.72, overflowWrap: "anywhere" },
  button: { border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.5rem", padding: "0.5rem 0.75rem", background: "transparent", cursor: "pointer" },
  list: { display: "grid", gap: "0.75rem", marginTop: "1rem" },
  card: { border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.625rem", padding: "0.75rem" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" },
  okBadge: { border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "999px", padding: "0.2rem 0.55rem", fontSize: "0.75rem" },
  alertBadge: { border: "1px solid currentColor", borderRadius: "999px", padding: "0.2rem 0.55rem", fontSize: "0.75rem", fontWeight: 700 },
  message: { margin: "0.35rem 0", fontWeight: 600 },
  error: { margin: "0.35rem 0", color: colorRoles.danger, overflowWrap: "anywhere" },
};
