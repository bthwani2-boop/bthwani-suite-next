"use client";

import { useState } from "react";
import { usePlatformVarsModel } from "../../shared/platform/platform-vars.model";
import { VarsDomainId } from "../../shared/platform/platform-vars.view-model";
import {
  CpBadge,
  CpButton,
  CpMutedInline,
  CpStatePanel,
  CpTabs,
  CpTextInput,
} from "@bthwani/control-panel/components";

const DOMAIN_TABS = [
  { value: "dsh", label: "عمليات DSH" },
  { value: "wlt", label: "جسر WLT" },
  { value: "provider", label: "المزودون" },
  { value: "design", label: "سياسات الهوية" },
] as const;

export function DshPlatformVarsWorkspace() {
  const [activeDomain, setActiveDomain] = useState<VarsDomainId>("dsh");
  const model = usePlatformVarsModel({ activeDomain });
  const mutationUnavailableReason = "يتطلب حفظ المقترحات عقد platform-control فعلياً مع تحقق واعتماد وتدقيق وتراجع.";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "22rem 1fr", gap: "1.5rem" }} dir="rtl">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>مجالات المتغيرات</h3>
        <CpTabs
          items={DOMAIN_TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
          value={activeDomain}
          onChange={(value) => setActiveDomain(value as VarsDomainId)}
          aria-label="مجالات المتغيرات"
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          <label style={{ fontSize: "11px", fontWeight: 700 }}>تصفية النطاق:</label>
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            <CpButton
              variant={model.activeScope === "all" ? "primary" : "ghost"}
              onClick={() => model.setActiveScope("all")}
            >
              الكل
            </CpButton>
            {model.orderedScopes.map((scope) => (
              <CpButton
                key={scope}
                variant={model.activeScope === scope ? "primary" : "ghost"}
                onClick={() => model.setActiveScope(scope)}
              >
                {scope}
              </CpButton>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem", overflowY: "auto", maxHeight: "30rem" }}>
          {model.filteredRecords.length === 0 ? (
            <CpStatePanel role="status" title="لا توجد متغيرات في هذا المجال." />
          ) : (
            model.filteredRecords.map((record) => (
              <CpButton
                key={record.id}
                variant={model.selectedId === record.id ? "primary" : "ghost"}
                onClick={() => model.setSelectedId(record.id)}
                style={{ display: "flex", flexDirection: "column", alignItems: "stretch", textAlign: "right" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <strong style={{ fontSize: "12px" }}>{record.label}</strong>
                  <CpBadge tone="neutral">{record.scope}</CpBadge>
                </div>
                <CpMutedInline>القيمة المعلنة: {record.currentValue || "—"}</CpMutedInline>
              </CpButton>
            ))
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {model.selectedVar ? (
          <>
            <div>
              <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{model.selectedVar.label}</h4>
              <CpMutedInline>مفتاح الإعداد: {model.selectedVar.key}</CpMutedInline>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>القيمة المعلنة:</span>
                <strong>{model.selectedVar.currentValue || "—"}</strong>
              </div>
              {model.selectedVar.proposedValue ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>قيمة مقترحة في البيانات المرجعية:</span>
                  <strong>{model.selectedVar.proposedValue}</strong>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "12px", fontWeight: 700 }}>اقتراح قيمة جديدة:</label>
              {model.isDesignVar ? (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {model.quickPicks.map((pick) => (
                    <CpButton key={pick} disabled variant="ghost" aria-label={`${pick} — ${mutationUnavailableReason}`}>
                      {pick}
                    </CpButton>
                  ))}
                </div>
              ) : (
                <CpTextInput value={model.editVal} onChange={model.setEditVal} placeholder="عقد التغيير غير متاح حاليًا" aria-label="القيمة الجديدة" disabled />
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <CpButton disabled aria-label="حفظ الاقتراح غير متاح">
                  حفظ الاقتراح
                </CpButton>
                <CpButton disabled aria-label="إلغاء الاقتراح غير متاح">
                  إلغاء
                </CpButton>
              </div>
              <div role="status">
                <CpMutedInline>{mutationUnavailableReason}</CpMutedInline>
              </div>
            </div>

            {model.linkedScenarios.length > 0 ? (
              <div style={{ marginTop: "1rem" }}>
                <h5 style={{ margin: "0 0 0.5rem" }}>سيناريوهات وقواعد مرجعية:</h5>
                {model.linkedScenarios.map((scenario) => (
                  <div key={scenario.id} style={{ marginBottom: "0.25rem" }}>
                    <strong>{scenario.title}</strong>
                    <CpMutedInline>الأولوية: {scenario.priority}</CpMutedInline>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <CpStatePanel role="status" title="اختر متغيرًا من القائمة لعرض حالته المرجعية." />
        )}
      </div>
    </div>
  );
}
