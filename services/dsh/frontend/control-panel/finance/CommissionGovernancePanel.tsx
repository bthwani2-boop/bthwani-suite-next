"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Text } from "@bthwani/ui-kit";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import { CpBadge, CpButton, CpSelect, CpTextInput } from "@bthwani/control-panel/components";
import { resolveDshApiBaseUrl } from '@bthwani/wlt/dsh';
import { createDshHttpClient } from '@bthwani/wlt/dsh';
import {
  adjustCommission,
  confirmCommission,
  rejectCommission,
  reverseCommission,
  settleCommission,
  upsertCommissionPolicy,
  type Commission,
  type CommissionPolicyInput,
  type RepresentativeActorType,
} from '@bthwani/wlt/dsh';

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "control-panel-commission-governance",
);

type BusyAction = { readonly commissionId: string; readonly action: string } | null;

const STATUS_META: Record<string, { readonly label: string; readonly tone: CpBadgeTone }> = {
  pending: { label: "قيد المراجعة", tone: "warning" },
  confirmed: { label: "مؤكدة", tone: "success" },
  settled: { label: "مسوّاة", tone: "success" },
  rejected: { label: "مرفوضة", tone: "danger" },
  reversed: { label: "معكوسة", tone: "danger" },
};

const BENEFICIARY_OPTIONS = [
  { value: "partner", label: "شريك" },
  { value: "captain", label: "كابتن" },
  { value: "field", label: "ميداني" },
] as const;

const CALCULATION_OPTIONS = [
  { value: "fixed", label: "ثابت" },
  { value: "basis_points", label: "نقاط أساس" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "فعالة" },
  { value: "inactive", label: "غير فعالة" },
] as const;

