"use client";
import { colorRoles } from '@bthwani/ui-kit';

import React, { useState } from "react";

import { usePlatformVarsModel } from "../../shared/platform/platform-vars.model";
import { VarsDomainId } from "../../shared/platform/platform-vars.view-model";
import { usePlatformAuditStateHook } from "../../shared/platform/platform-audit-state";
import { CpButton, CpTextInput, CpTable, CpTableCell, CpTableHeaderCell } from "@bthwani/control-panel/components";

export function DshPlatformVarsWorkspace() {
  const [activeDomain, setActiveDomain] = useState<VarsDomainId>("dsh");
  const { addAuditEvent } = usePlatformAuditStateHook();

  const model = usePlatformVarsModel({
    activeDomain,
    addAuditEvent,
  });
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
        border: `1px solid ${colorRoles.surfaceBase}`,
      }}
      dir="rtl"
    >
      {/* Right Column: Variable list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: `1px solid ${colorRoles.surfaceBase}`, paddingLeft: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colorRoles.brandAction }}>مجالات المتغيرات</h3>
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
          {(["dsh", "wlt", "provider", "design"] as const).map((dom) => (
            <button
              key={dom}
              onClick={() => setActiveDomain(dom)}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: 700,
                border: activeDomain === dom ? "none" : `1px solid ${colorRoles.surfaceBase}`,
                backgroundColor: activeDomain === dom ? colorRoles.brandAction : "transparent",
                color: activeDomain === dom ? colorRoles.surfaceBase : colorRoles.brandStructure,
                cursor: "pointer",
              }}
            >
              {dom === "dsh" ? "عمليات DSH" : dom === "wlt" ? "جسر WLT" : dom === "provider" ? "المزودين" : "سياسات الهوية"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          <label style={{ fontSize: "11px", fontWeight: 700 }}>تصفية النطاق:</label>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              onClick={() => model.setActiveScope("all")}
              style={{
                padding: "2px 6px",
                fontSize: "10px",
                border: "none",
                borderRadius: "3px",
                background: model.activeScope === "all" ? colorRoles.surfaceBase : "transparent",
                color: model.activeScope === "all" ? colorRoles.brandAction : colorRoles.brandStructure,
                cursor: "pointer",
              }}
            >
              الكل
            </button>
            {model.orderedScopes.map((sc) => (
              <button
                key={sc}
                onClick={() => model.setActiveScope(sc)}
                style={{
                  padding: "2px 6px",
                  fontSize: "10px",
                  border: "none",
                  borderRadius: "3px",
                  background: model.activeScope === sc ? colorRoles.surfaceBase : "transparent",
                  color: model.activeScope === sc ? colorRoles.brandAction : colorRoles.brandStructure,
                  cursor: "pointer",
                }}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem", overflowY: "auto", maxHeight: "30rem" }}>
          {model.filteredRecords.length === 0 ? (
            <div style={{ padding: "1rem", textAlign: "center", color: colorRoles.brandStructure, fontSize: "0.8rem" }}>لا توجد متغيرات حالياً في هذا المجال.</div>
          ) : (
            model.filteredRecords.map((rec) => (
              <div
                key={rec.id}
                onClick={() => model.setSelectedId(rec.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${model.selectedId === rec.id ? colorRoles.brandAction : colorRoles.surfaceBase}`,
                  background: model.selectedId === rec.id ? colorRoles.surfaceBase : "white",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "12px", color: colorRoles.brandStructure }}>{rec.label}</strong>
                  <span style={{ fontSize: "9px", background: colorRoles.surfaceBase, padding: "1px 4px", borderRadius: "3px" }}>{rec.scope}</span>
                </div>
                <div style={{ fontSize: "10px", color: colorRoles.brandStructure, marginTop: "0.25rem" }}>
                  القيمة: {rec.currentValue || "—"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Left Column: Details & Edit */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {model.selectedVar ? (
          <>
            <div style={{ borderBottom: `1px solid ${colorRoles.surfaceBase}`, paddingBottom: "0.5rem" }}>
              <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{model.selectedVar.label}</h4>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: colorRoles.brandStructure }}>مفتاح الإعداد: {model.selectedVar.key}</p>
            </div>

            <div style={{ background: colorRoles.surfaceBase, padding: "1rem", borderRadius: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>القيمة الحالية:</span>
                <strong>{model.selectedVar.currentValue || "—"}</strong>
              </div>
              {model.selectedVar.proposedValue && (
                <div style={{ display: "flex", justifyContent: "space-between", color: colorRoles.brandAction }}>
                  <span>القيمة المقترحة بانتظار الاعتماد:</span>
                  <strong>{model.selectedVar.proposedValue}</strong>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "12px", fontWeight: 700 }}>اقتراح قيمة جديدة:</label>
              {model.isDesignVar ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {model.quickPicks.map((pick) => (
                    <button
                      key={pick}
                      disabled
                      aria-disabled="true"
                      title={mutationUnavailableReason}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        border: model.editVal === pick ? `1px solid ${colorRoles.brandAction}` : `1px solid ${colorRoles.surfaceBase}`,
                        background: model.editVal === pick ? colorRoles.surfaceBase : "white",
                        cursor: "not-allowed",
                        opacity: 0.55,
                      }}
                    >
                      {pick}
                    </button>
                  ))}
                </div>
              ) : (
                <CpTextInput value={model.editVal} onChange={model.setEditVal} placeholder="عقد التغيير غير متاح حالياً" aria-label="القيمة الجديدة" disabled />
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <CpButton disabled aria-label="حفظ الاقتراح غير متاح" style={{ background: colorRoles.surfaceBase, color: colorRoles.textMuted, border: `1px solid ${colorRoles.surfaceBase}`, cursor: "not-allowed" }}>
                  حفظ الاقتراح
                </CpButton>
                <CpButton disabled aria-label="إلغاء الاقتراح غير متاح" style={{ background: "transparent", border: `1px solid ${colorRoles.surfaceBase}`, color: colorRoles.textMuted, cursor: "not-allowed" }}>
                  إلغاء
                </CpButton>
              </div>
              <div role="status" style={{ fontSize: "11px", color: colorRoles.textMuted, lineHeight: 1.6 }}>
                {mutationUnavailableReason}
              </div>
            </div>

            {model.linkedScenarios.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h5 style={{ margin: "0 0 0.5rem" }}>سيناريوهات وقواعد مرتبطة:</h5>
                {model.linkedScenarios.map((sc) => (
                  <div key={sc.id} style={{ padding: "0.5rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.25rem", fontSize: "11px", marginBottom: "0.25rem" }}>
                    <strong>{sc.title}</strong>
                    <div style={{ color: colorRoles.brandStructure }}>الأولوية: {sc.priority}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: "3rem", textAlign: "center", color: colorRoles.brandStructure }}>اختر متغيراً من القائمة الجانبية لعرض وتعديل إعداداته.</div>
        )}
      </div>
    </div>
  );
}
