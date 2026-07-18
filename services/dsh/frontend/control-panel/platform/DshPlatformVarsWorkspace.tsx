"use client";

import React, { useState } from "react";
import { colorRoles } from '@bthwani/ui-kit';
import { usePlatformVarsModel } from "../../shared/platform/platform-vars.model";
import { VarsDomainId } from "../../shared/platform/platform-vars.view-model";
import { CpButton, CpTextInput } from "@bthwani/control-panel/components";

export function DshPlatformVarsWorkspace() {
  const [activeDomain, setActiveDomain] = useState<VarsDomainId>("dsh");
  const model = usePlatformVarsModel({ activeDomain });
  const mutationUnavailableReason = "يتطلب حفظ المقترحات عقد platform-control فعلياً مع تحقق واعتماد وتدقيق وتراجع.";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "22rem 1fr",
        gap: "1.5rem",
        padding: "1rem",
        background: colorRoles.surfaceBase,
        borderRadius: "0.75rem",
        border: `1px solid ${colorRoles.borderSubtle}`,
      }}
      dir="rtl"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: `1px solid ${colorRoles.borderSubtle}`, paddingLeft: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colorRoles.brandAction }}>مجالات المتغيرات</h3>
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
          {(["dsh", "wlt", "provider", "design"] as const).map((domain) => (
            <button
              key={domain}
              type="button"
              onClick={() => setActiveDomain(domain)}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: 700,
                border: activeDomain === domain ? "none" : `1px solid ${colorRoles.borderSubtle}`,
                backgroundColor: activeDomain === domain ? colorRoles.brandAction : "transparent",
                color: activeDomain === domain ? colorRoles.surfaceBase : colorRoles.brandStructure,
                cursor: "pointer",
              }}
            >
              {domain === "dsh" ? "عمليات DSH" : domain === "wlt" ? "جسر WLT" : domain === "provider" ? "المزودون" : "سياسات الهوية"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          <label style={{ fontSize: "11px", fontWeight: 700 }}>تصفية النطاق:</label>
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => model.setActiveScope("all")}
              style={{
                padding: "2px 6px",
                fontSize: "10px",
                border: "none",
                borderRadius: "3px",
                background: model.activeScope === "all" ? colorRoles.surfaceMuted : "transparent",
                color: model.activeScope === "all" ? colorRoles.brandAction : colorRoles.brandStructure,
                cursor: "pointer",
              }}
            >
              الكل
            </button>
            {model.orderedScopes.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => model.setActiveScope(scope)}
                style={{
                  padding: "2px 6px",
                  fontSize: "10px",
                  border: "none",
                  borderRadius: "3px",
                  background: model.activeScope === scope ? colorRoles.surfaceMuted : "transparent",
                  color: model.activeScope === scope ? colorRoles.brandAction : colorRoles.brandStructure,
                  cursor: "pointer",
                }}
              >
                {scope}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem", overflowY: "auto", maxHeight: "30rem" }}>
          {model.filteredRecords.length === 0 ? (
            <div style={{ padding: "1rem", textAlign: "center", color: colorRoles.textMuted, fontSize: "0.8rem" }}>لا توجد متغيرات في هذا المجال.</div>
          ) : (
            model.filteredRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => model.setSelectedId(record.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${model.selectedId === record.id ? colorRoles.brandAction : colorRoles.borderSubtle}`,
                  background: model.selectedId === record.id ? colorRoles.surfaceMuted : colorRoles.surfaceBase,
                  cursor: "pointer",
                  textAlign: "right",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "12px", color: colorRoles.brandStructure }}>{record.label}</strong>
                  <span style={{ fontSize: "9px", background: colorRoles.surfaceMuted, padding: "1px 4px", borderRadius: "3px" }}>{record.scope}</span>
                </div>
                <div style={{ fontSize: "10px", color: colorRoles.textMuted, marginTop: "0.25rem" }}>
                  القيمة المعلنة: {record.currentValue || "—"}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {model.selectedVar ? (
          <>
            <div style={{ borderBottom: `1px solid ${colorRoles.borderSubtle}`, paddingBottom: "0.5rem" }}>
              <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{model.selectedVar.label}</h4>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: colorRoles.textMuted }}>مفتاح الإعداد: {model.selectedVar.key}</p>
            </div>

            <div style={{ background: colorRoles.surfaceMuted, padding: "1rem", borderRadius: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>القيمة المعلنة:</span>
                <strong>{model.selectedVar.currentValue || "—"}</strong>
              </div>
              {model.selectedVar.proposedValue ? (
                <div style={{ display: "flex", justifyContent: "space-between", color: colorRoles.brandAction }}>
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
                    <button
                      key={pick}
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={mutationUnavailableReason}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        border: `1px solid ${colorRoles.borderSubtle}`,
                        background: colorRoles.surfaceBase,
                        cursor: "not-allowed",
                        opacity: 0.55,
                      }}
                    >
                      {pick}
                    </button>
                  ))}
                </div>
              ) : (
                <CpTextInput value={model.editVal} onChange={model.setEditVal} placeholder="عقد التغيير غير متاح حاليًا" aria-label="القيمة الجديدة" disabled />
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <CpButton disabled aria-label="حفظ الاقتراح غير متاح" style={{ cursor: "not-allowed", opacity: 0.55 }}>
                  حفظ الاقتراح
                </CpButton>
                <CpButton disabled aria-label="إلغاء الاقتراح غير متاح" style={{ cursor: "not-allowed", opacity: 0.55 }}>
                  إلغاء
                </CpButton>
              </div>
              <div role="status" style={{ fontSize: "11px", color: colorRoles.textMuted, lineHeight: 1.6 }}>
                {mutationUnavailableReason}
              </div>
            </div>

            {model.linkedScenarios.length > 0 ? (
              <div style={{ marginTop: "1rem" }}>
                <h5 style={{ margin: "0 0 0.5rem" }}>سيناريوهات وقواعد مرجعية:</h5>
                {model.linkedScenarios.map((scenario) => (
                  <div key={scenario.id} style={{ padding: "0.5rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.25rem", fontSize: "11px", marginBottom: "0.25rem" }}>
                    <strong>{scenario.title}</strong>
                    <div style={{ color: colorRoles.textMuted }}>الأولوية: {scenario.priority}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div style={{ padding: "3rem", textAlign: "center", color: colorRoles.textMuted }}>اختر متغيرًا من القائمة لعرض حالته المرجعية.</div>
        )}
      </div>
    </div>
  );
}
