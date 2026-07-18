"use client";

import { useState, type CSSProperties } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import {
  useCouponsController,
  type CouponDiscountType,
  type CouponRecord,
} from "../../../shared/marketing";

export function CouponsCommandDeck() {
  const controller = useCouponsController("authenticated");
  const [nameAr, setNameAr] = useState("");
  const [code, setCode] = useState("");
  const [storeId, setStoreId] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minSubtotalYer, setMinSubtotalYer] = useState("0");
  const [maxDiscountYer, setMaxDiscountYer] = useState("0");
  const [globalLimit, setGlobalLimit] = useState("0");
  const [clientLimit, setClientLimit] = useState("1");

  const createDraft = async () => {
    const discount = Number(discountValue);
    const minSubtotal = Number(minSubtotalYer);
    const maxDiscount = Number(maxDiscountYer);
    const totalLimit = Number(globalLimit);
    const perClient = Number(clientLimit);
    if (!nameAr.trim() || !code.trim() || !Number.isFinite(discount) || discount <= 0 ||
        !Number.isFinite(minSubtotal) || minSubtotal < 0 || !Number.isFinite(maxDiscount) || maxDiscount < 0 ||
        !Number.isInteger(totalLimit) || totalLimit < 0 || !Number.isInteger(perClient) || perClient <= 0) return;

    const succeeded = await controller.create({
      nameAr: nameAr.trim(),
      code: code.trim(),
      ...(storeId.trim() ? { storeId: storeId.trim() } : {}),
      discountType,
      ...(discountType === "percent"
        ? { discountPercent: discount, fixedDiscountMinorUnits: 0 }
        : { discountPercent: 0, fixedDiscountMinorUnits: Math.round(discount * 100) }),
      minSubtotalMinorUnits: Math.round(minSubtotal * 100),
      maxDiscountMinorUnits: Math.round(maxDiscount * 100),
      globalUsageLimit: totalLimit,
      perClientUsageLimit: perClient,
      eligibleFulfillmentModes: ["bthwani_delivery", "partner_delivery", "pickup"],
    });
    if (succeeded) {
      setNameAr("");
      setCode("");
      setStoreId("");
    }
  };

  const setStatus = async (coupon: CouponRecord, status: CouponRecord["status"]) => {
    await controller.setStatus(coupon, status);
  };

  const coupons = controller.state.kind === "success" ? controller.state.coupons : [];

  return (
    <section dir="rtl" style={styles.root}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>الكوبونات التشغيلية</h3>
          <p style={styles.muted}>الكود يُخزن كملخص مشفر، ويُطبق على المبلغ السيادي داخل checkout قبل WLT.</p>
        </div>
        <button type="button" onClick={() => void controller.reload()} style={styles.secondary}>إعادة التحميل</button>
      </div>

      <div style={styles.form}>
        <input value={nameAr} onChange={(event) => setNameAr(event.target.value)} placeholder="اسم الكوبون" style={styles.input} />
        <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="الكود — يظهر مرة واحدة" style={styles.input} />
        <input value={storeId} onChange={(event) => setStoreId(event.target.value)} placeholder="معرف المتجر — فارغ = عام" style={styles.input} />
        <select value={discountType} onChange={(event) => setDiscountType(event.target.value as CouponDiscountType)} style={styles.input}>
          <option value="percent">نسبة مئوية</option>
          <option value="fixed">مبلغ ثابت</option>
        </select>
        <input value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} inputMode="decimal" placeholder={discountType === "percent" ? "النسبة" : "المبلغ ر.ي"} style={styles.input} />
        <input value={minSubtotalYer} onChange={(event) => setMinSubtotalYer(event.target.value)} inputMode="numeric" placeholder="الحد الأدنى للسلة ر.ي" style={styles.input} />
        <input value={maxDiscountYer} onChange={(event) => setMaxDiscountYer(event.target.value)} inputMode="numeric" placeholder="أقصى خصم ر.ي — صفر بلا حد" style={styles.input} />
        <input value={globalLimit} onChange={(event) => setGlobalLimit(event.target.value)} inputMode="numeric" placeholder="الحد الإجمالي — صفر بلا حد" style={styles.input} />
        <input value={clientLimit} onChange={(event) => setClientLimit(event.target.value)} inputMode="numeric" placeholder="حد العميل" style={styles.input} />
        <button type="button" disabled={controller.mutationLoading} onClick={() => void createDraft()} style={styles.primary}>إنشاء مسودة</button>
      </div>

      {controller.issuedCoupon ? (
        <div role="status" style={styles.issued}>
          <strong>الكود الصريح — يظهر الآن فقط:</strong>
          <code style={styles.code}>{controller.issuedCoupon.code}</code>
          <button type="button" onClick={controller.clearIssuedCoupon} style={styles.secondary}>إخفاء</button>
        </div>
      ) : null}
      {controller.state.kind === "loading" ? <p>جارٍ التحميل…</p> : null}
      {controller.state.kind === "error" ? <p role="alert" style={styles.error}>{controller.state.message}</p> : null}
      {controller.mutationError ? <p role="alert" style={styles.error}>{controller.mutationError}</p> : null}
      {controller.state.kind === "empty" ? <p style={styles.muted}>لا توجد كوبونات حتى الآن.</p> : null}

      <div style={styles.list}>
        {coupons.map((coupon) => (
          <article key={coupon.id} style={styles.card}>
            <div>
              <strong>{coupon.nameAr}</strong>
              <p style={styles.muted}>آخر أربعة: {coupon.codeLast4} · الحالة: {coupon.status} · الإصدار: {coupon.version}</p>
              <p style={styles.muted}>
                {coupon.discountType === "percent"
                  ? `خصم ${coupon.discountPercent}%`
                  : `خصم ${(coupon.fixedDiscountMinorUnits / 100).toLocaleString("ar")} ر.ي`}
                {coupon.storeId ? ` · متجر ${coupon.storeId}` : " · عام"}
              </p>
              <p style={styles.muted}>حد العميل: {coupon.perClientUsageLimit} · الحد الإجمالي: {coupon.globalUsageLimit || "غير محدود"}</p>
            </div>
            <div style={styles.actions}>
              {coupon.status === "draft" || coupon.status === "paused" ? (
                <button type="button" disabled={controller.mutationLoading} onClick={() => void setStatus(coupon, "active")} style={styles.primary}>اعتماد وتفعيل</button>
              ) : null}
              {coupon.status === "active" ? (
                <button type="button" disabled={controller.mutationLoading} onClick={() => void setStatus(coupon, "paused")} style={styles.secondary}>إيقاف</button>
              ) : null}
              {coupon.status !== "archived" ? (
                <button type="button" disabled={controller.mutationLoading} onClick={() => void setStatus(coupon, "archived")} style={styles.secondary}>أرشفة</button>
              ) : null}
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
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.6rem" },
  input: { padding: "0.65rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.5rem", background: colorRoles.surfaceBase },
  primary: { padding: "0.6rem 0.8rem", border: 0, borderRadius: "0.5rem", background: colorRoles.brandAction, color: colorRoles.surfaceBase, cursor: "pointer", fontWeight: 700 },
  secondary: { padding: "0.55rem 0.75rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.5rem", background: colorRoles.surfaceBase, cursor: "pointer", fontWeight: 700 },
  error: { color: colorRoles.danger, margin: 0 },
  issued: { display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap", padding: "0.9rem", border: `1px solid ${colorRoles.warning}`, borderRadius: "0.7rem" },
  code: { fontSize: "1.1rem", fontWeight: 800, letterSpacing: "0.12rem" },
  list: { display: "grid", gap: "0.6rem" },
  card: { display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.9rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.7rem", background: colorRoles.surfaceBase },
  actions: { display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" },
};
