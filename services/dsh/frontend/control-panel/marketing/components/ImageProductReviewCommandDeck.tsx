"use client";
import { colorRoles } from '@bthwani/ui-kit';
import React from "react";
import {
  CpButton,
  CpEmptyTableMessage,
} from "@bthwani/control-panel/components";
import { useCatalogReviewController } from "../../../shared/marketing";
import { NotBackedNotice } from "./NotBackedNotice";

export function ImageProductReviewCommandDeck() {
  const controller = useCatalogReviewController();

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: colorRoles.brandAction, fontSize: "1.15rem" }}>مراجعة جودة صور المنتجات والكتالوج</h3>
      <p style={{ margin: 0, fontSize: "0.813rem", color: colorRoles.brandStructure, opacity: 0.7 }}>تدقيق صور الكتالوج وإلزام الشركاء بمعايير ووضوح الصور ودقتها قبل النشر للعملاء:</p>

      {!controller.isBackedByApi && <NotBackedNotice reason={controller.persistenceDisabledReason} />}

      {controller.items.length === 0 ? (
        <CpEmptyTableMessage>لا توجد صور بانتظار المراجعة حالياً.</CpEmptyTableMessage>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {controller.items.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.5rem", background: "white" }}>
              <div>
                <strong>{item.name}</strong>
                <div style={{ fontSize: "0.8rem", color: item.hasBadImage ? colorRoles.brandAction : colorRoles.brandStructure }}>
                  {item.hasBadImage ? `مرفوضة بسبب: ${item.reason}` : "مقبولة ومستوفاة شروط الجودة"}
                </div>
              </div>
              {item.hasBadImage && (
                <CpButton onClick={() => controller.approveImage(item.id)} disabled={!controller.isBackedByApi}>تجاوز وقبول الصورة</CpButton>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
