"use client";
import { colorRoles } from '@bthwani/ui-kit';
import React, { useState } from "react";
import {
  CpButton,
  CpTextInput,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpEmptyTableMessage,
} from "@bthwani/control-panel/components";
import { useCampaignsController } from "../../../shared/marketing";

export function CampaignsCommandDeck() {
  const controller = useCampaignsController("authenticated");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLaunch = async () => {
    if (!title.trim() || !startDate || !endDate) {
      setErrorMsg("الحقول: العنوان، تاريخ البداية وتاريخ النهاية هي حقول مطلوبة.");
      return;
    }
    // Validation constraint: End date must be greater than start date
    if (new Date(endDate) <= new Date(startDate)) {
      setErrorMsg("خطأ في الجدولة الزمنية: تاريخ النهاية يجب أن يكون لاحقاً لتاريخ البداية.");
      return;
    }
    setErrorMsg(null);
    await controller.create({ title, description, startDate, endDate });
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 22rem", gap: "1.5rem" }} dir="rtl">
      <div>
        <h3 style={{ margin: "0 0 1rem", color: colorRoles.brandAction, fontSize: "1.15rem" }}>إدارة وجدولة الحملات التسويقية</h3>

        {controller.state.kind === "loading" && <p>جارٍ التحميل...</p>}
        {controller.state.kind === "error" && <p style={{ color: colorRoles.brandAction }}>{controller.state.message}</p>}
        {controller.state.kind === "success" && controller.state.items.length === 0 ? (
          <CpEmptyTableMessage>لا توجد حملات تسويقية مجدولة حالياً.</CpEmptyTableMessage>
        ) : controller.state.kind === "success" && (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>عنوان الحملة</CpTableHeaderCell>
                <CpTableHeaderCell>الوصف</CpTableHeaderCell>
                <CpTableHeaderCell>تاريخ البدء</CpTableHeaderCell>
                <CpTableHeaderCell>تاريخ الانتهاء</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.state.items.map((camp) => (
                <tr key={camp.id}>
                  <CpTableCell><strong>{camp.title}</strong></CpTableCell>
                  <CpTableCell>{camp.description}</CpTableCell>
                  <CpTableCell>{camp.startDate}</CpTableCell>
                  <CpTableCell>{camp.endDate}</CpTableCell>
                  <CpTableCell>
                    <CpButton onClick={() => controller.remove(camp.id)} style={{ background: colorRoles.surfaceBase, color: colorRoles.brandAction }}>حذف</CpButton>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
        <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>جدولة حملة تسويقية جديدة</h4>

        {errorMsg && (
          <div style={{ color: colorRoles.brandAction, background: colorRoles.surfaceBase, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان الحملة</label>
          <CpTextInput value={title} onChange={setTitle} placeholder="مثال: حملة الصيف الكبرى 2026" />

          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الوصف الاستراتيجي</label>
          <CpTextInput value={description} onChange={setDescription} placeholder="وصف موجز للمستهدفين والهدف..." />

          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>تاريخ البداية</label>
          <CpTextInput value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" />

          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>تاريخ النهاية</label>
          <CpTextInput value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" />

          <CpButton onClick={handleLaunch} style={{ background: colorRoles.brandAction, color: "white", marginTop: "0.5rem" }}>إطلاق الحملة</CpButton>
        </div>
      </div>
    </div>
  );
}