function formatMoney(amountMinorUnits: number, currency: string): string {
  return `${(amountMinorUnits / 100).toLocaleString("ar-YE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function validatePolicy(policy: CommissionPolicyInput): string | null {
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

export function CommissionGovernancePanel() {
  const [commissions, setCommissions] = useState<readonly Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policy, setPolicy] = useState<CommissionPolicyInput>({
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
      const response = await request<{ readonly commissions: Commission[] }>(
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
      commission: Commission,
      action: "confirm" | "settle" | "reject" | "reverse" | "adjust",
    ) => {
      setBusy({ commissionId: commission.id, action });
      setError(null);
      setNotice(null);
      try {
        if (action === "confirm") await confirmCommission(commission.id);
        if (action === "settle") await settleCommission(commission.id);
        if (action === "reject") {
          const reason = window.prompt("سبب رفض العمولة:")?.trim();
          if (!reason) return;
          await rejectCommission(commission.id, reason);
        }
        if (action === "reverse") {
          const reason = window.prompt("سبب عكس العمولة المسوّاة:")?.trim();
          if (!reason) return;
          await reverseCommission(commission.id, reason);
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
          await adjustCommission(commission.id, deltaMinorUnits, reason);
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
      await upsertCommissionPolicy({
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
          <Text role="titleMd">حوكمة العمولات</Text>
          <Text role="body" tone="muted">
            WLT يحسب القيمة من الدليل وإصدار السياسة. تعرض القائمة آخر 100 سجل حاكم دون حساب محلي.
          </Text>
        </div>
        <CpButton variant="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? "جارٍ التحديث…" : "تحديث"}
        </CpButton>
      </div>

      {error ? (
        <Card style={{ padding: "0.75rem", marginTop: "1rem" }}>
          <Text role="body" tone="danger">
            {error}
          </Text>
        </Card>
      ) : null}
      {notice ? (
        <Card style={{ padding: "0.75rem", marginTop: "1rem" }}>
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
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">معرف السياسة</Text>
            <CpTextInput
              aria-label="معرف سياسة العمولة"
              value={policy.policyId}
              onChange={(value) => setPolicy({ ...policy, policyId: value })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">نوع العمولة</Text>
            <CpTextInput
              aria-label="نوع العمولة"
              value={policy.commissionType}
              onChange={(value) => setPolicy({ ...policy, commissionType: value })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">نوع المصدر</Text>
            <CpTextInput
              aria-label="نوع مصدر العمولة"
              value={policy.sourceType}
              onChange={(value) => setPolicy({ ...policy, sourceType: value })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">المستفيد</Text>
            <CpSelect
              aria-label="نوع مستفيد العمولة"
              value={policy.beneficiaryActorType}
              options={BENEFICIARY_OPTIONS}
              onChange={(value) =>
                setPolicy({
                  ...policy,
                  beneficiaryActorType: value as RepresentativeActorType,
                })
              }
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">طريقة الحساب</Text>
            <CpSelect
              aria-label="طريقة حساب العمولة"
              value={policy.calculationType}
              options={CALCULATION_OPTIONS}
              onChange={(value) =>
                setPolicy({
                  ...policy,
                  calculationType: value as "fixed" | "basis_points",
                })
              }
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">القيمة الثابتة</Text>
            <CpTextInput
              aria-label="قيمة العمولة الثابتة بالوحدات الصغرى"
              type="text"
              value={String(policy.fixedAmountMinorUnits)}
              disabled={policy.calculationType !== "fixed"}
              onChange={(value) =>
                setPolicy({ ...policy, fixedAmountMinorUnits: Number(value) || 0 })
              }
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">نقاط الأساس</Text>
            <CpTextInput
              aria-label="نقاط أساس العمولة"
              type="text"
              value={String(policy.basisPoints)}
              disabled={policy.calculationType !== "basis_points"}
              onChange={(value) =>
                setPolicy({ ...policy, basisPoints: Number(value) || 0 })
              }
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">الحد الأدنى</Text>
            <CpTextInput
              aria-label="الحد الأدنى للعمولة"
              type="text"
              value={String(policy.minimumAmountMinorUnits)}
              onChange={(value) =>
                setPolicy({ ...policy, minimumAmountMinorUnits: Number(value) || 0 })
              }
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">الحد الأعلى — اختياري</Text>
            <CpTextInput
              aria-label="الحد الأعلى للعمولة"
              type="text"
              value={policy.maximumAmountMinorUnits === null || policy.maximumAmountMinorUnits === undefined ? "" : String(policy.maximumAmountMinorUnits)}
              onChange={(value) =>
                setPolicy({
                  ...policy,
                  maximumAmountMinorUnits: value.trim() === "" ? null : Number(value) || 0,
                })
              }
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">العملة</Text>
            <CpTextInput
              aria-label="عملة سياسة العمولة"
              value={policy.currency}
              onChange={(value) => setPolicy({ ...policy, currency: value })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">الحالة</Text>
            <CpSelect
              aria-label="حالة سياسة العمولة"
              value={policy.status}
              options={STATUS_OPTIONS}
              onChange={(value) => setPolicy({ ...policy, status: value as "active" | "inactive" })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Text role="caption">سبب التغيير</Text>
            <CpTextInput
              aria-label="سبب تغيير سياسة العمولة"
              value={policy.changeReason}
              onChange={(value) => setPolicy({ ...policy, changeReason: value })}
            />
          </label>
        </div>
        {policyError ? (
          <Text role="caption" tone="danger" style={{ marginTop: "0.75rem" }}>
            {policyError}
          </Text>
        ) : null}
        <div style={{ marginTop: "0.75rem" }}>
          <CpButton variant="primary" disabled={savingPolicy || policyError !== null} onClick={() => void savePolicy()}>
            {savingPolicy ? "جارٍ حفظ إصدار السياسة…" : "حفظ إصدار السياسة"}
          </CpButton>
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
            <Card key={commission.id} style={{ padding: "1rem" }}>
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
                    <CpBadge tone={meta.tone}>{meta.label}</CpBadge>
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
                    <CpButton variant="primary" disabled={disabled} onClick={() => void run(commission, "confirm")}>
                      تأكيد
                    </CpButton>
                  ) : null}
                  {commission.status === "confirmed" ? (
                    <CpButton variant="primary" disabled={disabled} onClick={() => void run(commission, "settle")}>
                      تسوية
                    </CpButton>
                  ) : null}
                  {commission.status === "pending" ? (
                    <CpButton variant="danger" disabled={disabled} onClick={() => void run(commission, "reject")}>
                      رفض
                    </CpButton>
                  ) : null}
                  {commission.status === "settled" ? (
                    <CpButton variant="danger" disabled={disabled} onClick={() => void run(commission, "reverse")}>
                      عكس
                    </CpButton>
                  ) : null}
                  {commission.status === "pending" || commission.status === "confirmed" ? (
                    <CpButton variant="secondary" disabled={disabled} onClick={() => void run(commission, "adjust")}>
                      تعديل
                    </CpButton>
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
