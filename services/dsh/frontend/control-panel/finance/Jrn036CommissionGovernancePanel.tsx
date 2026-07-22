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

const STATUS_META: Record<string, { readonly label: string; readonly tone: "neutral" | "success" | "warning" | "danger" }> = {
  pending: { label: "قيد المراجعة", tone: "warning" },
  confirmed: { label: "مؤكدة", tone: "success" },
  settled: { label: "مسوّاة", tone: "success" },
  rejected: { label: "مرفوضة", tone: "danger" },
  reversed: { label: "معكوسة", tone: "danger" },
};

function formatMoney(amountMinorUnits: number, currency: string): string {
  return `${(amountMinorUnits / 100).toLocaleString("ar-YE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function buildCommissionQuery(filters: {
  readonly actorId: string;
  readonly actorType: string;
  readonly sourceId: string;
  readonly status: string;
}): string {
  const query = new URLSearchParams();
  if (filters.actorId.trim()) query.set("beneficiaryActorId", filters.actorId.trim());
  if (filters.actorType.trim()) query.set("beneficiaryActorType", filters.actorType.trim());
  if (filters.sourceId.trim()) query.set("sourceId", filters.sourceId.trim());
  if (filters.status.trim()) query.set("status", filters.status.trim());
  query.set("limit", "100");
  return query.toString();
}

export function Jrn036CommissionGovernancePanel() {
  const [commissions, setCommissions] = useState<readonly Jrn036Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [actorId, setActorId] = useState("");
  const [actorType, setActorType] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [status, setStatus] = useState("");
  const [policy, setPolicy] = useState<Jrn036CommissionPolicyInput>({
    policyId: "delivery-captain-default",
    commissionType: "delivery_fee",
    sourceType: "delivery",
    beneficiaryActorType: "captain",
    calculationType: "fixed",
    fixedAmountMinorUnits: 0,
    basisPoints: 0,
    minimumAmountMinorUnits: 0,
    maximumAmountMinorUnits: null,
    currency: "YER",
    status: "active",
    changeReason: "",
  });

  const queryString = useMemo(
    () => buildCommissionQuery({ actorId, actorType, sourceId, status }),
    [actorId, actorType, sourceId, status],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await request<{ readonly commissions: Jrn036Commission[] }>(
        `/dsh/control-panel/finance/commissions?${queryString}`,
      );
      setCommissions(response.commissions ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل العمولات.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(async (
    commission: Jrn036Commission,
    action: "confirm" | "settle" | "reject" | "reverse" | "adjust",
  ) => {
    setBusy({ commissionId: commission.id, action });
    setError(null);
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
        const rawDelta = window.prompt("قيمة التعديل بالوحدات الصغرى؛ استخدم قيمة سالبة للخصم:")?.trim();
        const reason = window.prompt("سبب التعديل:")?.trim();
        const deltaMinorUnits = Number(rawDelta);
        if (!reason || !Number.isSafeInteger(deltaMinorUnits) || deltaMinorUnits === 0) return;
        await adjustJrn036Commission(commission.id, deltaMinorUnits, reason);
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تنفيذ الإجراء المالي.");
    } finally {
      setBusy(null);
    }
  }, [load]);

  const savePolicy = useCallback(async () => {
    setError(null);
    try {
      if (!policy.changeReason.trim()) {
        setError("سبب تغيير السياسة مطلوب.");
        return;
      }
      await upsertJrn036CommissionPolicy(policy);
      setPolicy((current) => ({ ...current, changeReason: "" }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ سياسة العمولة.");
    }
  }, [load, policy]);

  return (
    <Card style={{ padding: "1.5rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <Text role="titleMd">حوكمة العمولات — JRN-036</Text>
          <Text role="body" tone="muted">
            WLT يحسب القيمة من الدليل والسياسة. DSH يمرر الهوية التشغيلية فقط.
          </Text>
        </div>
        <Button label={loading ? "جارٍ التحديث…" : "تحديث"} tone="secondary" disabled={loading} onPress={() => void load()} />
      </div>

      {error ? (
        <Card style={{ padding: "0.75rem", marginTop: "1rem", borderLeft: `4px solid ${lightThemeColors.danger}` }}>
          <Text role="body" tone="danger">{error}</Text>
        </Card>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
        <label><Text role="caption">معرف المستفيد</Text><input value={actorId} onChange={(event) => setActorId(event.target.value)} style={{ width: "100%", padding: "0.65rem" }} /></label>
        <label><Text role="caption">نوع المستفيد</Text><select value={actorType} onChange={(event) => setActorType(event.target.value)} style={{ width: "100%", padding: "0.65rem" }}><option value="">الكل</option><option value="partner">شريك</option><option value="captain">كابتن</option><option value="field">ميداني</option></select></label>
        <label><Text role="caption">مرجع المصدر</Text><input value={sourceId} onChange={(event) => setSourceId(event.target.value)} style={{ width: "100%", padding: "0.65rem" }} /></label>
        <label><Text role="caption">الحالة</Text><select value={status} onChange={(event) => setStatus(event.target.value)} style={{ width: "100%", padding: "0.65rem" }}><option value="">الكل</option><option value="pending">قيد المراجعة</option><option value="confirmed">مؤكدة</option><option value="settled">مسوّاة</option><option value="rejected">مرفوضة</option><option value="reversed">معكوسة</option></select></label>
      </div>

      <Card style={{ padding: "1rem", marginTop: "1rem", background: lightThemeColors.surfaceColor }}>
        <Text role="body" style={{ fontWeight: "bold" }}>إصدار سياسة عمولة جديد</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "0.75rem" }}>
          <label><Text role="caption">معرف السياسة</Text><input value={policy.policyId} onChange={(event) => setPolicy({ ...policy, policyId: event.target.value })} style={{ width: "100%", padding: "0.65rem" }} /></label>
          <label><Text role="caption">نوع العمولة</Text><input value={policy.commissionType} onChange={(event) => setPolicy({ ...policy, commissionType: event.target.value })} style={{ width: "100%", padding: "0.65rem" }} /></label>
          <label><Text role="caption">نوع المصدر</Text><input value={policy.sourceType} onChange={(event) => setPolicy({ ...policy, sourceType: event.target.value })} style={{ width: "100%", padding: "0.65rem" }} /></label>
          <label><Text role="caption">المستفيد</Text><select value={policy.beneficiaryActorType} onChange={(event) => setPolicy({ ...policy, beneficiaryActorType: event.target.value as Jrn036RepresentativeActorType })} style={{ width: "100%", padding: "0.65rem" }}><option value="partner">شريك</option><option value="captain">كابتن</option><option value="field">ميداني</option></select></label>
          <label><Text role="caption">طريقة الحساب</Text><select value={policy.calculationType} onChange={(event) => setPolicy({ ...policy, calculationType: event.target.value as "fixed" | "basis_points" })} style={{ width: "100%", padding: "0.65rem" }}><option value="fixed">ثابت</option><option value="basis_points">نقاط أساس</option></select></label>
          <label><Text role="caption">القيمة الثابتة</Text><input type="number" value={policy.fixedAmountMinorUnits} onChange={(event) => setPolicy({ ...policy, fixedAmountMinorUnits: Number(event.target.value) })} style={{ width: "100%", padding: "0.65rem" }} /></label>
          <label><Text role="caption">نقاط الأساس</Text><input type="number" value={policy.basisPoints} onChange={(event) => setPolicy({ ...policy, basisPoints: Number(event.target.value) })} style={{ width: "100%", padding: "0.65rem" }} /></label>
          <label><Text role="caption">الحد الأدنى</Text><input type="number" value={policy.minimumAmountMinorUnits} onChange={(event) => setPolicy({ ...policy, minimumAmountMinorUnits: Number(event.target.value) })} style={{ width: "100%", padding: "0.65rem" }} /></label>
          <label><Text role="caption">سبب التغيير</Text><input value={policy.changeReason} onChange={(event) => setPolicy({ ...policy, changeReason: event.target.value })} style={{ width: "100%", padding: "0.65rem" }} /></label>
        </div>
        <div style={{ marginTop: "0.75rem" }}><Button label="حفظ إصدار السياسة" tone="primary" onPress={() => void savePolicy()} /></div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
        {loading ? <Text role="body" tone="muted">جارٍ تحميل العمولات…</Text> : null}
        {!loading && commissions.length === 0 ? <Text role="body" tone="muted">لا توجد عمولات مطابقة.</Text> : null}
        {commissions.map((commission) => {
          const meta = STATUS_META[commission.status] ?? { label: commission.status, tone: "neutral" as const };
          const disabled = busy !== null;
          return (
            <Card key={commission.id} style={{ padding: "1rem", borderLeft: `4px solid ${commission.status === "settled" ? lightThemeColors.success : lightThemeColors.warning}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}><Text role="body" style={{ fontWeight: "bold" }}>{commission.id}</Text><Badge label={meta.label} tone={meta.tone} /></div>
                  <Text role="caption">{commission.beneficiaryActorType}: {commission.beneficiaryActorId}</Text>
                  <Text role="caption">المصدر: {commission.sourceType}/{commission.sourceId}</Text>
                  <Text role="caption">القيمة: {formatMoney(commission.amountMinorUnits, commission.currency)} · السياسة: {commission.commissionPolicyId ?? "غير متاحة"}</Text>
                  {commission.resolutionNote ? <Text role="caption" tone="danger">السبب: {commission.resolutionNote}</Text> : null}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {commission.status === "pending" ? <Button label="تأكيد" tone="success" disabled={disabled} onPress={() => void run(commission, "confirm")} /> : null}
                  {commission.status === "confirmed" ? <Button label="تسوية" tone="primary" disabled={disabled} onPress={() => void run(commission, "settle")} /> : null}
                  {commission.status === "pending" ? <Button label="رفض" tone="danger" disabled={disabled} onPress={() => void run(commission, "reject")} /> : null}
                  {commission.status === "settled" ? <Button label="عكس" tone="danger" disabled={disabled} onPress={() => void run(commission, "reverse")} /> : null}
                  {(commission.status === "pending" || commission.status === "confirmed") ? <Button label="تعديل" tone="secondary" disabled={disabled} onPress={() => void run(commission, "adjust")} /> : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
