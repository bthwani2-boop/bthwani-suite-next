"use client";
import { colorRoles } from "@bthwani/ui-kit";
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
import type { DshCampaign } from "../../../shared/marketing";

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  active: "نشطة",
  paused: "موقوفة",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

function CampaignActions({
  campaign,
  onStatus,
  onArchive,
}: {
  readonly campaign: DshCampaign;
  readonly onStatus: (status: string) => void;
  readonly onArchive: () => void;
}) {
  if (campaign.status === "completed" || campaign.status === "cancelled") {
    return <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>لا توجد إجراءات متاحة</span>;
  }

  return (
    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
      {campaign.status === "draft" && (
        <CpButton onClick={() => onStatus("active")}>تفعيل</CpButton>
      )}
      {campaign.status === "active" && (
        <CpButton onClick={() => onStatus("paused")}>إيقاف مؤقت</CpButton>
      )}
      {campaign.status === "paused" && (
        <CpButton onClick={() => onStatus("active")}>استئناف</CpButton>
      )}
      {(campaign.status === "active" || campaign.status === "paused") && (
        <CpButton onClick={() => onStatus("completed")}>إنهاء</CpButton>
      )}
      <CpButton
        onClick={onArchive}
        style={{ background: colorRoles.surfaceBase, color: colorRoles.brandAction }}
      >
        إلغاء وأرشفة
      </CpButton>
    </div>
  );
}

export function CampaignsCommandDeck() {
  const controller = useCampaignsController("authenticated");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateDraft = async () => {
    if (!title.trim() || !startDate || !endDate) {
      setErrorMsg("العنوان وتاريخ البداية وتاريخ النهاية حقول مطلوبة.");
      return;
    }
    if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
      setErrorMsg("صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setErrorMsg("تاريخ النهاية يجب أن يكون لاحقاً لتاريخ البداية.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await controller.create({ title: title.trim(), description: description.trim(), startDate, endDate });
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setSuccessMsg("تم حفظ الحملة كمسودة. لن تظهر على أي سطح قبل التفعيل.");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "تعذر حفظ مسودة الحملة.");
    }
  };

  const handleStatus = async (campaign: DshCampaign, status: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await controller.update(campaign.id, { status });
      setSuccessMsg(`تم تحديث حالة الحملة إلى: ${STATUS_LABEL[status] ?? status}.`);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "تعذر تحديث حالة الحملة.");
    }
  };

  const handleArchive = async (campaign: DshCampaign) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await controller.remove(campaign.id);
      setSuccessMsg("تم إلغاء الحملة وأرشفتها مع الاحتفاظ بسجل التدقيق.");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "تعذر أرشفة الحملة.");
    }
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 22rem", gap: "1.5rem" }} dir="rtl">
      <div>
        <h3 style={{ margin: "0 0 1rem", color: colorRoles.brandAction, fontSize: "1.15rem" }}>
          إدارة وجدولة الحملات التسويقية
        </h3>

        {errorMsg && <p role="alert" style={{ color: colorRoles.brandAction }}>{errorMsg}</p>}
        {successMsg && <p role="status" style={{ color: colorRoles.brandStructure }}>{successMsg}</p>}
        {controller.state.kind === "loading" && <p>جارٍ التحميل...</p>}
        {controller.state.kind === "error" && <p role="alert" style={{ color: colorRoles.brandAction }}>{controller.state.message}</p>}
        {controller.state.kind === "success" && controller.state.items.length === 0 ? (
          <CpEmptyTableMessage>لا توجد حملات تسويقية حالياً.</CpEmptyTableMessage>
        ) : controller.state.kind === "success" && (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>الحملة</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>الجدولة</CpTableHeaderCell>
                <CpTableHeaderCell>الجمهور والهدف</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.state.items.map((campaign) => (
                <tr key={campaign.id}>
                  <CpTableCell>
                    <strong>{campaign.title}</strong>
                    <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>{campaign.description || "بدون وصف"}</div>
                  </CpTableCell>
                  <CpTableCell>{STATUS_LABEL[campaign.status] ?? campaign.status}</CpTableCell>
                  <CpTableCell>{campaign.startDate} — {campaign.endDate}</CpTableCell>
                  <CpTableCell>
                    <div>{campaign.audience || "all"}</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>
                      {campaign.targetType ? `${campaign.targetType}: ${campaign.targetId || "—"}` : "بدون هدف مرتبط"}
                    </div>
                  </CpTableCell>
                  <CpTableCell>
                    <CampaignActions
                      campaign={campaign}
                      onStatus={(status) => void handleStatus(campaign, status)}
                      onArchive={() => void handleArchive(campaign)}
                    />
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      <div style={{ background: colorRoles.surfaceBase, border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.75rem", padding: "1.25rem" }}>
        <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>إنشاء مسودة حملة جديدة</h4>
        <p style={{ margin: "0 0 1rem", fontSize: "0.75rem", opacity: 0.7 }}>
          الحفظ ينشئ مسودة فقط. التفعيل إجراء منفصل ومحكوم من جدول الحملات.
        </p>

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان الحملة</label>
          <CpTextInput value={title} onChange={setTitle} placeholder="مثال: حملة الصيف الكبرى 2026" />

          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الوصف الاستراتيجي</label>
          <CpTextInput value={description} onChange={setDescription} placeholder="الهدف والجمهور والرسالة..." />

          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>تاريخ البداية</label>
          <CpTextInput value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" />

          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>تاريخ النهاية</label>
          <CpTextInput value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" />

          <CpButton onClick={() => void handleCreateDraft()} style={{ background: colorRoles.brandAction, color: "white", marginTop: "0.5rem" }}>
            حفظ كمسودة
          </CpButton>
        </div>
      </div>
    </div>
  );
}
