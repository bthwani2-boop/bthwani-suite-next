"use client";
import { Button } from "@bthwani/ui-kit";

import { useEffect, useMemo, useState } from "react";
import {
  CpBadge,
  CpMutedInline,
  CpStatePanel,
  CpStateView,
  CpTabs,
  CpTextInput } from "@bthwani/control-panel/components";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  usePlatformChangeWorkflowController,
  type PlatformVariable } from "../../shared/platform";
import { hasControlPanelPermission } from "../../shared/session/control-panel-permissions";
import {
  formatPlatformVariableValue,
  isSensitivePlatformVariable,
  platformVariableEditorValue,
  platformVariableIdentity,
  type VarsDomainId } from "../../shared/platform/platform-vars.view-model";
import { usePlatformVarsModel } from "../../shared/platform/platform-vars.model";
import { isPlatformDesignVar, PLATFORM_VAR_QUICK_PICKS } from "../../shared/platform/platform-vars.policy";

const DOMAIN_TABS = [
  { value: "dsh", label: "عمليات DSH" },
  { value: "wlt", label: "جسر WLT" },
  { value: "provider", label: "المزودون" },
  { value: "design", label: "سياسات الهوية" },
] as const;

export type DshPlatformVarsWorkspaceProps = {
  readonly variables: readonly PlatformVariable[];
  readonly variablesFailure?: string | null;
  readonly onChanged?: () => void | Promise<void>;
};

function parseEditorValue(value: string, valueType: string): unknown {
  if (valueType.toLowerCase() === "string") return value;
  return JSON.parse(value);
}

