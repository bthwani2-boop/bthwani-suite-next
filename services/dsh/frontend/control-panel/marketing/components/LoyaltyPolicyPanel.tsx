"use client";

import React from "react";
import { colorRoles } from "@bthwani/ui-kit";
import {
  useLoyaltyPolicyController,
  type LoyaltyEarningPolicy,
} from "../../../shared/marketing";

export function LoyaltyPolicyPanel() {
  const controller = useLoyaltyPolicyController("authenticated");
  const [nameAr, setNameAr] = React.useState("");
  const [points, setPoints] = React.useState("1");
  const [denominatorYer, setDenominatorYer] = React.useState("100");
  const [minimumPoints, setMinimumPoints] = React.useState("0");
  const [maximumPoints, setMaximumPoints] = React.useState("0");

  const policies = controller.state.kind === "success" ? controller.state.policies : [];

  const create = async () => {
    const numerator = Number(points);
    const denominator = Number(denominatorYer);
    const minimum = Number(minimumPoints);
    const maximum = Number(maximumPoints);
    if (!nameAr.trim() || !Number.isInteger(numerator) || numerator <= 0 ||
        !Number.isFinite(denominator) || denominator <= 0 ||
        !Number.isInteger(minimum) || minimum < 0 ||
        !Number.isInteger(maximum) || maximum < 0) return;
    const succeeded = await controller.create({
      nameAr: nameAr.trim(),
      pointsNumerator: numerator,
      eligibleMinorUnitsDenominator: Math.round(denominator * 100),
      minimumPoints: minimum,
      maximumPointsPerOrder: maximum,
    });
    if (succeeded) setNameAr("");
  };

  const formatPolicy = (policy: LoyaltyEarningPolicy): string => {
    const denominator = policy.eligibleMinorUnitsDenominator / 100;
    return `${policy.pointsNumerator} نقطة لكل ${denominator.toLocaleString("ar")} ر.ي مؤهلة`;
  };

  return (
    <section dir="rtl" style={{ display: "grid", gap: "1rem", padding: "1rem", borderTop: `1px solid ${colorRoles.borderSubtle}` }}>
      <div>
        <h3 style={{ margin: 0, color: colorRoles.brandStructure }}>سياسة اكتساب النقاط</h3>
        <p style={{ margin: "0.35rem 0 0", opacity: 0.68 }}>
          تُطبق عند انتقال الطلب إلى delivered، وتُرسل إلى دفتر WLT عبر outbox. الخصم ورسوم التوصيل لا تُحتسب ضمن المبلغ المؤهل.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.6rem" }}>
        <input value={nameAr} onChange={(event) => setNameAr(event.target.value)} placeholder="اسم السياسة" style={inputStyle} />
        <input value={points} onChange={(event) => setPoints(event.target.value)} inputMode="numeric" placeholder="عدد النقاط" style={inputStyle} />
        <input value={denominatorYer} onChange={(event) => setDenominatorYer(event.target.value)} inputMode="decimal" placeholder="لكل مبلغ ر.ي" style={inputStyle} />
        <input value={minimumPoints} onChange={(event) => setMinimumPoints(event.target.value)} inputMode="numeric" placeholder="الحد الأدنى" style={inputStyle} />
        <input value={maximumPoints} onChange={(event) => setMaximumPoints(event.target.value)} inputMode="numeric" placeholder="الأقصى لكل طلب — صفر بلا حد" style={inputStyle} />
        <button type="button" disabled={controller.mutationLoading} onClick={() => void create()} style={primaryButtonStyle}>إنشاء مسودة سياسة</button>
      </div>

      {controller.state.kind === "loading" ? <p>جاري تحميل السياسات…</p> : null}
      {controller.state.kind === "error" ? <p role="alert" style={{ color: colorRoles.danger }}>{controller.state.message}</p> : null}
      {controller.mutationError ? <p role="alert" style={{ color: colorRoles.danger }}>{controller.mutationError}</p> : null}
      {controller.state.kind === "empty" ? <p style={{ opacity: 0.68 }}>لا توجد سياسات.</p> : null}

      <div style={{ display: "grid", gap: "0.6rem" }}>
        {policies.map((policy) => (
          <article key={policy.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "0.9rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.75rem", background: colorRoles.surfaceBase }}>
            <div>
              <strong>{policy.nameAr}</strong>
              <p style={{ margin: "0.3rem 0", opacity: 0.72 }}>{formatPolicy(policy)}</p>
              <p style={{ margin: 0, opacity: 0.6, fontSize: "0.8rem" }}>
                الحالة: {policy.status} · الإصدار: {policy.version} · المنشئ: {policy.createdByActorId}
              </p>
              <p style={{ margin: "0.2rem 0 0", opacity: 0.6, fontSize: "0.8rem" }}>
                المعتمد: {policy.approvedByActorId || "لم يعتمد بعد"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              {policy.status === "draft" || policy.status === "paused" ? (
                <button type="button" disabled={controller.mutationLoading} onClick={() => void controller.setStatus(policy, "active")} style={primaryButtonStyle}>اعتماد وتفعيل</button>
              ) : null}
              {policy.status === "active" ? (
                <button type="button" disabled={controller.mutationLoading} onClick={() => void controller.setStatus(policy, "paused")} style={secondaryButtonStyle}>إيقاف</button>
              ) : null}
              {policy.status !== "archived" ? (
                <button type="button" disabled={controller.mutationLoading} onClick={() => void controller.setStatus(policy, "archived")} style={secondaryButtonStyle}>أرشفة</button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.65rem",
  border: `1px solid ${colorRoles.borderSubtle}`,
  borderRadius: "0.5rem",
  background: colorRoles.surfaceBase,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
  border: 0,
  borderRadius: "0.5rem",
  background: colorRoles.brandAction,
  color: colorRoles.surfaceBase,
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "0.55rem 0.75rem",
  border: `1px solid ${colorRoles.borderSubtle}`,
  borderRadius: "0.5rem",
  background: colorRoles.surfaceBase,
  cursor: "pointer",
  fontWeight: 700,
};
