"use client";

import React from "react";
import {
  CpButton,
  CpMutedInline,
  CpStatePanel,
  CpStateView,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import {
  createProviderIncident,
  getProviderOperationalCore,
  listProviderIncidents,
  promoteCaptainToBasic,
  transitionProviderIncident,
  type OperationalCoreResponse,
  type ProviderIncident,
  type ProviderIncidentStatus,
} from "../../shared/workforce";

const selectStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--bthwani-control-panel-border)",
  background: "var(--bthwani-control-panel-surface)",
  color: "var(--bthwani-control-panel-text)",
};

const INCIDENT_STATUS_LABELS: Record<ProviderIncidentStatus, string> = {
  reported: "مسجلة",
  under_review: "تحت المراجعة",
  provider_notified: "تم إشعار مقدم الخدمة",
  appeal_window: "نافذة الاعتراض",
  approved: "معتمدة",
  rejected: "مرفوضة",
  financial_action_posted: "رُحّل الإجراء المالي",
  closed: "مغلقة",
  reversed: "معكوسة",
};

const NEXT_INCIDENT_STATUSES: Record<ProviderIncidentStatus, readonly ProviderIncidentStatus[]> = {
  reported: ["under_review", "provider_notified", "rejected"],
  under_review: ["provider_notified", "appeal_window", "approved", "rejected"],
  provider_notified: ["appeal_window", "under_review", "approved", "rejected"],
  appeal_window: ["under_review", "approved", "rejected"],
  approved: ["under_review", "financial_action_posted", "closed", "reversed"],
  rejected: ["closed"],
  financial_action_posted: ["closed", "reversed"],
  closed: [],
  reversed: ["closed"],
};

function parseEvidenceRefs(value: string): readonly string[] {
  return Array.from(new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)));
}

function Section(props: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 12 }}>
      <Text role="titleSm">{props.title}</Text>
      {props.children}
    </div>
  );
}

export type ProviderOperationalEnforcementPanelProps = {
  readonly actorId: string;
  readonly providerKind: "field" | "captain";
  readonly canManage: boolean;
};