export function DshPlatformVarsWorkspace({
  variables,
  variablesFailure,
  onChanged }: DshPlatformVarsWorkspaceProps) {
  const [activeDomain, setActiveDomain] = useState<VarsDomainId>("dsh");
  const model = usePlatformVarsModel({ activeDomain, variables });
  const { state: sessionState } = useIdentitySession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canRead = hasControlPanelPermission(identity, "platform:read");
  const canPropose = hasControlPanelPermission(identity, "platform:variables:propose");
  const workflow = usePlatformChangeWorkflowController(canRead);

  const [reason, setReason] = useState("");
  const [impactAssessment, setImpactAssessment] = useState("");
  const [rollbackPlan, setRollbackPlan] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const selectedVar = model.selectedVar;
  const sensitive = selectedVar ? isSensitivePlatformVariable(selectedVar) : false;
  const quickPicks = useMemo(
    () => selectedVar && isPlatformDesignVar(selectedVar.key)
      ? PLATFORM_VAR_QUICK_PICKS[selectedVar.key] ?? []
      : [],
    [selectedVar],
  );

  useEffect(() => {
    setReason("");
    setImpactAssessment("");
    setRollbackPlan("");
    setFormError(null);
  }, [selectedVar]);

  const mutationUnavailableReason = !canPropose
    ? "صلاحية اقتراح تغييرات المنصة غير متاحة لهذه الجلسة."
    : sensitive
      ? "المتغير مصنفًا حساسًا ولا تسمح سياسة platform-control بإدخاله في change-set."
      : "يُحفظ الاقتراح كمسودة في platform-control، ثم يمر عبر التحقق والمراجعة والتطبيق والتراجع.";

  const saveProposal = async () => {
    setFormError(null);
    if (!selectedVar || sensitive || !canPropose) return;
    if (!reason.trim() || !impactAssessment.trim() || !rollbackPlan.trim()) {
      setFormError("PLATFORM_CHANGE_REQUIRED_FIELDS_MISSING");
      return;
    }

    let proposedValue: unknown;
    try {
      proposedValue = parseEditorValue(model.editVal, selectedVar.valueType);
    } catch {
      setFormError("PLATFORM_PROPOSED_VALUE_INVALID_JSON");
      return;
    }

    const revision = Number(selectedVar.revision);
    if (!Number.isSafeInteger(revision) || revision < 0) {
      setFormError("PLATFORM_VARIABLE_REVISION_INVALID");
      return;
    }

    const succeeded = await workflow.create({
      title: `اقتراح تغيير ${selectedVar.key}`,
      reason: reason.trim(),
      impactAssessment: impactAssessment.trim(),
      rollbackPlan: rollbackPlan.trim(),
      items: [{
        targetType: "variable",
        targetKey: selectedVar.key,
        ownerService: selectedVar.ownerService,
        scopeType: selectedVar.scopeType || "global",
        scopeId: selectedVar.scopeId ?? "",
        valueType: selectedVar.valueType || "json",
        classification: selectedVar.classification || "internal",
        expectedRevision: revision,
        proposedValue }] });
    if (succeeded) {
      setReason("");
      setImpactAssessment("");
      setRollbackPlan("");
      await onChanged?.();
    }
  };

  const cancelProposal = () => {
    setFormError(null);
    if (selectedVar) model.setEditVal(platformVariableEditorValue(selectedVar));
    setReason("");
    setImpactAssessment("");
    setRollbackPlan("");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "22rem 1fr", gap: "1.5rem" }} dir="rtl">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>المتغيرات السيادية الحية</h3>
        <CpTabs
          items={DOMAIN_TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
          value={activeDomain}
          onChange={(value) => setActiveDomain(value as VarsDomainId)}
          aria-label="مجالات المتغيرات"
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          <label style={{ fontSize: "11px", fontWeight: 700 }}>تصفية النطاق:</label>
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            <Button variant={model.activeScope === "all" ? "primary" : "ghost"} onClick={() => model.setActiveScope("all")}>
              الكل
            </Button>
            {model.orderedScopes.map((scope) => (
              <Button key={scope} variant={model.activeScope === scope ? "primary" : "ghost"} onClick={() => model.setActiveScope(scope)}>
                {scope}
              </Button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem", overflowY: "auto", maxHeight: "30rem" }}>
          {variablesFailure ? (
            <CpStatePanel role="alert" title="تعذر تحميل المتغيرات" code={variablesFailure} />
          ) : model.filteredRecords.length === 0 ? (
            <CpStatePanel role="status" title="لا توجد متغيرات في هذا المجال." />
          ) : (
            model.filteredRecords.map((record) => {
              const id = platformVariableIdentity(record);
              return (
                <Button
                  key={id}
                  variant={model.selectedId === id ? "primary" : "ghost"}
                  onClick={() => model.setSelectedId(id)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "stretch", textAlign: "right" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <strong style={{ fontSize: "12px" }}>{record.key}</strong>
                    <CpBadge tone="neutral">{record.scopeType}</CpBadge>
                  </div>
                  <CpMutedInline>{formatPlatformVariableValue(record) || "—"}</CpMutedInline>
                </Button>
              );
            })
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {selectedVar ? (
          <>
            <div>
              <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{selectedVar.key}</h4>
              <CpMutedInline>
                المالك: {selectedVar.ownerService} · النطاق: {selectedVar.scopeType}{selectedVar.scopeId ? ` / ${selectedVar.scopeId}` : ""} · المراجعة: {selectedVar.revision}
              </CpMutedInline>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>القيمة الحالية:</span>
                <strong>{formatPlatformVariableValue(selectedVar) || "—"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>الحالة:</span>
                <CpBadge tone={selectedVar.status === "OPERATIONAL" ? "success" : "warning"}>{selectedVar.status}</CpBadge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>التصنيف:</span>
                <span>{selectedVar.classification}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "12px", fontWeight: 700 }}>اقتراح قيمة جديدة:</label>
              {quickPicks.length > 0 ? (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {quickPicks.map((pick) => (
                    <Button key={pick} disabled={!canPropose || sensitive} variant="ghost" onClick={() => model.setEditVal(pick)}>
                      {pick}
                    </Button>
                  ))}
                </div>
              ) : null}
              <CpTextInput
                value={model.editVal}
                onChange={model.setEditVal}
                placeholder={selectedVar.valueType === "string" ? "قيمة نصية" : "قيمة JSON"}
                aria-label="القيمة الجديدة"
                disabled={!canPropose || sensitive}
              />
              <CpTextInput value={reason} onChange={setReason} placeholder="سبب التغيير" aria-label="سبب التغيير" disabled={!canPropose || sensitive} />
              <CpTextInput value={impactAssessment} onChange={setImpactAssessment} placeholder="تقييم الأثر" aria-label="تقييم الأثر" disabled={!canPropose || sensitive} />
              <CpTextInput value={rollbackPlan} onChange={setRollbackPlan} placeholder="خطة التراجع" aria-label="خطة التراجع" disabled={!canPropose || sensitive} />

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button onClick={() => void saveProposal()} disabled={!canPropose || sensitive || workflow.mutationState.kind === "loading"}>
                  {workflow.mutationState.kind === "loading" ? "جاري الحفظ…" : "حفظ الاقتراح كمسودة"}
                </Button>
                <Button onClick={cancelProposal} disabled={workflow.mutationState.kind === "loading"}>إلغاء</Button>
              </div>
              <CpMutedInline>{mutationUnavailableReason}</CpMutedInline>
              {formError ? <CpStateView kind="error" title="تعذر تجهيز الاقتراح" code={formError} /> : null}
              {workflow.mutationState.kind === "error" ? <CpStateView kind="error" title="فشل حفظ الاقتراح" code={workflow.mutationState.message} /> : null}
              {workflow.mutationState.kind === "success" ? <CpStatePanel role="status" title="تم إنشاء مسودة change-set وقراءة الحالة الراجعة" code={workflow.mutationState.message} /> : null}
            </div>
          </>
        ) : (
          <CpStatePanel role="status" title="اختر متغيرًا من القائمة لعرض حالته الحية." />
        )}
      </div>
    </div>
  );
}
