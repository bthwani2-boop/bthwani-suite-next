"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Text, lightThemeColors } from "@bthwani/ui-kit";
import { resolveDshApiBaseUrl } from "../../shared/finance-wlt-link/_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../shared/finance-wlt-link/_kernel/dsh-http-request";
import {
  adjustJrn036Commission,
  confirmJrn036Commission,
  rejectJrn036Commission,
  reverseJrn036Commission,
  settleJrn036Commission,
  upsertJrn036CommissionPolicy,
  type Jrn036Commission,
  type Jrn036CommissionPolicyInput,
  type Jrn036RepresentativeActorType,
} from "../../shared/finance-wlt-link/jrn036";

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "control-panel-jrn036-commission-governance",
);

type BusyAction = { readonly commissionId: string; readonly action: string } | null;

const STATUS_META: Record<
  string,
  { readonly label: string; readonly tone: "neutral" | "success" | "warning" | "danger" }
> = {
  pending: { label: "قيد المراجعة", tone: "warning" },
  confirmed: { label: "مؤكدة", tone: "success" },
  settled: { label: "مسوّاة", tone: "success" },
  rejected: { label: "مرفوضة", tone: "danger" },
  reversed: { label: "معكوسة", tone: "danger" },
};

const inputStyle = {
  width: "100%",
  padding: "0.65rem",
  borderRadius: "0.5rem",
  border: `1px solid ${lightThemeColors.borderColor}`,
  background: lightThemeColors.surface,
};

