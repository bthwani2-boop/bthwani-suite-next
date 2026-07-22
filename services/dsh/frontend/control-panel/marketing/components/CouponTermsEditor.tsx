"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import type {
  CouponDiscountType,
  CouponFulfillmentMode,
  CouponRecord,
  CouponUpdatePayload,
} from "../../../shared/marketing/coupons.public";

type CouponTermsEditorProps = {
  readonly coupon: CouponRecord;
  readonly loading: boolean;
  readonly onSave: (
    coupon: CouponRecord,
    payload: Omit<CouponUpdatePayload, "expectedVersion">,
  ) => Promise<boolean>;
};

const FULFILLMENT_MODES: readonly { readonly id: CouponFulfillmentMode; readonly label: string }[] = [
  { id: "bthwani_delivery", label: "توصيل بثواني" },
  { id: "partner_delivery", label: "توصيل المتجر" },
  { id: "pickup", label: "استلم بنفسك" },
];

function toLocalDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toRfc3339(value: string): string {
  if (!value.trim()) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function CouponTermsEditor({ coupon, loading, onSave }: CouponTermsEditorProps) {
  const [editing, setEditing] = useState(false);
  const [nameAr, setNameAr] = useState(coupon.nameAr);
  const [description, setDescription] = useState(coupon.description);
  const [storeId, setStoreId] = useState(coupon.storeId ?? "");
  const [discountType, setDiscountType] = useState<CouponDiscountType>(coupon.discountType);
  const [discountValue, setDiscountValue] = useState(
    coupon.discountType === "percent"
      ? String(coupon.discountPercent)
      : String(coupon.fixedDiscountMinorUnits / 100),
  );
  const [minSubtotalYer, setMinSubtotalYer] = useState(String(coupon.minSubtotalMinorUnits / 100));
  const [maxDiscountYer, setMaxDiscountYer] = useState(String(coupon.maxDiscountMinorUnits / 100));
  const [globalLimit, setGlobalLimit] = useState(String(coupon.globalUsageLimit));
  const [clientLimit, setClientLimit] = useState(String(coupon.perClientUsageLimit));
  const [modes, setModes] = useState<readonly CouponFulfillmentMode[]>(coupon.eligibleFulfillmentModes);
  const [startsAt, setStartsAt] = useState(toLocalDateTime(coupon.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalDateTime(coupon.endsAt));

  useEffect(() => {
    setNameAr(coupon.nameAr);
    setDescription(coupon.description);
    setStoreId(coupon.storeId ?? "");
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountType === "percent"
      ? String(coupon.discountPercent)
      : String(coupon.fixedDiscountMinorUnits / 100));
    setMinSubtotalYer(String(coupon.minSubtotalMinorUnits / 100));
    setMaxDiscountYer(String(coupon.maxDiscountMinorUnits / 100));
    setGlobalLimit(String(coupon.globalUsageLimit));
    setClientLimit(String(coupon.perClientUsageLimit));
    setModes(coupon.eligibleFulfillmentModes);
    setStartsAt(toLocalDateTime(coupon.startsAt));
    setEndsAt(toLocalDateTime(coupon.endsAt));
  }, [coupon]);

  const toggleMode = (mode: CouponFulfillmentMode) => {
    setModes((current) => current.includes(mode)
      ? current.filter((candidate) => candidate !== mode)
      : [...current, mode]);
  };

  const save = async () => {
    const discount = Number(discountValue);
    const minimum = Number(minSubtotalYer);
    const maximum = Number(maxDiscountYer);
    const totalLimit = Number(globalLimit);
    const perClient = Number(clientLimit);
    if (!nameAr.trim() || !Number.isFinite(discount) || discount <= 0 ||
        (discountType === "percent" && discount > 100) ||
        !Number.isFinite(minimum) || minimum < 0 ||
        !Number.isFinite(maximum) || maximum < 0 ||
        !Number.isInteger(totalLimit) || totalLimit < 0 ||
        !Number.isInteger(perClient) || perClient <= 0 || modes.length === 0) return;

    const startsAtValue = toRfc3339(startsAt);
    const endsAtValue = toRfc3339(endsAt);
    if (startsAt && !startsAtValue) return;
    if (endsAt && !endsAtValue) return;
    if (startsAtValue && endsAtValue && new Date(endsAtValue) <= new Date(startsAtValue)) return;

    const succeeded = await onSave(coupon, {
      nameAr: nameAr.trim(),
      description: description.trim(),
      storeId: storeId.trim(),
      discountType,
      discountPercent: discountType === "percent" ? discount : 0,
      fixedDiscountMinorUnits: discountType === "fixed" ? Math.round(discount * 100) : 0,
      minSubtotalMinorUnits: Math.round(minimum * 100),
      maxDiscountMinorUnits: Math.round(maximum * 100),
      globalUsageLimit: totalLimit,
      perClientUsageLimit: perClient,
      eligibleFulfillmentModes: modes,
      startsAt: startsAtValue,
      endsAt: endsAtValue,
    });
    if (succeeded) setEditing(false);
  };

  const disabled = loading || coupon.status === "active" || coupon.status === "archived";

  if (!editing) {
    return (
      <div style={styles.summary}>
        <small style={styles.muted}>
          الأنماط: {coupon.eligibleFulfillmentModes.join(" · ")} · البداية: {coupon.startsAt || "فورية"} · النهاية: {coupon.endsAt || "بلا نهاية"}
        </small>
        <button type="button" disabled={disabled} onClick={() => setEditing(true)} style={styles.secondary}>
          تعديل الشروط والنطاق
        </button>
        {coupon.status === "active" ? <small style={styles.muted}>أوقف الكوبون قبل تعديل الشروط.</small> : null}
      </div>
    );
  }

  return (
    <div style={styles.editor}>
      <strong style={styles.full}>شروط الكوبون ونطاقه</strong>
      <input value={nameAr} disabled={disabled} onChange={(event) => setNameAr(event.target.value)} placeholder="اسم الكوبون" style={styles.input} />
      <input value={description} disabled={disabled} onChange={(event) => setDescription(event.target.value)} placeholder="الوصف" style={styles.input} />
      <input value={storeId} disabled={disabled} onChange={(event) => setStoreId(event.target.value)} placeholder="معرف المتجر — فارغ = عام" style={styles.input} />
      <select value={discountType} disabled={disabled} onChange={(event) => setDiscountType(event.target.value as CouponDiscountType)} style={styles.input}>
        <option value="percent">نسبة مئوية</option>
        <option value="fixed">مبلغ ثابت</option>
      </select>
      <input value={discountValue} disabled={disabled} onChange={(event) => setDiscountValue(event.target.value)} inputMode="decimal" placeholder={discountType === "percent" ? "النسبة" : "المبلغ ر.ي"} style={styles.input} />
      <input value={minSubtotalYer} disabled={disabled} onChange={(event) => setMinSubtotalYer(event.target.value)} inputMode="decimal" placeholder="الحد الأدنى للسلة ر.ي" style={styles.input} />
      <input value={maxDiscountYer} disabled={disabled} onChange={(event) => setMaxDiscountYer(event.target.value)} inputMode="decimal" placeholder="أقصى خصم ر.ي — صفر بلا حد" style={styles.input} />
      <input value={globalLimit} disabled={disabled} onChange={(event) => setGlobalLimit(event.target.value)} inputMode="numeric" placeholder="الحد الإجمالي — صفر بلا حد" style={styles.input} />
      <input value={clientLimit} disabled={disabled} onChange={(event) => setClientLimit(event.target.value)} inputMode="numeric" placeholder="حد العميل" style={styles.input} />
      <label style={styles.label}>بداية الصلاحية<input type="datetime-local" value={startsAt} disabled={disabled} onChange={(event) => setStartsAt(event.target.value)} style={styles.input} /></label>
      <label style={styles.label}>نهاية الصلاحية<input type="datetime-local" value={endsAt} disabled={disabled} onChange={(event) => setEndsAt(event.target.value)} style={styles.input} /></label>
      <div style={styles.full}>
        <span style={styles.muted}>أنماط التنفيذ المؤهلة</span>
        <div style={styles.modes}>
          {FULFILLMENT_MODES.map((mode) => (
            <label key={mode.id} style={styles.mode}>
              <input type="checkbox" checked={modes.includes(mode.id)} disabled={disabled} onChange={() => toggleMode(mode.id)} />
              {mode.label}
            </label>
          ))}
        </div>
      </div>
      <div style={{ ...styles.full, ...styles.actions }}>
        <button type="button" disabled={disabled} onClick={() => void save()} style={styles.primary}>حفظ الشروط</button>
        <button type="button" disabled={loading} onClick={() => setEditing(false)} style={styles.secondary}>إلغاء</button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  editor: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.5rem", marginTop: "0.7rem", paddingTop: "0.7rem", borderTop: `1px solid ${colorRoles.borderSubtle}` },
  summary: { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.65rem" },
  input: { width: "100%", boxSizing: "border-box", padding: "0.65rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.5rem", background: colorRoles.surfaceBase },
  label: { display: "grid", gap: "0.25rem", fontSize: "0.78rem", opacity: 0.8 },
  full: { gridColumn: "1 / -1" },
  modes: { display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.35rem" },
  mode: { display: "flex", gap: "0.35rem", alignItems: "center", fontSize: "0.82rem" },
  actions: { display: "flex", gap: "0.45rem", flexWrap: "wrap" },
  muted: { opacity: 0.68, fontSize: "0.78rem" },
  primary: { padding: "0.6rem 0.8rem", border: 0, borderRadius: "0.5rem", background: colorRoles.brandAction, color: colorRoles.surfaceBase, cursor: "pointer", fontWeight: 700 },
  secondary: { padding: "0.55rem 0.75rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.5rem", background: colorRoles.surfaceBase, cursor: "pointer", fontWeight: 700 },
};
