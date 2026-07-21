"use client";

import { useState, type CSSProperties } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import { useSubscriptionPlansController, type SubscriptionPlanRecord } from "../../../shared/marketing";

export function SubscriptionsCommandDeck() {
  const controller = useSubscriptionPlansController("authenticated");
  const [nameAr, setNameAr] = useState("");
  const [priceYer, setPriceYer] = useState("0");
  const [wltProductReference, setWltProductReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createDraft = async () => {
    const price = Number(priceYer);
    if (!nameAr.trim() || !Number.isFinite(price) || price < 1) return;
    setSubmitting(true);
    try {
      await controller.create({
        nameAr: nameAr.trim(),
        priceYer: price,
        billingCycle: "monthly",
        ...(wltProductReference.trim() ? { wltProductReference: wltProductReference.trim() } : {}),
      });
      setNameAr("");
      setPriceYer("0");
      setWltProductReference("");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (plan: SubscriptionPlanRecord, status: SubscriptionPlanRecord["status"]) => {
    setSubmitting(true);
    try {
      await controller.update(plan, { status });
    } finally {
      setSubmitting(false);
    }
  };

  const items = controller.state.kind === "success" ? controller.state.items : [];

  return (
    <section dir="rtl" style={styles.root}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>خطط الاشتراك</h3>
          <p style={styles.muted}>DSH يعرّف العرض فقط؛ المنتج والدفع والاشتراك الفعلي مملوكة لـWLT.</p>
        </div>
        <button type="button" onClick={() => void controller.reload()} style={styles.secondary}>إعادة التحميل</button>
      </div>

      <div style={styles.summary}>
        <span>خطط نشطة: {controller.summary.activePlans.toLocaleString("ar")}</span>
        <span>اشتراكات نشطة: {controller.summary.totalActiveSubscribers.toLocaleString("ar")}</span>
        <span>MRR من WLT: {controller.summary.mrr.toLocaleString("ar")} YER</span>
      </div>

      <div style={styles.form}>
        <input value={nameAr} onChange={(event) => setNameAr(event.target.value)} placeholder="اسم الخطة" style={styles.input} />
        <input value={priceYer} onChange={(event) => setPriceYer(event.target.value)} inputMode="numeric" placeholder="السعر بالريال" style={styles.input} />
        <input value={wltProductReference} onChange={(event) => setWltProductReference(event.target.value)} placeholder="مرجع منتج WLT" style={styles.input} />
        <button type="button" disabled={submitting} onClick={() => void createDraft()} style={styles.primary}>إنشاء مسودة</button>
      </div>

      {controller.state.kind === "loading" ? <p>جارٍ التحميل…</p> : null}
      {controller.state.kind === "error" ? <p role="alert" style={styles.error}>{controller.state.message}</p> : null}
      {controller.actionError ? <p role="alert" style={styles.error}>{controller.actionError}</p> : null}
      {controller.state.kind === "success" && items.length === 0 ? <p style={styles.muted}>لا توجد خطط اشتراك.</p> : null}

      <div style={styles.list}>
        {items.map((plan) => (
          <article key={plan.id} style={styles.card}>
            <div>
              <strong>{plan.nameAr}</strong>
              <p style={styles.muted}>{plan.priceYer.toLocaleString("ar")} YER · {plan.billingCycle} · الإصدار {plan.version}</p>
              <p style={styles.muted}>مرجع WLT: {plan.wltProductReference || "غير مربوط"}</p>
              <p style={styles.muted}>الحالة: {plan.status}</p>
            </div>
            <div style={styles.actions}>
              {plan.status !== "active" ? <button type="button" disabled={submitting || !plan.wltProductReference} onClick={() => void updateStatus(plan, "active")} style={styles.primary}>طلب اعتماد نشط</button> : null}
              {plan.status === "active" ? <button type="button" disabled={submitting} onClick={() => void updateStatus(plan, "paused")} style={styles.secondary}>إيقاف</button> : null}
              {plan.status !== "archived" ? <button type="button" disabled={submitting} onClick={() => void updateStatus(plan, "archived")} style={styles.secondary}>أرشفة</button> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
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
