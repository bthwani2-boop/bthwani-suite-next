"use client";

import { useState } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import { useLoyaltyTiersController, type LoyaltyTierRecord } from "../../../shared/marketing";

export function LoyaltyCommandDeck() {
  const controller = useLoyaltyTiersController("authenticated");
  const [nameAr, setNameAr] = useState("");
  const [minPoints, setMinPoints] = useState("0");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const createDraft = async () => {
    const points = Number(minPoints);
    const discount = Number(discountPercent);
    if (!nameAr.trim() || !Number.isFinite(points) || points < 0 || !Number.isFinite(discount) || discount < 0 || discount > 100) return;
    setSubmitting(true);
    try {
      await controller.create({ nameAr: nameAr.trim(), minPoints: points, discountPercent: discount });
      setNameAr("");
      setMinPoints("0");
      setDiscountPercent("0");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (tier: LoyaltyTierRecord, status: LoyaltyTierRecord["status"]) => {
    setSubmitting(true);
    try {
      await controller.update(tier, { status });
    } finally {
      setSubmitting(false);
    }
  };

  const items = controller.state.kind === "success" ? controller.state.items : [];

  return (
    <section dir="rtl" style={styles.root}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>مستويات الولاء</h3>
          <p style={styles.muted}>تعريفات DSH فقط؛ رصيد النقاط والحركات المالية تظل في WLT.</p>
        </div>
        <button type="button" onClick={() => void controller.reload()} style={styles.secondary}>إعادة التحميل</button>
      </div>

      <div style={styles.summary}>
        <span>نشطة: {controller.summary.activeTiers.toLocaleString("ar")}</span>
        <span>عملاء مسجلون: {controller.summary.totalEnrolledClients.toLocaleString("ar")}</span>
        <span>نقاط الشهر: {controller.summary.pointsIssuedThisMonth.toLocaleString("ar")}</span>
      </div>

      <div style={styles.form}>
        <input value={nameAr} onChange={(event) => setNameAr(event.target.value)} placeholder="اسم المستوى" style={styles.input} />
        <input value={minPoints} onChange={(event) => setMinPoints(event.target.value)} inputMode="numeric" placeholder="الحد الأدنى للنقاط" style={styles.input} />
        <input value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} inputMode="decimal" placeholder="نسبة الخصم" style={styles.input} />
        <button type="button" disabled={submitting} onClick={() => void createDraft()} style={styles.primary}>إنشاء مسودة</button>
      </div>

      {controller.state.kind === "loading" ? <p>جارٍ التحميل…</p> : null}
      {controller.state.kind === "error" ? <p role="alert" style={styles.error}>{controller.state.message}</p> : null}
      {controller.actionError ? <p role="alert" style={styles.error}>{controller.actionError}</p> : null}
      {controller.state.kind === "success" && items.length === 0 ? <p style={styles.muted}>لا توجد مستويات ولاء.</p> : null}

      <div style={styles.list}>
        {items.map((tier) => (
          <article key={tier.id} style={styles.card}>
            <div>
              <strong>{tier.nameAr}</strong>
              <p style={styles.muted}>من {tier.minPoints.toLocaleString("ar")} نقطة · خصم {tier.discountPercent}% · الإصدار {tier.version}</p>
              <p style={styles.muted}>الحالة: {tier.status}</p>
            </div>
            <div style={styles.actions}>
              {tier.status !== "active" ? <button type="button" disabled={submitting} onClick={() => void updateStatus(tier, "active")} style={styles.primary}>طلب اعتماد نشط</button> : null}
              {tier.status === "active" ? <button type="button" disabled={submitting} onClick={() => void updateStatus(tier, "paused")} style={styles.secondary}>إيقاف</button> : null}
              {tier.status !== "archived" ? <button type="button" disabled={submitting} onClick={() => void updateStatus(tier, "archived")} style={styles.secondary}>أرشفة</button> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: "grid", gap: "1rem", padding: "1rem" },
  header: { display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" },
  title: { margin: 0, color: colorRoles.brandStructure },
  muted: { margin: "0.25rem 0", opacity: 0.68, fontSize: "0.82rem" },
  summary: { display: "flex", flexWrap: "wrap", gap: "1rem", padding: "0.8rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.7rem" },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.6rem" },
  input: { padding: "0.65rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.5rem", background: colorRoles.surfaceBase },
  primary: { padding: "0.6rem 0.8rem", border: 0, borderRadius: "0.5rem", background: colorRoles.brandAction, color: colorRoles.surfaceBase, cursor: "pointer", fontWeight: 700 },
  secondary: { padding: "0.55rem 0.75rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.5rem", background: colorRoles.surfaceBase, cursor: "pointer", fontWeight: 700 },
  error: { color: colorRoles.danger, margin: 0 },
  list: { display: "grid", gap: "0.6rem" },
  card: { display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.9rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.7rem", background: colorRoles.surfaceBase },
  actions: { display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" },
};
