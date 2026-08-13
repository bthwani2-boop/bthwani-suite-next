"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CpBadge, CpButton, CpSelect, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import {
  cancelFieldOnboardingAssignment,
  createFieldOnboardingAssignment,
  listOperatorFieldOnboardingAssignments,
  reassignFieldOnboardingAssignment,
  type FieldOnboardingAssignment,
} from "../../../shared/field-assignment";
import { listFieldAgents, type FieldAgent } from "../../../shared/workforce";

const STATUS_LABELS: Record<FieldOnboardingAssignment["status"], string> = {
  assigned: "مسندة",
  in_progress: "قيد التنفيذ",
  draft_linked: "مرتبطة بمسودة",
  cancelled: "ملغاة",
};

export function FieldAssignmentWorkspace() {
  const [agents, setAgents] = useState<readonly FieldAgent[]>([]);
  const [assignments, setAssignments] = useState<readonly FieldOnboardingAssignment[]>([]);
  const [selectedActorId, setSelectedActorId] = useState("");
  const [storeNameHint, setStoreNameHint] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [addressHint, setAddressHint] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [fieldAgents, items] = await Promise.all([
        listFieldAgents({ status: "active", limit: 100 }),
        listOperatorFieldOnboardingAssignments(),
      ]);
      setAgents(fieldAgents.filter((agent) => agent.engagementStatus === "active"));
      setAssignments(items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل إسنادات الميدانيين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const agentOptions = useMemo(() => [
    { value: "", label: "اختر الميداني من Workforce" },
    ...agents.map((agent) => ({ value: agent.actorId, label: `${agent.fullNameAr} · ${agent.workforceCode}` })),
  ], [agents]);

  async function createAssignment() {
    if (!selectedActorId || !storeNameHint.trim() || (!phoneHint.trim() && !addressHint.trim())) return;
    setSubmitting(true);
    setError(null);
    try {
      const input = {
        fieldActorId: selectedActorId,
        storeNameHint: storeNameHint.trim(),
        ...(phoneHint.trim() ? { phoneHint: phoneHint.trim() } : {}),
        ...(addressHint.trim() ? { addressHint: addressHint.trim() } : {}),
      };
      await createFieldOnboardingAssignment(input);
      setStoreNameHint("");
      setPhoneHint("");
      setAddressHint("");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء الإسناد");
    } finally {
      setSubmitting(false);
    }
  }

  async function reassign(item: FieldOnboardingAssignment) {
    if (!reassigningId || reassigningId === item.fieldActorId || item.status === "draft_linked" || item.status === "cancelled") return;
    setSubmitting(true);
    try {
      await reassignFieldOnboardingAssignment(item.id, { expectedVersion: item.version, fieldActorId: reassigningId, reason: "إعادة إسناد من قسم الشركاء" });
      setReassigningId(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إعادة الإسناد");
    } finally { setSubmitting(false); }
  }

  async function cancel(item: FieldOnboardingAssignment) {
    if (item.status === "draft_linked" || item.status === "cancelled") return;
    setSubmitting(true);
    try {
      await cancelFieldOnboardingAssignment(item.id, { expectedVersion: item.version, reason: "إلغاء إسناد onboarding" });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إلغاء الإسناد");
    } finally { setSubmitting(false); }
  }

  if (loading) return <CpStatePanel role="status" title="جاري تحميل إسنادات الميدانيين" description="يتم جلب Workforce assignments والحالة التشغيلية من DSH." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <section style={{ padding: 24, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 16, background: "var(--bthwani-control-panel-surface)", display: "flex", flexDirection: "column", gap: 12 }}>
        <Text role="titleMd">إسناد مهمة onboarding للميداني</Text>
        <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>اختر موظفًا نشطًا من Workforce وأدخل اسم المتجر مع الهاتف أو العنوان. لا ينشئ الإسناد متجرًا أو نطاق تشغيل.</Text>
        <CpSelect value={selectedActorId} onChange={setSelectedActorId} options={agentOptions} aria-label="الميداني" />
        <CpTextInput value={storeNameHint} onChange={setStoreNameHint} placeholder="اسم المتجر" aria-label="اسم المتجر" />
        <CpTextInput value={phoneHint} onChange={setPhoneHint} placeholder="هاتف المتجر (اختياري إذا وُجد العنوان)" aria-label="هاتف المتجر" />
        <CpTextInput value={addressHint} onChange={setAddressHint} placeholder="العنوان أو الموقع النصي (اختياري إذا وُجد الهاتف)" aria-label="عنوان المتجر" />
        <CpButton variant="primary" disabled={submitting || !selectedActorId || !storeNameHint.trim() || (!phoneHint.trim() && !addressHint.trim())} onClick={() => void createAssignment()}>إنشاء إسناد</CpButton>
      </section>

      {error ? <CpStatePanel role="alert" title="تعذر تنفيذ العملية" description={error} /> : null}
      {assignments.length === 0 ? <CpStatePanel role="status" title="لا توجد إسنادات" description="أنشئ مهمة onboarding من النموذج أعلاه." /> : assignments.map((item) => (
        <section key={item.id} style={{ padding: 20, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div><Text role="titleSm">{item.storeNameHint}</Text><Text role="bodySm">الميداني: {agents.find((agent) => agent.actorId === item.fieldActorId)?.fullNameAr ?? item.fieldActorId}</Text></div>
            <CpBadge tone={item.status === "cancelled" ? "danger" : item.status === "draft_linked" ? "success" : "info"}>{STATUS_LABELS[item.status]}</CpBadge>
          </div>
          <Text role="bodySm">{item.phoneHint || item.addressHint}</Text>
          {item.status !== "draft_linked" && item.status !== "cancelled" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CpSelect value={reassigningId ?? item.fieldActorId} onChange={setReassigningId} options={agentOptions.filter((option) => option.value !== "")} aria-label="إعادة إسناد الميداني" />
              <CpButton disabled={submitting || !reassigningId || reassigningId === item.fieldActorId} onClick={() => void reassign(item)}>إعادة إسناد</CpButton>
              <CpButton variant="danger" disabled={submitting} onClick={() => void cancel(item)}>إلغاء</CpButton>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
