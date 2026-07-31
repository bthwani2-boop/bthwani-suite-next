"use client";

import { useState } from "react";
import { neutralScale } from "@bthwani/ui-kit";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import {
  CpBadge,
  CpButton,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpStateView,
  CpTabs,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { QueuePageFrame } from "@bthwani/control-panel/shell";
import {
  useFieldEscalationController,
  ESCALATION_SEVERITY_LABELS,
  ESCALATION_CATEGORY_LABELS,
  type DshEscalationStatus,
} from "../../../shared/field-readiness";

type FollowUpStatus = "resolved" | "escalated_further";

const FILTERS: ReadonlyArray<{ readonly label: string; readonly value: DshEscalationStatus | "" }> = [
  { label: "الكل", value: "" },
  { label: "مفتوح", value: "open" },
  { label: "قيد المراجعة", value: "acknowledged" },
  { label: "مصعّد للعمليات", value: "escalated_further" },
  { label: "محلول", value: "resolved" },
];

const STATUS_LABELS: Record<DshEscalationStatus, string> = {
  open: "مفتوح",
  acknowledged: "قيد المراجعة",
  escalated_further: "مصعّد للعمليات",
  resolved: "محلول",
};

function severityTone(severity: "critical" | "high" | "medium" | "low" | string): CpBadgeTone {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  return "neutral";
}

function statusTone(status: DshEscalationStatus): CpBadgeTone {
  if (status === "resolved") return "success";
  if (status === "escalated_further") return "danger";
  if (status === "acknowledged") return "info";
  return "warning";
}

export function FieldReadinessQueueScreen() {
  const { listState, actionState, loadOperatorEscalations, resolveEscalation, resetAction } =
    useFieldEscalationController("authenticated");
  const [activeFilter, setActiveFilter] = useState<DshEscalationStatus | "">("");
  const [followUp, setFollowUp] = useState<{ readonly id: string; readonly status: FollowUpStatus } | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  function submitFollowUp() {
    if (!followUp || resolutionNote.trim().length < 5) return;
    void resolveEscalation(followUp.id, {
      status: followUp.status,
      resolutionNote: resolutionNote.trim(),
    }).then(() => {
      setFollowUp(null);
      setResolutionNote("");
      void loadOperatorEscalations(activeFilter || undefined);
    });
  }

  function handleAcknowledge(id: string) {
    void resolveEscalation(id, { status: "acknowledged" }).then(() => {
      void loadOperatorEscalations(activeFilter || undefined);
    });
  }

  function openFollowUp(id: string, status: FollowUpStatus) {
    setFollowUp((current) => current?.id === id && current.status === status ? null : { id, status });
    setResolutionNote("");
  }

  const stateView =
    listState.kind === "loading" ? <CpStateView kind="loading" title="جاري تحميل التصعيدات…" /> :
    listState.kind === "error" ? (
      <CpStatePanel role="alert" title="تعذر التحميل" code={listState.message}>
        <CpRetryButton onClick={() => void loadOperatorEscalations(activeFilter || undefined)}>إعادة المحاولة</CpRetryButton>
      </CpStatePanel>
    ) :
    listState.kind === "empty" ? <CpStatePanel role="status" title="لا توجد تصعيدات" description="لا توجد تصعيدات بالفلتر الحالي." /> :
    undefined;

  return (
    <QueuePageFrame
      header={<CpPageHeader title="قائمة تصعيدات التحقق الميداني"><CpMutedInline tight>راجع التصعيدات الواردة من الموظفين الميدانيين واتخذ إجراءً موثقًا</CpMutedInline></CpPageHeader>}
      filters={
        <CpTabs
          items={FILTERS.map((filter) => ({ value: filter.value, label: filter.label }))}
          value={activeFilter}
          onChange={(value) => {
            const next = value as DshEscalationStatus | "";
            setActiveFilter(next);
            void loadOperatorEscalations(next || undefined);
          }}
          aria-label="فلاتر التصعيدات"
        />
      }
      stateView={stateView}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem" }}>
        {actionState.kind === "error" ? (
          <CpStatePanel role="alert" title={actionState.message}>
            <CpRetryButton onClick={resetAction}>إغلاق</CpRetryButton>
          </CpStatePanel>
        ) : null}

        {listState.kind === "success"
          ? listState.escalations.map((escalation) => {
              const followUpOpen = followUp?.id === escalation.id;
              return (
                <section
                  key={escalation.id}
                  style={{ border: `1px solid ${neutralScale[200]}`, borderRadius: 12, display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <strong>{ESCALATION_CATEGORY_LABELS[escalation.category]}</strong>
                      <CpMutedInline tight>متجر: {escalation.storeId}</CpMutedInline>
                      <CpMutedInline tight>{escalation.createdAt}</CpMutedInline>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                      <CpBadge tone={severityTone(escalation.severity)}>{ESCALATION_SEVERITY_LABELS[escalation.severity]}</CpBadge>
                      <CpBadge tone={statusTone(escalation.status)}>{STATUS_LABELS[escalation.status]}</CpBadge>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span>{escalation.description}</span>
                    {escalation.resolutionNote ? <CpMutedInline tight>آخر متابعة: {escalation.resolutionNote}</CpMutedInline> : null}
                  </div>
                  {escalation.status !== "resolved" ? (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {escalation.status === "open" ? (
                        <CpButton disabled={actionState.kind === "submitting"} onClick={() => handleAcknowledge(escalation.id)}>تأكيد الاستلام</CpButton>
                      ) : null}
                      <CpButton variant="brand" onClick={() => openFollowUp(escalation.id, "resolved")}>حل التصعيد</CpButton>
                      {escalation.status !== "escalated_further" ? (
                        <CpButton variant="danger" onClick={() => openFollowUp(escalation.id, "escalated_further")}>تصعيد أعلى</CpButton>
                      ) : null}
                    </div>
                  ) : null}
                  {followUpOpen ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <strong>{followUp?.status === "resolved" ? "توثيق حل التصعيد" : "توثيق سبب التصعيد الأعلى"}</strong>
                      <CpTextInput
                        value={resolutionNote}
                        onChange={setResolutionNote}
                        placeholder="صف الإجراء أو سبب التصعيد"
                        aria-label="ملاحظة المتابعة"
                      />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <CpButton
                          variant={followUp?.status === "resolved" ? "brand" : "danger"}
                          disabled={resolutionNote.trim().length < 5 || actionState.kind === "submitting"}
                          onClick={submitFollowUp}
                        >
                          {actionState.kind === "submitting" ? "جاري الحفظ…" : "تأكيد الإجراء"}
                        </CpButton>
                        <CpButton onClick={() => setFollowUp(null)}>إلغاء</CpButton>
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })
          : null}
      </div>
    </QueuePageFrame>
  );
}