function formatMoney(amountMinorUnits: number, currency: string): string {
  return `${(amountMinorUnits / 100).toLocaleString("ar-YE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function validatePolicy(policy: Jrn036CommissionPolicyInput): string | null {
  if (!policy.policyId.trim()) return "معرف السياسة مطلوب.";
  if (!policy.commissionType.trim()) return "نوع العمولة مطلوب.";
  if (!policy.sourceType.trim()) return "نوع المصدر مطلوب.";
  if (!policy.currency.trim()) return "العملة مطلوبة.";
  if (!policy.changeReason.trim()) return "سبب تغيير السياسة مطلوب.";
  if (!Number.isSafeInteger(policy.minimumAmountMinorUnits) || policy.minimumAmountMinorUnits < 0) {
    return "الحد الأدنى يجب أن يكون عددًا صحيحًا غير سالب.";
  }
  if (
    policy.maximumAmountMinorUnits !== null &&
    policy.maximumAmountMinorUnits !== undefined &&
    (!Number.isSafeInteger(policy.maximumAmountMinorUnits) ||
      policy.maximumAmountMinorUnits < policy.minimumAmountMinorUnits)
  ) {
    return "الحد الأعلى يجب أن يكون عددًا صحيحًا لا يقل عن الحد الأدنى.";
  }
  if (policy.calculationType === "fixed") {
    if (!Number.isSafeInteger(policy.fixedAmountMinorUnits) || policy.fixedAmountMinorUnits <= 0) {
      return "القيمة الثابتة يجب أن تكون عددًا صحيحًا موجبًا.";
    }
  } else if (!Number.isInteger(policy.basisPoints) || policy.basisPoints < 1 || policy.basisPoints > 10000) {
    return "نقاط الأساس يجب أن تكون بين 1 و10000.";
  }
  return null;
}

export function Jrn036CommissionGovernancePanel() {
  const [commissions, setCommissions] = useState<readonly Jrn036Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policy, setPolicy] = useState<Jrn036CommissionPolicyInput>({
    policyId: "field-visit-default",
    commissionType: "field_visit_fee",
    sourceType: "field_visit",
    beneficiaryActorType: "field",
    calculationType: "fixed",
    fixedAmountMinorUnits: 1000,
    basisPoints: 0,
    minimumAmountMinorUnits: 0,
    maximumAmountMinorUnits: null,
    currency: "YER",
    status: "active",
    changeReason: "",
  });

  const policyError = useMemo(() => validatePolicy(policy), [policy]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await request<{ readonly commissions: Jrn036Commission[] }>(
        "/dsh/control-panel/finance/commissions?limit=100",
      );
      setCommissions(response.commissions ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل العمولات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (
      commission: Jrn036Commission,
      action: "confirm" | "settle" | "reject" | "reverse" | "adjust",
    ) => {
      setBusy({ commissionId: commission.id, action });
      setError(null);
      setNotice(null);
      try {
        if (action === "confirm") await confirmJrn036Commission(commission.id);
        if (action === "settle") await settleJrn036Commission(commission.id);
        if (action === "reject") {
          const reason = window.prompt("سبب رفض العمولة:")?.trim();
          if (!reason) return;
          await rejectJrn036Commission(commission.id, reason);
        }
        if (action === "reverse") {
          const reason = window.prompt("سبب عكس العمولة المسوّاة:")?.trim();
          if (!reason) return;
          await reverseJrn036Commission(commission.id, reason);
        }
        if (action === "adjust") {
          const rawDelta = window
            .prompt("قيمة التعديل بالوحدات الصغرى؛ استخدم قيمة سالبة للخصم:")
            ?.trim();
          const reason = window.prompt("سبب التعديل:")?.trim();
          const deltaMinorUnits = Number(rawDelta);
          if (!reason || !Number.isSafeInteger(deltaMinorUnits) || deltaMinorUnits === 0) {
            setError("قيمة التعديل يجب أن تكون عددًا صحيحًا غير صفري مع سبب إلزامي.");
            return;
          }
          await adjustJrn036Commission(commission.id, deltaMinorUnits, reason);
        }
        setNotice("تم تنفيذ الإجراء وتحديث الحقيقة المالية من WLT.");
        await load();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "تعذر تنفيذ الإجراء المالي.");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const savePolicy = useCallback(async () => {
    const validationError = validatePolicy(policy);
    setError(validationError);
    setNotice(null);
    if (validationError) return;

    setSavingPolicy(true);
    try {
      await upsertJrn036CommissionPolicy({
        ...policy,
        policyId: policy.policyId.trim(),
        commissionType: policy.commissionType.trim(),
        sourceType: policy.sourceType.trim(),
        currency: policy.currency.trim().toUpperCase(),
        changeReason: policy.changeReason.trim(),
      });
      setNotice("تم حفظ إصدار سياسة العمولة في WLT مع سبب التغيير.");
      setPolicy((current) => ({ ...current, changeReason: "" }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ سياسة العمولة.");
    } finally {
      setSavingPolicy(false);
    }
  }, [load, policy]);

  return (
    <Card style={{ padding: "1.5rem", marginBottom: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <Text role="titleMd">حوكمة العمولات — JRN-036</Text>
          <Text role="body" tone="muted">
            WLT يحسب القيمة من الدليل وإصدار السياسة. تعرض القائمة آخر 100 سجل حاكم دون حساب محلي.
          </Text>
        </div>
        <Button
          label={loading ? "جارٍ التحديث…" : "تحديث"}
          tone="secondary"
          disabled={loading}
          onPress={() => void load()}
        />
      </div>

      {error ? (
        <Card
          style={{
            padding: "0.75rem",
            marginTop: "1rem",
            borderLeft: `4px solid ${lightThemeColors.danger}`,
          }}
        >
          <Text role="body" tone="danger">
            {error}
          </Text>
        </Card>
      ) : null}
      {notice ? (
        <Card
          style={{
            padding: "0.75rem",
            marginTop: "1rem",
            borderLeft: `4px solid ${lightThemeColors.success}`,
          }}
        >
          <Text role="body" tone="success">
            {notice}
          </Text>
        </Card>
      ) : null}

      <Card style={{ padding: "1rem", marginTop: "1rem" }}>
        <Text role="body" style={{ fontWeight: "bold" }}>
          إصدار سياسة عمولة جديد
        </Text>
        <Text role="caption" tone="muted">
          يُحفظ كل تعديل كإصدار مستقل. لا يُفعّل زر الحفظ حتى تصبح الصيغة المالية كاملة وصالحة.
        </Text>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            marginTop: "0.75rem",
          }}
        >
          <label>
            <Text role="caption">معرف السياسة</Text>
            <input
              aria-label="معرف سياسة العمولة"
              value={policy.policyId}
              onChange={(event) => setPolicy({ ...policy, policyId: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label>
            <Text role="caption">نوع العمولة</Text>
            <input
              aria-label="نوع العمولة"
              value={policy.commissionType}
              onChange={(event) => setPolicy({ ...policy, commissionType: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label>
            <Text role="caption">نوع المصدر</Text>
            <input
              aria-label="نوع مصدر العمولة"
              value={policy.sourceType}
              onChange={(event) => setPolicy({ ...policy, sourceType: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label>
            <Text role="caption">المستفيد</Text>
            <select
              aria-label="نوع مستفيد العمولة"
              value={policy.beneficiaryActorType}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  beneficiaryActorType: event.target.value as Jrn036RepresentativeActorType,
                })
              }
              style={inputStyle}
            >
              <option value="partner">شريك</option>
              <option value="captain">كابتن</option>
              <option value="field">ميداني</option>
            </select>
          </label>
          <label>
            <Text role="caption">طريقة الحساب</Text>
            <select
              aria-label="طريقة حساب العمولة"
              value={policy.calculationType}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  calculationType: event.target.value as "fixed" | "basis_points",
                })
              }
              style={inputStyle}
            >
              <option value="fixed">ثابت</option>
              <option value="basis_points">نقاط أساس</option>
            </select>
          </label>
          <label>
            <Text role="caption">القيمة الثابتة</Text>
            <input
              aria-label="قيمة العمولة الثابتة بالوحدات الصغرى"
              type="number"
              min={0}
              value={policy.fixedAmountMinorUnits}
              disabled={policy.calculationType !== "fixed"}
              onChange={(event) =>
                setPolicy({ ...policy, fixedAmountMinorUnits: Number(event.target.value) })
              }
              style={inputStyle}
            />
          </label>
          <label>
            <Text role="caption">نقاط الأساس</Text>
            <input
              aria-label="نقاط أساس العمولة"
              type="number"
              min={0}
              max={10000}
              value={policy.basisPoints}
              disabled={policy.calculationType !== "basis_points"}
              onChange={(event) =>
                setPolicy({ ...policy, basisPoints: Number(event.target.value) })
              }
              style={inputStyle}
            />
          </label>
          <label>
            <Text role="caption">الحد الأدنى</Text>
            <input
              aria-label="الحد الأدنى للعمولة"
              type="number"
              min={0}
              value={policy.minimumAmountMinorUnits}
              onChange={(event) =>
                setPolicy({ ...policy, minimumAmountMinorUnits: Number(event.target.value) })
              }
              style={inputStyle}
            />
          </label>
          <label>
            <Text role="caption">الحد الأعلى — اختياري</Text>
            <input
              aria-label="الحد الأعلى للعمولة"
              type="number"
              min={0}
              value={policy.maximumAmountMinorUnits ?? ""}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  maximumAmountMinorUnits:
                    event.target.value.trim() === "" ? null : Number(event.target.value),
                })
              }
              style={inputStyle}
            />
          </label>
          <label>
            <Text role="caption">العملة</Text>
            <input
              aria-label="عملة سياسة العمولة"
              value={policy.currency}
              onChange={(event) => setPolicy({ ...policy, currency: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label>
            <Text role="caption">الحالة</Text>
            <select
              aria-label="حالة سياسة العمولة"
              value={policy.status}
              onChange={(event) =>
                setPolicy({ ...policy, status: event.target.value as "active" | "inactive" })
              }
              style={inputStyle}
            >
              <option value="active">فعالة</option>
              <option value="inactive">غير فعالة</option>
            </select>
          </label>
          <label>
            <Text role="caption">سبب التغيير</Text>
            <input
              aria-label="سبب تغيير سياسة العمولة"
              value={policy.changeReason}
              onChange={(event) => setPolicy({ ...policy, changeReason: event.target.value })}
              style={inputStyle}
            />
          </label>
        </div>
        {policyError ? (
          <Text role="caption" tone="danger" style={{ marginTop: "0.75rem" }}>
            {policyError}
          </Text>
        ) : null}
        <div style={{ marginTop: "0.75rem" }}>
          <Button
            label={savingPolicy ? "جارٍ حفظ إصدار السياسة…" : "حفظ إصدار السياسة"}
            tone="primary"
            disabled={savingPolicy || policyError !== null}
            onPress={() => void savePolicy()}
          />
        </div>
      </Card>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginTop: "1rem",
        }}
      >
        {loading ? (
          <Text role="body" tone="muted">
            جارٍ تحميل العمولات…
          </Text>
        ) : null}
        {!loading && commissions.length === 0 ? (
          <Text role="body" tone="muted">
            لا توجد عمولات مسجلة.
          </Text>
        ) : null}
        {commissions.map((commission) => {
          const meta = STATUS_META[commission.status] ?? {
            label: commission.status,
            tone: "neutral" as const,
          };
          const disabled = busy !== null;
          return (
            <Card
              key={commission.id}
              style={{
                padding: "1rem",
                borderLeft: `4px solid ${
                  commission.status === "settled"
                    ? lightThemeColors.success
                    : commission.status === "rejected" || commission.status === "reversed"
                      ? lightThemeColors.danger
                      : lightThemeColors.warning
                }`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Text role="body" style={{ fontWeight: "bold" }}>
                      {commission.id}
                    </Text>
                    <Badge label={meta.label} tone={meta.tone} />
                  </div>
                  <Text role="caption">
                    {commission.beneficiaryActorType}: {commission.beneficiaryActorId}
                  </Text>
                  <Text role="caption">
                    المصدر: {commission.sourceType}/{commission.sourceId}
                  </Text>
                  <Text role="caption">
                    النوع: {commission.commissionType} · القيمة:{" "}
                    {formatMoney(commission.amountMinorUnits, commission.currency)}
                  </Text>
                  <Text role="caption">
                    السياسة: {commission.commissionPolicyId ?? "غير متاحة"} · آخر تحديث:{" "}
                    {commission.updatedAt || commission.createdAt}
                  </Text>
                  {commission.resolutionNote ? (
                    <Text role="caption" tone="danger">
                      السبب: {commission.resolutionNote}
                    </Text>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {commission.status === "pending" ? (
                    <Button
                      label="تأكيد"
                      tone="success"
                      disabled={disabled}
                      onPress={() => void run(commission, "confirm")}
                    />
                  ) : null}
                  {commission.status === "confirmed" ? (
                    <Button
                      label="تسوية"
                      tone="primary"
                      disabled={disabled}
                      onPress={() => void run(commission, "settle")}
                    />
                  ) : null}
                  {commission.status === "pending" ? (
                    <Button
                      label="رفض"
                      tone="danger"
                      disabled={disabled}
                      onPress={() => void run(commission, "reject")}
                    />
                  ) : null}
                  {commission.status === "settled" ? (
                    <Button
                      label="عكس"
                      tone="danger"
                      disabled={disabled}
                      onPress={() => void run(commission, "reverse")}
                    />
                  ) : null}
                  {commission.status === "pending" || commission.status === "confirmed" ? (
                    <Button
                      label="تعديل"
                      tone="secondary"
                      disabled={disabled}
                      onPress={() => void run(commission, "adjust")}
                    />
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
