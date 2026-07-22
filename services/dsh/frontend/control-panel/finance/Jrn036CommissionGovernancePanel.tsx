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
  const [selectedCommissionId, setSelectedCommissionId] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [operatorNote, setOperatorNote] = useState("");
  const [adjustedAmountMinorUnits, setAdjustedAmountMinorUnits] = useState("");
  const [actorType, setActorType] = useState<Jrn036RepresentativeActorType>("field");
  const [actorId, setActorId] = useState("");
  const [policy, setPolicy] = useState<Jrn036CommissionPolicyInput>({
    policyId: "",
    commissionType: "order_commission",
    sourceType: "order",
    calculationType: "percentage",
    basisPoints: 0,
    fixedAmountMinorUnits: 0,
    minimumAmountMinorUnits: 0,
    maximumAmountMinorUnits: null,
    currency: "YER",
    active: true,
    changeReason: "",
  });

  const loadCommissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = actorId.trim()
        ? `?actorType=${encodeURIComponent(actorType)}&actorId=${encodeURIComponent(actorId.trim())}`
        : "";
      const body = await request<{ readonly commissions?: readonly Jrn036Commission[] }>(
        `/dsh/control-panel/finance/jrn036/commissions${query}`,
      );
      const next = body.commissions ?? [];
      setCommissions(next);
      setSelectedCommissionId((current) => current || next[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل العمولات.");
    } finally {
      setLoading(false);
    }
  }, [actorId, actorType]);

  useEffect(() => {
    void loadCommissions();
  }, [loadCommissions]);

  const selectedCommission = useMemo(
    () => commissions.find((commission) => commission.id === selectedCommissionId) ?? null,
    [commissions, selectedCommissionId],
  );

  const execute = useCallback(
    async (commissionId: string, action: string, operation: () => Promise<Jrn036Commission>) => {
      setBusyAction({ commissionId, action });
      setError(null);
      setNotice(null);
      try {
        const updated = await operation();
        setCommissions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setNotice("تم تنفيذ الإجراء المالي المحكوم بنجاح.");
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "تعذر تنفيذ الإجراء المالي.");
      } finally {
        setBusyAction(null);
      }
    },
    [],
  );

  const submitPolicy = useCallback(async () => {
    const validationError = validatePolicy(policy);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await upsertJrn036CommissionPolicy(policy);
      setNotice("تم حفظ سياسة العمولة المحكومة.");
    } catch (policyError) {
      setError(policyError instanceof Error ? policyError.message : "تعذر حفظ سياسة العمولة.");
    }
  }, [policy]);

  return (
    <div dir="rtl" style={{ display: "grid", gap: "1rem" }}>
      <Card style={{ padding: "1rem" }}>
        <Text role="titleMd">حوكمة عمولات الرحلة 036</Text>
        <Text role="body" tone="muted">
          إدارة سياسات العمولة، التأكيد، التعديل، التسوية، الرفض والعكس عبر DSH مع بقاء الحقيقة المالية في WLT.
        </Text>
      </Card>

      {error ? <Card style={{ padding: "1rem" }}><Text role="body" tone="danger">{error}</Text></Card> : null}
      {notice ? <Card style={{ padding: "1rem" }}><Text role="body" tone="success">{notice}</Text></Card> : null}

      <Card style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <Text role="titleSm">فلترة العمولات حسب الممثل</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <select
            aria-label="نوع الممثل"
            value={actorType}
            onChange={(event) => setActorType(event.target.value as Jrn036RepresentativeActorType)}
            style={inputStyle}
          >
            <option value="field">مندوب ميداني</option>
            <option value="captain">كابتن</option>
          </select>
          <input
            aria-label="معرف الممثل"
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            placeholder="actor-id"
            style={inputStyle}
          />
          <Button label="تحديث" tone="secondary" onPress={() => void loadCommissions()} />
        </div>
      </Card>

      <Card style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <Text role="titleSm">قائمة العمولات</Text>
        {loading ? <Text role="body">جارٍ تحميل العمولات...</Text> : null}
        {!loading && commissions.length === 0 ? <Text role="body" tone="muted">لا توجد عمولات مطابقة.</Text> : null}
        {commissions.map((commission) => {
          const meta = STATUS_META[commission.status] ?? { label: commission.status, tone: "neutral" as const };
          return (
            <button
              key={commission.id}
              type="button"
              onClick={() => setSelectedCommissionId(commission.id)}
              style={{
                ...inputStyle,
                cursor: "pointer",
                textAlign: "right",
                borderColor: selectedCommissionId === commission.id ? lightThemeColors.primary : lightThemeColors.borderColor,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
                <span>{commission.actorType} · {commission.actorId}</span>
                <Badge label={meta.label} tone={meta.tone} />
              </div>
              <div>{formatMoney(commission.amountMinorUnits, commission.currency)}</div>
            </button>
          );
        })}
      </Card>

      {selectedCommission ? (
        <Card style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
          <Text role="titleSm">إجراءات العمولة المحددة</Text>
          <Text role="body">{selectedCommission.id} · {formatMoney(selectedCommission.amountMinorUnits, selectedCommission.currency)}</Text>
          <textarea
            aria-label="ملاحظة المشغل"
            value={operatorNote}
            onChange={(event) => setOperatorNote(event.target.value)}
            placeholder="ملاحظة الإجراء"
            style={{ ...inputStyle, minHeight: "5rem" }}
          />
          <input
            aria-label="المبلغ المعدل بالوحدات الصغرى"
            value={adjustedAmountMinorUnits}
            onChange={(event) => setAdjustedAmountMinorUnits(event.target.value)}
            placeholder="adjusted amount minor units"
            inputMode="numeric"
            style={inputStyle}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Button
              label="تأكيد"
              tone="primary"
              disabled={Boolean(busyAction)}
              onPress={() => void execute(selectedCommission.id, "confirm", () => confirmJrn036Commission(selectedCommission.id, operatorNote))}
            />
            <Button
              label="تعديل"
              tone="secondary"
              disabled={Boolean(busyAction) || !Number.isSafeInteger(Number(adjustedAmountMinorUnits))}
              onPress={() => void execute(selectedCommission.id, "adjust", () => adjustJrn036Commission(selectedCommission.id, Number(adjustedAmountMinorUnits), operatorNote))}
            />
            <Button
              label="تسوية"
              tone="secondary"
              disabled={Boolean(busyAction)}
              onPress={() => void execute(selectedCommission.id, "settle", () => settleJrn036Commission(selectedCommission.id, operatorNote))}
            />
            <Button
              label="رفض"
              tone="danger"
              disabled={Boolean(busyAction)}
              onPress={() => void execute(selectedCommission.id, "reject", () => rejectJrn036Commission(selectedCommission.id, operatorNote))}
            />
            <Button
              label="عكس"
              tone="danger"
              disabled={Boolean(busyAction)}
              onPress={() => void execute(selectedCommission.id, "reverse", () => reverseJrn036Commission(selectedCommission.id, operatorNote))}
            />
          </div>
        </Card>
      ) : null}

      <Card style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <Text role="titleSm">سياسة العمولة</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.75rem" }}>
          <input aria-label="معرف السياسة" value={policy.policyId} onChange={(event) => setPolicy((current) => ({ ...current, policyId: event.target.value }))} placeholder="policy-id" style={inputStyle} />
          <input aria-label="نوع العمولة" value={policy.commissionType} onChange={(event) => setPolicy((current) => ({ ...current, commissionType: event.target.value }))} placeholder="commission type" style={inputStyle} />
          <input aria-label="نوع المصدر" value={policy.sourceType} onChange={(event) => setPolicy((current) => ({ ...current, sourceType: event.target.value }))} placeholder="source type" style={inputStyle} />
          <select aria-label="نوع الحساب" value={policy.calculationType} onChange={(event) => setPolicy((current) => ({ ...current, calculationType: event.target.value as Jrn036CommissionPolicyInput["calculationType"] }))} style={inputStyle}>
            <option value="percentage">نسبة</option>
            <option value="fixed">ثابت</option>
          </select>
          <input aria-label="نقاط الأساس" type="number" value={policy.basisPoints} onChange={(event) => setPolicy((current) => ({ ...current, basisPoints: Number(event.target.value) }))} style={inputStyle} />
          <input aria-label="القيمة الثابتة" type="number" value={policy.fixedAmountMinorUnits} onChange={(event) => setPolicy((current) => ({ ...current, fixedAmountMinorUnits: Number(event.target.value) }))} style={inputStyle} />
          <input aria-label="الحد الأدنى" type="number" value={policy.minimumAmountMinorUnits} onChange={(event) => setPolicy((current) => ({ ...current, minimumAmountMinorUnits: Number(event.target.value) }))} style={inputStyle} />
          <input aria-label="الحد الأعلى" type="number" value={policy.maximumAmountMinorUnits ?? ""} onChange={(event) => setPolicy((current) => ({ ...current, maximumAmountMinorUnits: event.target.value ? Number(event.target.value) : null }))} style={inputStyle} />
          <input aria-label="العملة" value={policy.currency} onChange={(event) => setPolicy((current) => ({ ...current, currency: event.target.value }))} style={inputStyle} />
          <input aria-label="سبب التغيير" value={policy.changeReason} onChange={(event) => setPolicy((current) => ({ ...current, changeReason: event.target.value }))} placeholder="change reason" style={inputStyle} />
        </div>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input type="checkbox" checked={policy.active} onChange={(event) => setPolicy((current) => ({ ...current, active: event.target.checked }))} />
          <span>السياسة فعالة</span>
        </label>
        <Button label="حفظ السياسة" tone="primary" onPress={() => void submitPolicy()} />
      </Card>
    </div>
  );
}