export function ProviderOperationalEnforcementPanel({ actorId, providerKind, canManage }: ProviderOperationalEnforcementPanelProps) {
  const [core, setCore] = React.useState<OperationalCoreResponse | null>(null);
  const [incidents, setIncidents] = React.useState<readonly ProviderIncident[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [completedDeliveries, setCompletedDeliveries] = React.useState("");
  const [completionRate, setCompletionRate] = React.useState("");
  const [promotionEvidence, setPromotionEvidence] = React.useState("");
  const [promotionNote, setPromotionNote] = React.useState("");

  const [incidentCode, setIncidentCode] = React.useState("");
  const [incidentDescription, setIncidentDescription] = React.useState("");
  const [incidentSeverity, setIncidentSeverity] = React.useState<"minor" | "major" | "critical">("minor");
  const [incidentPolicyId, setIncidentPolicyId] = React.useState("");
  const [incidentPenalty, setIncidentPenalty] = React.useState("0");
  const [incidentEvidence, setIncidentEvidence] = React.useState("");

  const [selectedIncidentId, setSelectedIncidentId] = React.useState<string | null>(null);
  const [nextStatus, setNextStatus] = React.useState<ProviderIncidentStatus | "">("");
  const [resolutionNote, setResolutionNote] = React.useState("");
  const [wltReference, setWltReference] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [coreResult, incidentResult] = await Promise.all([
        getProviderOperationalCore(providerKind, actorId),
        listProviderIncidents(actorId),
      ]);
      setCore(coreResult);
      setIncidents(incidentResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل القرارات التشغيلية.");
    } finally {
      setLoading(false);
    }
  }, [actorId, providerKind]);

  React.useEffect(() => { void load(); }, [load]);

  const promote = async () => {
    const deliveries = Number(completedDeliveries);
    const ratePercent = Number(completionRate);
    const evidence = parseEvidenceRefs(promotionEvidence);
    if (!Number.isSafeInteger(deliveries) || deliveries <= 0 || !Number.isFinite(ratePercent) || ratePercent <= 0 || ratePercent > 100 || evidence.length === 0 || promotionNote.trim().length < 3) {
      setError("أدخل رحلات مكتملة ونسبة أداء صحيحة ودليلًا وملاحظة قرار واضحة.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await promoteCaptainToBasic(actorId, {
        completedDeliveries: deliveries,
        completionRateBasisPoints: Math.round(ratePercent * 100),
        severeIncidentFree: true,
        evidenceMediaRefs: evidence,
        decisionNote: promotionNote.trim(),
      });
      setCore((current) => current ? { ...current, operationalCore: result.operationalCore } : current);
      setSuccess("تم اعتماد انتقال الكابتن من Joker إلى Basic بسجل أدلة.");
      setCompletedDeliveries("");
      setCompletionRate("");
      setPromotionEvidence("");
      setPromotionNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر اعتماد تصنيف الكابتن.");
    } finally {
      setBusy(false);
    }
  };

  const createIncident = async () => {
    const penalty = Number(incidentPenalty);
    const evidence = parseEvidenceRefs(incidentEvidence);
    if (incidentCode.trim().length < 2 || incidentDescription.trim().length < 3 || !Number.isSafeInteger(penalty) || penalty < 0) {
      setError("أدخل رمز المخالفة ووصفها وقيمة مقترحة صحيحة.");
      return;
    }
    if (penalty > 0 && (incidentPolicyId.trim() === "" || evidence.length === 0)) {
      setError("المخالفة ذات الخصم المالي تحتاج سياسة ودليلًا قبل تسجيلها.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const incident = await createProviderIncident({
        actorId,
        incidentCode: incidentCode.trim(),
        description: incidentDescription.trim(),
        evidenceMediaRefs: evidence,
        severity: incidentSeverity,
        policyId: incidentPolicyId.trim() || undefined,
        proposedPenaltyMinorUnits: penalty,
        currency: "YER",
      });
      setIncidents((current) => [incident, ...current]);
      setSuccess("تم تسجيل المخالفة كقضية، ولم ينفذ أي خصم مالي.");
      setIncidentCode("");
      setIncidentDescription("");
      setIncidentPolicyId("");
      setIncidentPenalty("0");
      setIncidentEvidence("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تسجيل المخالفة.");
    } finally {
      setBusy(false);
    }
  };

  const selectIncident = (incident: ProviderIncident) => {
    const status = incident.status as ProviderIncidentStatus;
    setSelectedIncidentId(incident.id);
    setNextStatus(NEXT_INCIDENT_STATUSES[status]?.[0] ?? "");
    setResolutionNote("");
    setWltReference("");
  };

  const applyIncidentTransition = async () => {
    if (!selectedIncidentId || !nextStatus) return;
    const needsResolution = ["approved", "rejected", "financial_action_posted", "closed", "reversed"].includes(nextStatus);
    if (needsResolution && resolutionNote.trim().length < 3) {
      setError("اكتب سبب القرار قبل تنفيذ الانتقال.");
      return;
    }
    if (nextStatus === "financial_action_posted" && wltReference.trim() === "") {
      setError("لا يمكن تسجيل الخصم المالي دون مرجع قيد WLT.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await transitionProviderIncident(selectedIncidentId, {
        toStatus: nextStatus,
        resolutionNote: resolutionNote.trim() || undefined,
        wltLedgerReference: wltReference.trim() || undefined,
      });
      setIncidents((current) => current.map((incident) => incident.id === result.incident.id ? result.incident : incident));
      setSelectedIncidentId(null);
      setNextStatus("");
      setResolutionNote("");
      setWltReference("");
      setSuccess("تم حفظ قرار المخالفة وسجل الانتقال.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تغيير حالة المخالفة.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <CpStateView kind="loading" title="جارٍ تحميل القرارات التشغيلية…" />;

  const classification = core?.operationalCore.captain?.classification;
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CpMutedInline>
        {canManage
          ? "هذه الأفعال محكومة من الخادم وتُسجل في التدقيق. الخصم المالي لا يُنشأ هنا؛ يلزم مرجع قيد صادر من WLT."
          : "القرارات التشغيلية للقراءة فقط من هذا القسم. الإدارة متاحة للجهة المخولة بالتفعيل."}
      </CpMutedInline>

      {providerKind === "captain" ? (
        <Section title="تصنيف الكابتن">
          <Text role="bodySm">التصنيف الحالي: {classification ?? "joker"}</Text>
          {classification === "joker" && canManage ? (
            <>
              <CpTextInput value={completedDeliveries} onChange={setCompletedDeliveries} placeholder="عدد الرحلات المكتملة" aria-label="عدد الرحلات المكتملة" />
              <CpTextInput value={completionRate} onChange={setCompletionRate} placeholder="نسبة الإكمال من 0 إلى 100" aria-label="نسبة الإكمال" />
              <CpTextInput value={promotionEvidence} onChange={setPromotionEvidence} placeholder="مراجع الأدلة، مفصولة بفاصلة أو سطر" aria-label="أدلة الترقية" />
              <CpTextInput value={promotionNote} onChange={setPromotionNote} placeholder="سبب اعتماد العمليات" aria-label="سبب الترقية" />
              <CpButton variant="primary" disabled={busy} onClick={() => void promote()}>اعتماد الانتقال إلى Basic</CpButton>
            </>
          ) : classification === "basic" ? <CpStatePanel role="status" title="الكابتن مصنف Basic" /> : null}
        </Section>
      ) : null}

      {canManage ? (
        <Section title="تسجيل مخالفة تشغيلية">
          <CpTextInput value={incidentCode} onChange={setIncidentCode} placeholder="رمز المخالفة" aria-label="رمز المخالفة" />
          <CpTextInput value={incidentDescription} onChange={setIncidentDescription} placeholder="وصف الواقعة" aria-label="وصف المخالفة" />
          <select value={incidentSeverity} onChange={(event) => setIncidentSeverity(event.target.value as typeof incidentSeverity)} style={selectStyle} aria-label="خطورة المخالفة">
            <option value="minor">بسيطة</option><option value="major">جسيمة</option><option value="critical">حرجة</option>
          </select>
          <CpTextInput value={incidentPolicyId} onChange={setIncidentPolicyId} placeholder="معرف السياسة عند وجود خصم" aria-label="سياسة المخالفة" />
          <CpTextInput value={incidentPenalty} onChange={setIncidentPenalty} placeholder="الخصم المقترح بوحدات العملة الصغرى" aria-label="الخصم المقترح" />
          <CpTextInput value={incidentEvidence} onChange={setIncidentEvidence} placeholder="مراجع الأدلة" aria-label="أدلة المخالفة" />
          <CpButton variant="danger" disabled={busy} onClick={() => void createIncident()}>تسجيل القضية دون خصم مباشر</CpButton>
        </Section>
      ) : null}

      <Section title="سجل المخالفات والقرارات">
        {incidents.length === 0 ? <CpStatePanel role="status" title="لا توجد مخالفات مسجلة" /> : incidents.map((incident) => {
          const status = incident.status as ProviderIncidentStatus;
          const available = NEXT_INCIDENT_STATUSES[status] ?? [];
          return (
            <div key={incident.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 10 }}>
              <Text role="bodyStrong">{incident.incidentCode} · {INCIDENT_STATUS_LABELS[status] ?? incident.status}</Text>
              <Text role="bodySm">{incident.description}</Text>
              <CpMutedInline>
                {incident.proposedPenaltyMinorUnits > 0 ? `خصم مقترح: ${incident.proposedPenaltyMinorUnits} ${incident.currency}` : "دون خصم مالي"}
                {incident.wltLedgerReference ? ` · قيد WLT: ${incident.wltLedgerReference}` : ""}
              </CpMutedInline>
              {canManage && available.length > 0 ? <CpButton variant="secondary" disabled={busy} onClick={() => selectIncident(incident)}>إدارة القرار</CpButton> : null}
            </div>
          );
        })}

        {selectedIncident && nextStatus ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
            <Text role="bodyStrong">تغيير حالة: {selectedIncident.incidentCode}</Text>
            <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ProviderIncidentStatus)} style={selectStyle} aria-label="الحالة التالية">
              {(NEXT_INCIDENT_STATUSES[selectedIncident.status as ProviderIncidentStatus] ?? []).map((status) => (
                <option key={status} value={status}>{INCIDENT_STATUS_LABELS[status]}</option>
              ))}
            </select>
            <CpTextInput value={resolutionNote} onChange={setResolutionNote} placeholder="سبب القرار" aria-label="سبب القرار" />
            {nextStatus === "financial_action_posted" ? (
              <CpTextInput value={wltReference} onChange={setWltReference} placeholder="مرجع قيد WLT الإلزامي" aria-label="مرجع قيد WLT" />
            ) : null}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CpButton variant="primary" disabled={busy} onClick={() => void applyIncidentTransition()}>حفظ القرار</CpButton>
              <CpButton variant="ghost" disabled={busy} onClick={() => setSelectedIncidentId(null)}>إلغاء</CpButton>
            </div>
          </div>
        ) : null}
      </Section>

      {error ? <CpStatePanel role="alert" title="تعذر تنفيذ الإجراء" description={error} /> : null}
      {success ? <CpStatePanel role="status" title={success} /> : null}
      <CpButton variant="ghost" disabled={busy} onClick={() => void load()}>تحديث البيانات</CpButton>
    </div>
  );
}

export default ProviderOperationalEnforcementPanel;
